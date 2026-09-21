"""Reports and analytics router for Admin and Manager roles."""
import asyncio
import csv
import io
from datetime import date
from typing import Optional

import asyncpg
from fastapi import APIRouter, Depends, HTTPException, Query, Response, status as http_status

from app.core.database import get_db
from app.core.security import CurrentUser, require_roles
from app.schemas.dashboard import DashboardFilters
from app.schemas.reports import (
    PaginatedComplaintTable,
    ReportFilters,
    ReportSummaryResponse,
)
from app.services import dashboard_queries, report_queries

router = APIRouter(prefix="/api/reports", tags=["reports"])

_REPORT_ROLES = ("admin", "manager")


@router.get("/summary", response_model=ReportSummaryResponse)
async def get_reports_summary(
    date_from: Optional[date] = Query(None),
    date_to: Optional[date] = Query(None),
    status_filter: Optional[str] = Query(None, alias="status"),
    category_id: Optional[int] = Query(None),
    priority: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    conn: asyncpg.Connection = Depends(get_db),
    _current_user: CurrentUser = Depends(require_roles(*_REPORT_ROLES)),
):
    """Aggregate metrics and distribution for Reports & Analytics."""
    filters = ReportFilters(
        date_from=date_from,
        date_to=date_to,
        status=status_filter,
        category_id=category_id,
        priority=priority,
        search=search,
    )
    dash_filters = DashboardFilters(
        date_from=date_from,
        date_to=date_to,
        status=status_filter,
        category_id=category_id,
        priority=priority,
    )

    try:
        kpis = await report_queries.get_report_kpi_summary(conn, filters)
        cat_dist = await report_queries.get_report_category_breakdown(conn, filters)
        status_dist = await dashboard_queries.get_status_distribution(conn, dash_filters)
        prio_dist = await dashboard_queries.get_priority_distribution(conn, dash_filters)
        time_trend = await dashboard_queries.get_complaints_over_time(conn, dash_filters)
    except Exception as e:
        raise HTTPException(
            status_code=http_status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Could not load reports data: {str(e)}",
        )

    formatted_trend = [{"day": str(item.get("day")), "count": item.get("count", 0)} for item in time_trend]

    return ReportSummaryResponse(
        kpis=kpis,
        status_distribution=status_dist,
        category_distribution=cat_dist,
        priority_distribution=prio_dist,
        complaints_over_time=formatted_trend,
    )


@router.get("/table", response_model=PaginatedComplaintTable)
async def get_complaints_table(
    date_from: Optional[date] = Query(None),
    date_to: Optional[date] = Query(None),
    status_filter: Optional[str] = Query(None, alias="status"),
    category_id: Optional[int] = Query(None),
    priority: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=100),
    conn: asyncpg.Connection = Depends(get_db),
    _current_user: CurrentUser = Depends(require_roles(*_REPORT_ROLES)),
):
    """Paginated complaint list for the reports view."""
    filters = ReportFilters(
        date_from=date_from,
        date_to=date_to,
        status=status_filter,
        category_id=category_id,
        priority=priority,
        search=search,
        page=page,
        page_size=page_size,
    )
    return await report_queries.get_complaint_table_rows(conn, filters)


@router.get("/export")
async def export_reports_csv(
    date_from: Optional[date] = Query(None),
    date_to: Optional[date] = Query(None),
    status_filter: Optional[str] = Query(None, alias="status"),
    category_id: Optional[int] = Query(None),
    priority: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    conn: asyncpg.Connection = Depends(get_db),
    _current_user: CurrentUser = Depends(require_roles(*_REPORT_ROLES)),
):
    """Download reports dataset as CSV."""
    filters = ReportFilters(
        date_from=date_from,
        date_to=date_to,
        status=status_filter,
        category_id=category_id,
        priority=priority,
        search=search,
        page=1,
        page_size=1000,
    )
    result = await report_queries.get_complaint_table_rows(conn, filters)

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["Complaint ID", "Subject", "Category", "Status", "Priority", "Created Date"])

    for item in result.items:
        writer.writerow([
            item.complaint_id,
            item.subject,
            item.category_name,
            item.status,
            item.priority,
            item.created_at,
        ])

    return Response(
        content=output.getvalue(),
        media_type="text/csv",
        headers={
            "Content-Disposition": f"attachment; filename=complaints_report_{date.today().isoformat()}.csv"
        },
    )
