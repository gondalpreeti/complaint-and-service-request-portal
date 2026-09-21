import { useState } from "react";
import KPICard from "../components/dashboard/KPICard";
import DashboardFilters from "../components/dashboard/DashboardFilters";
import DashboardCharts from "../components/dashboard/DashboardCharts";
import { useDashboardData } from "../hooks/useDashboardData";

export default function Dashboard() {
  const [filters, setFilters] = useState({});
  const { data, isLoading, error, isEmpty, refetch } = useDashboardData(filters);

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <header className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-semibold text-slate-900">Complaint Dashboard</h1>
      </header>

      <div className="mb-6">
        <DashboardFilters filters={filters} onChange={setFilters} />
      </div>

      {error && (
        <div className="mb-6 flex items-center justify-between rounded-lg bg-red-50 p-4 text-sm text-red-700">
          <span>{error}</span>
          <button onClick={refetch} className="font-medium underline">
            Retry
          </button>
        </div>
      )}

      {!error && isEmpty && (
        <div className="mb-6 rounded-lg bg-white p-8 text-center text-sm text-slate-500 shadow-sm">
          No complaints match the current filters.
        </div>
      )}

      <div className="mb-6 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
        <KPICard label="Total" value={data?.kpis.total_complaints} isLoading={isLoading} accentClass="border-slate-400" />
        <KPICard label="Pending" value={data?.kpis.pending} isLoading={isLoading} accentClass="border-amber-400" />
        <KPICard label="In Progress" value={data?.kpis.in_progress} isLoading={isLoading} accentClass="border-violet-400" />
        <KPICard label="Resolved" value={data?.kpis.resolved} isLoading={isLoading} accentClass="border-emerald-400" />
        <KPICard label="Escalated" value={data?.kpis.escalated} isLoading={isLoading} accentClass="border-red-400" />
        <KPICard
          label="Resolution Rate"
          value={data?.kpis.resolution_rate_percent}
          isLoading={isLoading}
          accentClass="border-blue-400"
          suffix="%"
        />
      </div>

      {!error && !isEmpty && data && <DashboardCharts summary={data} />}
    </div>
  );
}
