import { useCallback, useEffect, useState } from "react";
import { fetchDashboardSummary } from "../api/dashboardApi";

export function useDashboardData(filters) {
  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const summary = await fetchDashboardSummary(filters);
      setData(summary);
    } catch (err) {
      const message =
        err.response?.status === 401
          ? "Your session has expired. Please log in again."
          : err.response?.status === 403
          ? "You don't have permission to view this dashboard."
          : "Couldn't load dashboard data. Please try again.";
      setError(message);
    } finally {
      setIsLoading(false);
    }
    // Re-run whenever any filter value changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.dateFrom, filters.dateTo, filters.status, filters.categoryId, filters.priority]);

  useEffect(() => {
    load();
  }, [load]);

  const isEmpty = !isLoading && !error && data && data.kpis.total_complaints === 0;

  return { data, isLoading, error, isEmpty, refetch: load };
}
