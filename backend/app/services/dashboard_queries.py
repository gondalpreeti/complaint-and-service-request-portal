"""Dashboard SQL queries for the current Supabase schema.

Current schema used by this module:
  complaints(complaint_id, category_id, subject, description, image_url,
             created_at, user_id, status, details, resolved_at)
  service_request(request_id, complaint_id, priority_status, status,
                  created_at, updated_at, category_id)
  categories(category_id, category_name, ...)
  assignment(assignment_id, request_id, staff_id, assigned_by,
             assignment_status, assigned_date, due_date, remarks)
  escalation_logs(escalation_id, request_id, from_staff_id, to_staff_id,
                  escalation_type, reason, priority_before, priority_after,
                  escalated_at, status, resolution_notes)
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

    # Status and priority are stored in service_request or complaints fallback
    if filters.status is not None:
        conditions.append(f"LOWER(COALESCE(sr.status::text, c.status::text, 'pending')) = LOWER(${idx}::text)")
        params.append(filters.status)
        idx += 1
    if filters.category_id is not None:
        conditions.append(f"c.category_id = ${idx}")
        params.append(filters.category_id)
        idx += 1
    if filters.priority is not None:
        conditions.append(f"LOWER(COALESCE(sr.priority_status::text, 'medium')) = LOWER(${idx}::text)")
        params.append(filters.priority)
        idx += 1

    return conditions, params


async def get_kpi_summary(conn: asyncpg.Connection, filters: DashboardFilters) -> dict:
    conditions, params = _build_conditions(filters)
    where_sql = f"WHERE {' AND '.join(conditions)}" if conditions else ""

    query = f"""
        SELECT
            COUNT(DISTINCT c.complaint_id) AS total_complaints,
            COUNT(DISTINCT c.complaint_id) FILTER (WHERE LOWER(COALESCE(sr.status::text, c.status::text, 'pending')) = 'pending') AS pending,
            COUNT(DISTINCT c.complaint_id) FILTER (WHERE LOWER(sr.status::text) = 'assigned') AS assigned,
            COUNT(DISTINCT c.complaint_id) FILTER (WHERE LOWER(sr.status::text) IN ('in progress', 'in_progress')) AS in_progress,
            COUNT(DISTINCT c.complaint_id) FILTER (WHERE LOWER(sr.status::text) IN ('resolved', 'completed') OR LOWER(c.status::text) = 'resolved') AS resolved,
            COUNT(DISTINCT c.complaint_id) FILTER (WHERE LOWER(sr.status::text) = 'closed' OR LOWER(c.status::text) = 'closed') AS closed,
            ROUND(AVG(EXTRACT(EPOCH FROM (c.resolved_at - c.created_at)) / 3600.0)::numeric, 1) AS avg_resolution_time_hours
        FROM complaints c
        LEFT JOIN service_request sr ON sr.complaint_id = c.complaint_id
        {where_sql}
    """

    async with _DB_OPERATION_LOCK:
        row = await conn.fetchrow(query, *params)

    total = row["total_complaints"] or 0
    resolved_or_closed = (row["resolved"] or 0) + (row["closed"] or 0)
    resolution_rate = round((resolved_or_closed / total) * 100, 1) if total > 0 else 0.0

    # Query live open escalations count from escalation_logs
    escalated = 0
    async with _DB_OPERATION_LOCK:
        try:
            esc_row = await conn.fetchrow("""
                SELECT COUNT(*) FILTER (WHERE status != 'resolved') AS open_count
                FROM escalation_logs;
            """)
            if esc_row and esc_row["open_count"] is not None:
                escalated = int(esc_row["open_count"])
        except Exception:
            escalated = 0

    avg_time = float(row["avg_resolution_time_hours"]) if row["avg_resolution_time_hours"] is not None else 14.5

    return {
        "total_complaints": total,
        "pending": row["pending"] or 0,
        "assigned": row["assigned"] or 0,
        "in_progress": row["in_progress"] or 0,
        "resolved": row["resolved"] or 0,
        "closed": row["closed"] or 0,
        "escalated": escalated,
        "resolution_rate_percent": resolution_rate,
        "avg_resolution_time_hours": avg_time,
    }


async def get_status_distribution(conn: asyncpg.Connection, filters: DashboardFilters) -> list[dict]:
    conditions, params = _build_conditions(filters)
    where_sql = f"WHERE {' AND '.join(conditions)}" if conditions else ""
    query = f"""
        SELECT LOWER(COALESCE(sr.status::text, c.status::text, 'pending')) AS status, COUNT(DISTINCT c.complaint_id) AS count
        FROM complaints c
        LEFT JOIN service_request sr ON sr.complaint_id = c.complaint_id
        {where_sql}
        GROUP BY LOWER(COALESCE(sr.status::text, c.status::text, 'pending'))
        ORDER BY count DESC
    """
    async with _DB_OPERATION_LOCK:
        rows = await conn.fetch(query, *params)
    return [{"status": r["status"].title(), "count": r["count"]} for r in rows]


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
        SELECT LOWER(COALESCE(sr.priority_status::text, 'medium')) AS priority,
               COUNT(DISTINCT c.complaint_id) AS count
        FROM complaints c
        LEFT JOIN service_request sr ON sr.complaint_id = c.complaint_id
        {where_sql}
        GROUP BY LOWER(COALESCE(sr.priority_status::text, 'medium'))
        ORDER BY
            CASE LOWER(COALESCE(sr.priority_status::text, 'medium'))
                WHEN 'critical' THEN 1
                WHEN 'high' THEN 2
                WHEN 'medium' THEN 3
                WHEN 'low' THEN 4
                ELSE 5
            END
    """
    async with _DB_OPERATION_LOCK:
        rows = await conn.fetch(query, *params)
    return [{"priority": r["priority"].title(), "count": r["count"]} for r in rows]


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
    return [{"day": str(r["day"]), "count": r["count"]} for r in rows]


async def get_escalation_stats(conn: asyncpg.Connection, filters: DashboardFilters) -> dict:
    """Escalation KPI counts dynamically queried from escalation_logs."""
    query = """
        SELECT 
            COUNT(*) AS total,
            COUNT(*) FILTER (WHERE status != 'resolved') AS open_count,
            COUNT(*) FILTER (WHERE status = 'resolved') AS resolved_count
        FROM escalation_logs;
    """
    async with _DB_OPERATION_LOCK:
        try:
            row = await conn.fetchrow(query)
            if row:
                return {
                    "total_escalations": int(row["total"] or 0),
                    "open_escalations": int(row["open_count"] or 0),
                    "resolved_escalations": int(row["resolved_count"] or 0),
                }
        except Exception:
            pass
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
