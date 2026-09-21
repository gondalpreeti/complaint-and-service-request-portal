"""
Dashboard API routes.

Design choice: ONE summary endpoint returns every KPI + chart dataset in a
single response (queries run concurrently server-side via asyncio.gather),
rather than one endpoint per chart. This matches the SRS performance NFR
("dashboard should load analytics within 5 seconds") and avoids the frontend
firing 5-6 separate round trips on every filter change.
"""
import asyncio

import asyncpg
from fastapi import APIRouter, Depends, HTTPException, Query, status as http_status

from app.core.database import get_db
from app.core.security import CurrentUser, require_roles
from app.schemas.dashboard import CategoryOption, DashboardFilters, DashboardSummary
from app.services import dashboard_queries

router = APIRouter(prefix="/api/dashboard", tags=["dashboard"])

# Dashboard analytics are restricted to Admin and Manager per the stakeholder
# table (Manager expects "reports/analytics"; Admin expects "dashboard").
_DASHBOARD_ROLES = ("admin", "manager")


@router.get("/summary", response_model=DashboardSummary)
async def get_dashboard_summary(
    date_from: str | None = Query(None, description="YYYY-MM-DD"),
    date_to: str | None = Query(None, description="YYYY-MM-DD"),
    status_filter: str | None = Query(None, alias="status"),
    category_id: int | None = Query(None),
    priority: str | None = Query(None),
    conn: asyncpg.Connection = Depends(get_db),
    _current_user: CurrentUser = Depends(require_roles(*_DASHBOARD_ROLES)),
):
    try:
        filters = DashboardFilters(
            date_from=date_from,
            date_to=date_to,
            status=status_filter,
            category_id=category_id,
            priority=priority,
        )
    except ValueError:
        raise HTTPException(
            status_code=http_status.HTTP_400_BAD_REQUEST,
            detail="Invalid filter value - check date_from/date_to format (YYYY-MM-DD)",
        )

    try:
        kpis, status_dist, category_dist, priority_dist, over_time, escalation_stats = await asyncio.gather(
            dashboard_queries.get_kpi_summary(conn, filters),
            dashboard_queries.get_status_distribution(conn, filters),
            dashboard_queries.get_category_distribution(conn, filters),
            dashboard_queries.get_priority_distribution(conn, filters),
            dashboard_queries.get_complaints_over_time(conn, filters),
            dashboard_queries.get_escalation_stats(conn, filters),
        )
    except asyncpg.PostgresError:
        raise HTTPException(
            status_code=http_status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Could not load dashboard data - database error",
        )

    return DashboardSummary(
        kpis=kpis,
        status_distribution=status_dist,
        category_distribution=category_dist,
        priority_distribution=priority_dist,
        complaints_over_time=over_time,
        escalation_stats=escalation_stats,
    )


@router.get("/categories", response_model=list[CategoryOption])
async def get_category_options(
    conn: asyncpg.Connection = Depends(get_db),
    _current_user: CurrentUser = Depends(require_roles(*_DASHBOARD_ROLES)),
):
    """Populates the category filter dropdown."""
    try:
        return await dashboard_queries.get_category_options(conn)
    except asyncpg.PostgresError:
        raise HTTPException(
            status_code=http_status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Could not load categories - database error",
        )
