
import { useState } from "react";
import KPICard from "../components/dashboard/KPICard";
import DashboardFilters from "../components/dashboard/DashboardFilters";
import DashboardCharts from "../components/dashboard/DashboardCharts";
import { useDashboardData } from "../hooks/useDashboardData";
import RoleDashboard from "../components/roleDashboard/RoleDashboard";

// Read the role claim from the existing JWT.
// This is only for choosing the frontend view.
// Backend authorization remains responsible for access control.
function getDashboardRole() {
  const token = localStorage.getItem("authToken");

  if (!token) return null;

  try {
    const payloadPart = token.split(".")[1];
    if (!payloadPart) return null;

    const base64 = payloadPart
      .replace(/-/g, "+")
      .replace(/_/g, "/");

    const padded = base64.padEnd(
      Math.ceil(base64.length / 4) * 4,
      "="
    );

    const payload = JSON.parse(atob(padded));

    return String(payload.role || "")
      .trim()
      .toLowerCase()
      .replace(/[\s-]+/g, "_");
  } catch {
    return null;
  }
}

export default function Dashboard() {
  const role = getDashboardRole();

  // Student and Faculty dashboards
  if (["student", "faculty", "user", "student_faculty"].includes(role)) {
    return <RoleDashboard initialRole="student" />;
  }

  // Service Staff dashboard
  if (["staff", "service_staff"].includes(role)) {
    return <RoleDashboard initialRole="staff" />;
  }

  // Service Staff Manager dashboard
  if (["manager", "service_staff_manager"].includes(role)) {
    return <RoleDashboard initialRole="manager" />;
  }

  // Admin and other roles retain the existing analytics dashboard.
  return <AnalyticsDashboard />;
}

// Original team analytics dashboard — preserved.
function AnalyticsDashboard() {
  const [filters, setFilters] = useState({});
  const { data, isLoading, error, isEmpty, refetch } =
    useDashboardData(filters);

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <header className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-semibold text-slate-900">
          Complaint Dashboard
        </h1>
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
        <KPICard
          label="Total"
          value={data?.kpis.total_complaints}
          isLoading={isLoading}
          accentClass="border-slate-400"
        />
        <KPICard
          label="Pending"
          value={data?.kpis.pending}
          isLoading={isLoading}
          accentClass="border-amber-400"
        />
        <KPICard
          label="In Progress"
          value={data?.kpis.in_progress}
          isLoading={isLoading}
          accentClass="border-violet-400"
        />
        <KPICard
          label="Resolved"
          value={data?.kpis.resolved}
          isLoading={isLoading}
          accentClass="border-emerald-400"
        />
        <KPICard
          label="Escalated"
          value={data?.kpis.escalated}
          isLoading={isLoading}
          accentClass="border-red-400"
        />
        <KPICard
          label="Resolution Rate"
          value={data?.kpis.resolution_rate_percent}
          isLoading={isLoading}
          accentClass="border-blue-400"
          suffix="%"
        />
      </div>

      {!error && !isEmpty && data && (
        <DashboardCharts summary={data} />
      )}
    </div>
  );
}
