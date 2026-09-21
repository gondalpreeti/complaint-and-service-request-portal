from datetime import date
from typing import Optional

from pydantic import BaseModel


class DashboardFilters(BaseModel):
    """Query params accepted by the dashboard summary endpoint. All optional."""
    date_from: Optional[date] = None
    date_to: Optional[date] = None
    status: Optional[str] = None
    category_id: Optional[int] = None
    priority: Optional[str] = None


class KPISummary(BaseModel):
    total_complaints: int
    pending: int
    assigned: int
    in_progress: int
    resolved: int
    closed: int
    escalated: int
    resolution_rate_percent: float
    avg_resolution_time_hours: Optional[float]


class StatusCount(BaseModel):
    status: str
    count: int


class CategoryCount(BaseModel):
    category_id: int
    category_name: str
    count: int


class PriorityCount(BaseModel):
    priority: str
    count: int


class DailyCount(BaseModel):
    day: date
    count: int


class EscalationStats(BaseModel):
    total_escalations: int
    open_escalations: int
    resolved_escalations: int


class DashboardSummary(BaseModel):
    kpis: KPISummary
    status_distribution: list[StatusCount]
    category_distribution: list[CategoryCount]
    priority_distribution: list[PriorityCount]
    complaints_over_time: list[DailyCount]
    escalation_stats: EscalationStats


class CategoryOption(BaseModel):
    category_id: int
    category_name: str
