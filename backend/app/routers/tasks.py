"""Task creation/assignment (manager) and the employee status workflow."""
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import delete, select
from sqlalchemy.orm import Session, selectinload

from ..database import get_db
from ..integrations import push_to_google_tasks
from ..models import Notification, Task, TaskAssignment, User
from ..schemas import AssignmentOut, EmployeeOut, ReportIn, TaskCreateIn, TaskOut
from ..security import get_current_user, require_employee, require_manager

router = APIRouter(prefix="/tasks", tags=["tasks"])

# Allowed forward transitions for the employee workflow.
_NEXT = {"Assigned": "Accepted", "Accepted": "In Progress", "In Progress": "Finished"}


def _now():
    return datetime.now(timezone.utc)


def _my_assignment(task_id: int, user: User, db: Session) -> TaskAssignment:
    a = db.scalar(
        select(TaskAssignment).where(
            TaskAssignment.task_id == task_id,
            TaskAssignment.employee_id == user.user_id,
        )
    )
    if a is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "You have no assignment on this task")
    return a


def _advance(a: TaskAssignment, expected: str, ts_field: str):
    if a.status != expected:
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST,
            f"Cannot do this from status '{a.status}'; expected '{expected}'",
        )
    a.status = _NEXT[expected]
    setattr(a, ts_field, _now())


# ---- Manager: create + assign ----
@router.post("", response_model=TaskOut)
def create_task(body: TaskCreateIn, mgr: User = Depends(require_manager), db: Session = Depends(get_db)):
    ids = list(dict.fromkeys(body.assignee_ids))  # de-dupe, keep order
    if not ids:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "At least one assignee is required")
    employees = db.scalars(
        select(User).where(User.user_id.in_(ids), User.role == "Employee")
    ).all()
    if len(employees) != len(ids):
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "One or more assignees are not valid employees")

    if body.priority not in ("High", "Medium", "Low"):
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "priority must be High, Medium, or Low")
    task = Task(
        title=body.title,
        description=body.description,
        priority=body.priority,
        deadline=body.deadline,
        created_by=mgr.user_id,
    )
    db.add(task)
    db.flush()  # assigns task.task_id

    for emp in employees:
        db.add(TaskAssignment(task_id=task.task_id, employee_id=emp.user_id, status="Assigned"))
        db.add(Notification(user_id=emp.user_id, task_id=task.task_id, message=f"New task assigned: {task.title}"))

    db.commit()
    db.refresh(task)
    push_to_google_tasks(
        task.title, task.description, task.deadline, [e.full_name for e in employees]
    )
    return task


# ---- Listing ----
@router.get("", response_model=list[TaskOut])
def list_tasks(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if user.role == "Manager":
        return db.scalars(select(Task).options(selectinload(Task.assignments)).order_by(Task.task_id.desc())).all()

    # Employee: only their tasks, and only their own assignment is exposed.
    tasks = db.scalars(
        select(Task)
        .join(TaskAssignment)
        .where(TaskAssignment.employee_id == user.user_id)
        .options(selectinload(Task.assignments))
        .order_by(Task.task_id.desc())
    ).all()
    out = []
    for t in tasks:
        mine = [AssignmentOut.model_validate(a) for a in t.assignments if a.employee_id == user.user_id]
        out.append(
            TaskOut(
                task_id=t.task_id,
                title=t.title,
                description=t.description,
                priority=t.priority,
                deadline=t.deadline,
                created_by=t.created_by,
                assignments=mine,
            )
        )
    return out


@router.get("/employees", response_model=list[EmployeeOut])
def list_employees(mgr: User = Depends(require_manager), db: Session = Depends(get_db)):
    """Manager helper: who can I assign tasks to?"""
    return db.scalars(select(User).where(User.role == "Employee").order_by(User.full_name)).all()


@router.delete("/employees/{employee_id}")
def delete_employee(
    employee_id: int, mgr: User = Depends(require_manager), db: Session = Depends(get_db)
):
    emp = db.get(User, employee_id)
    if emp is None or emp.role != "Employee":
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Employee not found")

    db.execute(delete(Notification).where(Notification.user_id == employee_id))
    db.execute(delete(TaskAssignment).where(TaskAssignment.employee_id == employee_id))

    orphan_ids = db.scalars(
        select(Task.task_id).where(~Task.assignments.any())
    ).all()
    if orphan_ids:
        db.execute(delete(Notification).where(Notification.task_id.in_(orphan_ids)))
        db.execute(delete(Task).where(Task.task_id.in_(orphan_ids)))

    db.delete(emp)
    db.commit()
    return {"deleted": employee_id, "removed_tasks": orphan_ids}


@router.get("/{task_id}", response_model=TaskOut)
def get_task(task_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    task = db.scalar(select(Task).where(Task.task_id == task_id).options(selectinload(Task.assignments)))
    if task is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Task not found")
    if user.role == "Manager":
        return task
    mine = [AssignmentOut.model_validate(a) for a in task.assignments if a.employee_id == user.user_id]
    if not mine:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Not your task")
    return TaskOut(
        task_id=task.task_id,
        title=task.title,
        description=task.description,
        priority=task.priority,
        deadline=task.deadline,
        created_by=task.created_by,
        assignments=mine,
    )


# ---- Employee workflow ----
@router.put("/{task_id}/accept", response_model=AssignmentOut)
def accept(task_id: int, emp: User = Depends(require_employee), db: Session = Depends(get_db)):
    a = _my_assignment(task_id, emp, db)
    _advance(a, "Assigned", "accepted_at")
    db.commit()
    db.refresh(a)
    return a


@router.put("/{task_id}/progress", response_model=AssignmentOut)
def progress(task_id: int, emp: User = Depends(require_employee), db: Session = Depends(get_db)):
    a = _my_assignment(task_id, emp, db)
    _advance(a, "Accepted", "started_at")
    db.commit()
    db.refresh(a)
    return a


@router.put("/{task_id}/finish", response_model=AssignmentOut)
def finish(task_id: int, emp: User = Depends(require_employee), db: Session = Depends(get_db)):
    a = _my_assignment(task_id, emp, db)
    _advance(a, "In Progress", "finished_at")
    db.commit()
    db.refresh(a)
    return a


@router.post("/{task_id}/report", response_model=AssignmentOut)
def submit_report(task_id: int, body: ReportIn, emp: User = Depends(require_employee), db: Session = Depends(get_db)):
    a = _my_assignment(task_id, emp, db)
    if a.status != "Finished":
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "You can only submit a report after the task is Finished")
    a.report = body.report
    a.report_sent_at = _now()
    db.commit()
    db.refresh(a)
    return a
