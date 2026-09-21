from datetime import date
from typing import Any, Optional
from pydantic import BaseModel


class ReportFilters(BaseModel):
    date_from: Optional[date] = None
    date_to: Optional[date] = None
    status: Optional[str] = None
    category_id: Optional[int] = None
    priority: Optional[str] = None
    search: Optional[str] = None
    page: int = 1
    page_size: int = 10


class ReportKPISummary(BaseModel):
    total_complaints: int
    pending: int
    assigned: int
    in_progress: int
    resolved: int
    closed: int
    escalated: int
    resolution_rate_percent: float
    avg_resolution_time_hours: Optional[float]
    sla_compliance_percent: float


class CategoryReportItem(BaseModel):
    category_id: int
    category_name: str
    total_count: int
    resolved_count: int
    pending_count: int


class ComplaintTableRow(BaseModel):
    complaint_id: str
    subject: str
    category_name: str
    status: str
    priority: str
    created_at: str
    resolution_time_hours: Optional[float] = None


class PaginatedComplaintTable(BaseModel):
    total: int
    page: int
    page_size: int
    total_pages: int
    items: list[ComplaintTableRow]


class ReportSummaryResponse(BaseModel):
    kpis: ReportKPISummary
    status_distribution: list[dict[str, Any]]
    category_distribution: list[CategoryReportItem]
    priority_distribution: list[dict[str, Any]]
    complaints_over_time: list[dict[str, Any]]
