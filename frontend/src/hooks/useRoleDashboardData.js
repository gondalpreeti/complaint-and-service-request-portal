import { useCallback, useEffect, useState } from "react";
import { fetchRoleDashboard } from "../api/roleDashboardApi";

export function useRoleDashboardData(roleOverride) {
  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const liveData = await fetchRoleDashboard(roleOverride);
      setData(liveData);
    } catch (err) {
      console.error("[useRoleDashboardData] Live fetch error:", err);
      const status = err.response?.status;
      setError(
        status === 401
          ? "Your session has expired. Please log in again."
          : status === 403
          ? "You don't have permission to view this dashboard."
          : status === 404
          ? err.response?.data?.detail || "No dashboard profile is linked to this account."
          : err.message || "Couldn't load live dashboard data. Please try again."
      );
    } finally {
      setIsLoading(false);
    }
  }, [roleOverride]);

  useEffect(() => {
    load();
  }, [load]);

  return { data, isLoading, error, refetch: load, demoMode: false };
}
