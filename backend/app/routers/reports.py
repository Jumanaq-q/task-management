"""Manager view of submitted reports + the stats dashboard."""
from datetime import date, datetime, timedelta, timezone

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from ..database import get_db
from ..models import Task, TaskAssignment, User
from ..schemas import DayCount, ReportOut, StatsOut, WorkloadItem
from ..security import require_manager

router = APIRouter(tags=["reports"])


@router.get("/reports", response_model=list[ReportOut])
def list_reports(mgr: User = Depends(require_manager), db: Session = Depends(get_db)):
    return db.scalars(
        select(TaskAssignment)
        .where(TaskAssignment.report.is_not(None))
        .order_by(TaskAssignment.report_sent_at.desc())
    ).all()


@router.get("/stats", response_model=StatsOut)
def stats(mgr: User = Depends(require_manager), db: Session = Depends(get_db)):
    """Aggregates for the manager dashboard. 'Done' = report submitted."""
    assignments = db.scalars(
        select(TaskAssignment).options(selectinload(TaskAssignment.task))
    ).all()
    employees = db.scalars(select(User).where(User.role == "Employee")).all()

    today = date.today()
    week_ago = datetime.now(timezone.utc) - timedelta(days=7)
    monday = today - timedelta(days=today.weekday())  # start of current week

    total = len(assignments)
    done = sum(1 for a in assignments if a.report is not None)
    completion_rate = round(done * 100 / total) if total else 0

    tasks_this_week = len(
        {
            a.task_id
            for a in assignments
            if a.task.created_at and a.task.created_at >= week_ago
        }
    )

    overdue = sum(
        1
        for a in assignments
        if a.report is None and a.task.deadline is not None and a.task.deadline < today
    )

    days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
    per_day = {d: 0 for d in days}
    for a in assignments:
        if a.report_sent_at is not None:
            d = a.report_sent_at.date()
            if monday <= d <= monday + timedelta(days=6):
                per_day[days[d.weekday()]] += 1

    workload = []
    for emp in employees:
        mine = [a for a in assignments if a.employee_id == emp.user_id]
        workload.append(
            WorkloadItem(
                employee_id=emp.user_id,
                full_name=emp.full_name,
                done=sum(1 for a in mine if a.report is not None),
                total=len(mine),
            )
        )

    return StatsOut(
        completion_rate=completion_rate,
        tasks_this_week=tasks_this_week,
        overdue=overdue,
        active_members=len(employees),
        completed_per_day=[DayCount(day=d, count=per_day[d]) for d in days],
        workload=workload,
    )
