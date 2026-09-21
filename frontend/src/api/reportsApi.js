import { apiClient } from "./apiClient";

export async function fetchReportsSummary(filters = {}) {
  const params = {};
  if (filters.dateFrom) params.date_from = filters.dateFrom;
  if (filters.dateTo) params.date_to = filters.dateTo;
  if (filters.status) params.status = filters.status;
  if (filters.categoryId) params.category_id = filters.categoryId;
  if (filters.priority) params.priority = filters.priority;
  if (filters.search) params.search = filters.search;

  const response = await apiClient.get("/api/reports/summary", { params });
  return response.data;
}

export async function fetchReportsTable(filters = {}) {
  const params = {
    page: filters.page || 1,
    page_size: filters.pageSize || 10,
  };
  if (filters.dateFrom) params.date_from = filters.dateFrom;
  if (filters.dateTo) params.date_to = filters.dateTo;
  if (filters.status) params.status = filters.status;
  if (filters.categoryId) params.category_id = filters.categoryId;
  if (filters.priority) params.priority = filters.priority;
  if (filters.search) params.search = filters.search;

  const response = await apiClient.get("/api/reports/table", { params });
  return response.data;
}

export function getExportReportsCsvUrl(filters = {}) {
  const baseUrl = import.meta.env.VITE_API_URL || "http://localhost:8000";
  const params = new URLSearchParams();
  if (filters.dateFrom) params.append("date_from", filters.dateFrom);
  if (filters.dateTo) params.append("date_to", filters.dateTo);
  if (filters.status) params.append("status", filters.status);
  if (filters.categoryId) params.append("category_id", filters.categoryId);
  if (filters.priority) params.append("priority", filters.priority);
  if (filters.search) params.append("search", filters.search);
  return `${baseUrl}/api/reports/export?${params.toString()}`;
}
