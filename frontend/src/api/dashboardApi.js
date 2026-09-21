import { apiClient } from "./apiClient";

// filters: { dateFrom, dateTo, status, categoryId, priority } - all optional
export async function fetchDashboardSummary(filters = {}) {
  const params = {};
  if (filters.dateFrom) params.date_from = filters.dateFrom;
  if (filters.dateTo) params.date_to = filters.dateTo;
  if (filters.status) params.status = filters.status;
  if (filters.categoryId) params.category_id = filters.categoryId;
  if (filters.priority) params.priority = filters.priority;

  const response = await apiClient.get("/api/dashboard/summary", { params });
  return response.data;
}

export async function fetchCategoryOptions() {
  const response = await apiClient.get("/api/dashboard/categories");
  return response.data;
}
