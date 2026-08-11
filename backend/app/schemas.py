"""Pydantic request/response models."""
from datetime import date, datetime

from pydantic import BaseModel, ConfigDict, EmailStr


# ---- Auth ----
class SignupIn(BaseModel):
    full_name: str
    email: EmailStr
    password: str


class LoginIn(BaseModel):
    email: EmailStr
    password: str


class TokenOut(BaseModel):
    access_token: str
    token_type: str = "bearer"
    role: str
    full_name: str
    user_id: int


# ---- Tasks ----
class TaskCreateIn(BaseModel):
    title: str
    description: str = ""
    priority: str = "Medium"  # High | Medium | Low
    deadline: date | None = None
    assignee_ids: list[int]


class AssignmentOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    assignment_id: int
    employee_id: int
    status: str
    report: str | None = None


class TaskOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    task_id: int
    title: str
    description: str
    priority: str = "Medium"
    deadline: date | None
    created_by: int
    assignments: list[AssignmentOut] = []


# ---- Manager stats dashboard ----
class WorkloadItem(BaseModel):
    employee_id: int
    full_name: str
    done: int
    total: int


class DayCount(BaseModel):
    day: str  # Mon..Sun
    count: int


class StatsOut(BaseModel):
    completion_rate: int  # percent of assignments with a submitted report
    tasks_this_week: int
    overdue: int
    active_members: int
    completed_per_day: list[DayCount]
    workload: list[WorkloadItem]


# ---- Reports ----
class ReportIn(BaseModel):
    report: str


class ReportOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    assignment_id: int
    task_id: int
    employee_id: int
    report: str | None
    report_sent_at: datetime | None


# ---- Notifications ----
class NotificationOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    notification_id: int
    task_id: int
    message: str
    is_read: bool
    created_at: datetime


# ---- Users (small helper for the frontend assignee picker) ----
class EmployeeOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    user_id: int
    full_name: str
    email: EmailStr
