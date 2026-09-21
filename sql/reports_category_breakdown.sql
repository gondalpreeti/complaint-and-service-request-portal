-- ==============================================================================
-- Reports & Analytics: Category Breakdown Query
-- ==============================================================================
-- Description:
--   Returns complaint counts grouped by category, including total, resolved,
--   and pending status breakdown per category.
--
-- Tables:
--   - categories (cat)
--   - complaints (c)
--   - service_request (sr)
-- ==============================================================================

SELECT 
    cat.category_id, 
    cat.category_name,
    COUNT(DISTINCT c.complaint_id) AS total_count,
    COUNT(DISTINCT c.complaint_id) FILTER (WHERE LOWER(sr.status::text) IN ('resolved', 'closed')) AS resolved_count,
    COUNT(DISTINCT c.complaint_id) FILTER (WHERE LOWER(COALESCE(sr.status::text, 'pending')) IN ('pending', 'assigned', 'in progress')) AS pending_count
FROM categories cat
LEFT JOIN complaints c ON c.category_id = cat.category_id
LEFT JOIN service_request sr ON sr.complaint_id = c.complaint_id
WHERE 
    (:date_from IS NULL OR c.created_at::date >= :date_from)
    AND (:date_to IS NULL OR c.created_at::date <= :date_to)
    AND (:status IS NULL OR LOWER(sr.status::text) = LOWER(:status))
    AND (:category_id IS NULL OR c.category_id = :category_id)
    AND (:priority IS NULL OR LOWER(sr.priority_status::text) = LOWER(:priority))
    AND (:search IS NULL OR (c.subject ILIKE '%' || :search || '%' OR c.description ILIKE '%' || :search || '%'))
GROUP BY cat.category_id, cat.category_name
ORDER BY total_count DESC;
