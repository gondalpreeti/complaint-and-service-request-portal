-- ==============================================================================
-- Reports & Analytics: Paginated Complaint Ledger & Search Query
-- ==============================================================================
-- Description:
--   Fetches complaint ledger records with category, priority, and status
--   supporting pagination and multi-field filtering.
--
-- Tables:
--   - complaints (c)
--   - service_request (sr)
--   - categories (cat)
-- ==============================================================================

-- 1. Total Count Query (for pagination calculation)
SELECT COUNT(DISTINCT c.complaint_id)
FROM complaints c
LEFT JOIN service_request sr ON sr.complaint_id = c.complaint_id
LEFT JOIN categories cat ON cat.category_id = c.category_id
WHERE 
    (:date_from IS NULL OR c.created_at::date >= :date_from)
    AND (:date_to IS NULL OR c.created_at::date <= :date_to)
    AND (:status IS NULL OR LOWER(sr.status::text) = LOWER(:status))
    AND (:category_id IS NULL OR c.category_id = :category_id)
    AND (:priority IS NULL OR LOWER(sr.priority_status::text) = LOWER(:priority))
    AND (:search IS NULL OR (c.subject ILIKE '%' || :search || '%' OR c.description ILIKE '%' || :search || '%'));

-- 2. Data Rows Query
SELECT 
    c.complaint_id::text AS complaint_id,
    c.subject,
    COALESCE(cat.category_name, 'General') AS category_name,
    COALESCE(sr.status::text, 'Pending') AS status,
    COALESCE(sr.priority_status::text, 'Medium') AS priority,
    c.created_at::text AS created_at
FROM complaints c
LEFT JOIN service_request sr ON sr.complaint_id = c.complaint_id
LEFT JOIN categories cat ON cat.category_id = c.category_id
WHERE 
    (:date_from IS NULL OR c.created_at::date >= :date_from)
    AND (:date_to IS NULL OR c.created_at::date <= :date_to)
    AND (:status IS NULL OR LOWER(sr.status::text) = LOWER(:status))
    AND (:category_id IS NULL OR c.category_id = :category_id)
    AND (:priority IS NULL OR LOWER(sr.priority_status::text) = LOWER(:priority))
    AND (:search IS NULL OR (c.subject ILIKE '%' || :search || '%' OR c.description ILIKE '%' || :search || '%'))
ORDER BY c.created_at DESC
LIMIT :limit OFFSET :offset;
