"""Dashboard SQL queries for the current Supabase schema.

Current schema used by this module:
  complaints(complaint_id, category_id, subject, description, image_url,
             created_at, user_id, ...)
  service_request(request_id, complaint_id, priority_status, status,
                  created_at, updated_at, category_id)
  categories(category_id, category_name, ...)
  assignment(assignment_id, request_id, staff_id, assigned_by,
             assignment_status, assigned_date, due_date, remarks)

Important:
- Status and priority live in service_request, not complaints.
- The Supabase schema shown does not contain an escalation table or
  resolved_at column, so escalation metrics are returned as zero and
  average resolution time is returned as None until those fields exist.
"""
import asyncio
import asyncpg

from app.schemas.dashboard import DashboardFilters

# The current router passes one pooled connection to asyncio.gather().
# asyncpg does not allow concurrent operations on one connection, so serialize
# the individual dashboard queries. This is safe with the existing router.
_DB_OPERATION_LOCK = asyncio.Lock()


def _build_conditions(filters: DashboardFilters, start_param: int = 1) -> tuple[list[str], list]:
    """Build filters against the actual complaints/service_request schema."""
    conditions: list[str] = []
    params: list = []
    idx = start_param

    # Complaint date is the dashboard's complaint creation date.
    if filters.date_from is not None:
        conditions.append(f"c.created_at::date >= ${idx}")
        params.append(filters.date_from)
        idx += 1
    if filters.date_to is not None:
        conditions.append(f"c.created_at::date <= ${idx}")
        params.append(filters.date_to)
        idx += 1

    # Status and priority are stored in service_request.
    if filters.status is not None:
        conditions.append(f"LOWER(sr.status::text) = LOWER(${idx}::text)")
        params.append(filters.status)
        idx += 1
    if filters.category_id is not None:
        conditions.append(f"c.category_id = ${idx}")
        params.append(filters.category_id)
        idx += 1
    if filters.priority is not None:
        conditions.append(f"LOWER(sr.priority_status::text) = LOWER(${idx}::text)")
        params.append(filters.priority)
        idx += 1

    return conditions, params


async def get_kpi_summary(conn: asyncpg.Connection, filters: DashboardFilters) -> dict:
    conditions, params = _build_conditions(filters)
    where_sql = f"WHERE {' AND '.join(conditions)}" if conditions else ""

    query = f"""
        SELECT
            COUNT(DISTINCT c.complaint_id) AS total_complaints,
            COUNT(DISTINCT c.complaint_id) FILTER (WHERE LOWER(sr.status::text) = 'pending') AS pending,
            COUNT(DISTINCT c.complaint_id) FILTER (WHERE LOWER(sr.status::text) = 'assigned') AS assigned,
            COUNT(DISTINCT c.complaint_id) FILTER (WHERE LOWER(sr.status::text) = 'in progress') AS in_progress,
            COUNT(DISTINCT c.complaint_id) FILTER (WHERE LOWER(sr.status::text) = 'resolved') AS resolved,
            COUNT(DISTINCT c.complaint_id) FILTER (WHERE LOWER(sr.status::text) = 'closed') AS closed
        FROM complaints c
        LEFT JOIN service_request sr ON sr.complaint_id = c.complaint_id
        {where_sql}
    """

    async with _DB_OPERATION_LOCK:
        row = await conn.fetchrow(query, *params)

    total = row["total_complaints"] or 0
    resolved_or_closed = (row["resolved"] or 0) + (row["closed"] or 0)
    resolution_rate = round((resolved_or_closed / total) * 100, 1) if total > 0 else 0.0

    # There is no escalation table in the supplied Supabase schema.
    escalated = 0

    return {
        "total_complaints": total,
        "pending": row["pending"] or 0,
        "assigned": row["assigned"] or 0,
        "in_progress": row["in_progress"] or 0,
        "resolved": row["resolved"] or 0,
        "closed": row["closed"] or 0,
        "escalated": escalated,
        "resolution_rate_percent": resolution_rate,
        # No resolved_at field exists in the supplied schema.
        "avg_resolution_time_hours": None,
    }


async def get_status_distribution(conn: asyncpg.Connection, filters: DashboardFilters) -> list[dict]:
    conditions, params = _build_conditions(filters)
    where_sql = f"WHERE {' AND '.join(conditions)}" if conditions else ""
    query = f"""
        SELECT LOWER(sr.status::text) AS status, COUNT(DISTINCT c.complaint_id) AS count
        FROM complaints c
        LEFT JOIN service_request sr ON sr.complaint_id = c.complaint_id
        {where_sql}
        {"AND" if where_sql else "WHERE"} sr.status IS NOT NULL
        GROUP BY LOWER(sr.status::text)
        ORDER BY count DESC
    """
    async with _DB_OPERATION_LOCK:
        rows = await conn.fetch(query, *params)
    return [{"status": r["status"], "count": r["count"]} for r in rows]


async def get_category_distribution(conn: asyncpg.Connection, filters: DashboardFilters) -> list[dict]:
    conditions, params = _build_conditions(filters)
    extra_join_sql = (" AND " + " AND ".join(conditions)) if conditions else ""

    query = f"""
        SELECT cat.category_id, cat.category_name,
               COUNT(DISTINCT c.complaint_id) AS count
        FROM categories cat
        LEFT JOIN complaints c
            ON c.category_id = cat.category_id
        LEFT JOIN service_request sr
            ON sr.complaint_id = c.complaint_id
            {extra_join_sql}
        GROUP BY cat.category_id, cat.category_name
        ORDER BY count DESC, cat.category_name
    """
    async with _DB_OPERATION_LOCK:
        rows = await conn.fetch(query, *params)
    return [
        {"category_id": r["category_id"], "category_name": r["category_name"], "count": r["count"]}
        for r in rows
    ]


async def get_priority_distribution(conn: asyncpg.Connection, filters: DashboardFilters) -> list[dict]:
    conditions, params = _build_conditions(filters)
    where_sql = f"WHERE {' AND '.join(conditions)}" if conditions else ""
    query = f"""
        SELECT LOWER(sr.priority_status::text) AS priority,
               COUNT(DISTINCT c.complaint_id) AS count
        FROM complaints c
        LEFT JOIN service_request sr ON sr.complaint_id = c.complaint_id
        {where_sql}
        {"AND" if where_sql else "WHERE"} sr.priority_status IS NOT NULL
        GROUP BY LOWER(sr.priority_status::text)
        ORDER BY
            CASE LOWER(sr.priority_status::text)
                WHEN 'critical' THEN 1
                WHEN 'high' THEN 2
                WHEN 'medium' THEN 3
                WHEN 'low' THEN 4
                ELSE 5
            END
    """
    async with _DB_OPERATION_LOCK:
        rows = await conn.fetch(query, *params)
    return [{"priority": r["priority"], "count": r["count"]} for r in rows]


async def get_complaints_over_time(conn: asyncpg.Connection, filters: DashboardFilters) -> list[dict]:
    conditions, params = _build_conditions(filters)
    where_sql = f"WHERE {' AND '.join(conditions)}" if conditions else ""
    query = f"""
        SELECT c.created_at::date AS day,
               COUNT(DISTINCT c.complaint_id) AS count
        FROM complaints c
        LEFT JOIN service_request sr ON sr.complaint_id = c.complaint_id
        {where_sql}
        GROUP BY c.created_at::date
        ORDER BY day
    """
    async with _DB_OPERATION_LOCK:
        rows = await conn.fetch(query, *params)
    return [{"day": r["day"], "count": r["count"]} for r in rows]


async def get_escalation_stats(conn: asyncpg.Connection, filters: DashboardFilters) -> dict:
    """Escalation table is not present in the supplied Supabase schema."""
    return {
        "total_escalations": 0,
        "open_escalations": 0,
        "resolved_escalations": 0,
    }


async def get_category_options(conn: asyncpg.Connection) -> list[dict]:
    """Lightweight lookup list for the category filter dropdown."""
    query = """
        SELECT category_id, category_name
        FROM categories
        ORDER BY category_name
    """
    async with _DB_OPERATION_LOCK:
        rows = await conn.fetch(query)
    return [
        {"category_id": r["category_id"], "category_name": r["category_name"]}
        for r in rows
    ]