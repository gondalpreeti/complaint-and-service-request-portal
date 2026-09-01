-- ==============================================================================
-- Reports & Analytics: KPI Summary Query
-- ==============================================================================
-- Description:
--   Aggregates total complaints, counts per status lifecycle stage, resolution
--   rates, and compliance metrics. Supports optional filtering by date range,
--   status, category_id, priority, and search keyword.
--
-- Tables:
--   - complaints (c)
--   - service_request (sr)
-- ==============================================================================

SELECT
    COUNT(DISTINCT c.complaint_id) AS total_complaints,
    COUNT(DISTINCT c.complaint_id) FILTER (WHERE LOWER(COALESCE(sr.status::text, 'pending')) = 'pending') AS pending,
    COUNT(DISTINCT c.complaint_id) FILTER (WHERE LOWER(sr.status::text) = 'assigned') AS assigned,
    COUNT(DISTINCT c.complaint_id) FILTER (WHERE LOWER(sr.status::text) = 'in progress') AS in_progress,
    COUNT(DISTINCT c.complaint_id) FILTER (WHERE LOWER(sr.status::text) = 'resolved') AS resolved,
    COUNT(DISTINCT c.complaint_id) FILTER (WHERE LOWER(sr.status::text) = 'closed') AS closed
FROM complaints c
LEFT JOIN service_request sr ON sr.complaint_id = c.complaint_id
WHERE
    (:date_from IS NULL OR c.created_at::date >= :date_from)
    AND (:date_to IS NULL OR c.created_at::date <= :date_to)
    AND (:status IS NULL OR LOWER(sr.status::text) = LOWER(:status))
    AND (:category_id IS NULL OR c.category_id = :category_id)
    AND (:priority IS NULL OR LOWER(sr.priority_status::text) = LOWER(:priority))
    AND (:search IS NULL OR (c.subject ILIKE '%' || :search || '%' OR c.description ILIKE '%' || :search || '%'));
