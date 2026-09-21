import { useState } from "react";
import KPICard from "../components/dashboard/KPICard";
import DashboardFilters from "../components/dashboard/DashboardFilters";
import DashboardCharts from "../components/dashboard/DashboardCharts";
import ReportsView from "../components/reports/ReportsView";
import { useDashboardData } from "../hooks/useDashboardData";

export default function Dashboard({ onNavigate, onLogout, userEmail } = {}) {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [filters, setFilters] = useState({});
  const { data, isLoading, error, isEmpty, refetch } = useDashboardData(filters);

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <header className="mb-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            {activeTab === "dashboard" ? "Complaint Dashboard" : "Reports & Analytics"}
          </h1>
          <p className="text-sm text-slate-500">
            CampusCare Management Portal {userEmail ? `• ${userEmail}` : ""}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex rounded-lg bg-slate-200 p-1">
            <button
              type="button"
              onClick={() => setActiveTab("dashboard")}
              className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                activeTab === "dashboard"
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Dashboard
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("reports")}
              className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                activeTab === "reports"
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Reports & Analytics
            </button>
          </div>

          {onNavigate && (
            <button
              type="button"
              onClick={() => onNavigate("register-complaint")}
              className="rounded-md bg-blue-600 px-3.5 py-1.5 text-sm font-medium text-white shadow hover:bg-blue-700 transition-colors"
            >
              + File Complaint
            </button>
          )}

          {onLogout && (
            <button
              type="button"
              onClick={onLogout}
              className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-100 transition-colors"
            >
              Sign Out
            </button>
          )}
        </div>
      </header>

      {activeTab === "reports" ? (
        <ReportsView />
      ) : (
        <>
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
        </>
      )}
    </div>
  );
}
