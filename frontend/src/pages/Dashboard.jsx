import { useState, useEffect } from "react";
import KPICard from "../components/dashboard/KPICard";
import DashboardFilters from "../components/dashboard/DashboardFilters";
import DashboardCharts from "../components/dashboard/DashboardCharts";
import ReportsView from "../components/reports/ReportsView";
import EscalationConsole from "../components/escalations/EscalationConsole";
import RoleDashboard from "../components/roleDashboard/RoleDashboard";
import { useDashboardData } from "../hooks/useDashboardData";

// Read the role claim from the existing JWT.
// This is only for choosing the initial frontend view.
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

export default function Dashboard({ onNavigate, onLogout, userEmail, roleId, role: propRole, userProfile } = {}) {
  const jwtRole = getDashboardRole();
  const actualRoleId = Number(
    roleId ||
    localStorage.getItem("user_role_id") ||
    (propRole === "admin" || jwtRole === "admin" ? 2 : propRole === "manager" || jwtRole === "manager" ? 3 : propRole === "staff" || jwtRole === "staff" ? 4 : 1)
  );

  const effectiveRoleId = actualRoleId;

  // Initial tab based on effective role
  const getInitialTab = (rId) => {
    if (rId === 4) return "escalations";
    if (rId === 3) return "dashboard";
    if (rId === 1) return "role-dashboard";
    return "dashboard";
  };

  const [activeTab, setActiveTab] = useState(() => getInitialTab(effectiveRoleId));
  const [rolePersona, setRolePersona] = useState("student");

  // Synchronize tab when switching role view
  useEffect(() => {
    if (effectiveRoleId === 4) {
      setActiveTab("escalations");
    } else if (effectiveRoleId === 3) {
      if (activeTab === "role-dashboard") setActiveTab("dashboard");
    }
  }, [effectiveRoleId]);

  const roleTitle =
    effectiveRoleId === 3
      ? "Manager Operations Dashboard"
      : effectiveRoleId === 4
      ? "Staff Operations Dashboard"
      : effectiveRoleId === 1
      ? "Student & Faculty Care Portal"
      : "Admin Analytics & Operations Dashboard";

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <header className="mb-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <h1 className="mt-1 text-2xl font-bold text-slate-900">
            {roleTitle}
          </h1>
          <p className="text-sm text-slate-500">
            CampusCare Management Portal {userEmail ? `• ${userEmail}` : ""}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Navigation Tabs - Role Filtered */}
          <div className="flex rounded-lg bg-slate-200 p-1">
            {/* Analytics Tab (Visible to Admin & Manager, Hidden for Staff) */}
            {effectiveRoleId !== 4 && (
              <button
                type="button"
                onClick={() => setActiveTab("dashboard")}
                className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                  activeTab === "dashboard"
                    ? "bg-white text-slate-900 shadow-sm"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                📊 Analytics
              </button>
            )}

            {/* Reports Tab (Visible to Admin & Manager, Hidden for Staff) */}
            {effectiveRoleId !== 4 && (
              <button
                type="button"
                onClick={() => setActiveTab("reports")}
                className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                  activeTab === "reports"
                    ? "bg-white text-slate-900 shadow-sm"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                📑 Reports
              </button>
            )}

            {/* Escalations & Actions Tab (Visible to All Roles with role-appropriate permissions) */}
            <button
              type="button"
              onClick={() => setActiveTab("escalations")}
              className={`rounded-md px-3 py-1.5 text-sm font-semibold transition-colors flex items-center gap-1.5 ${
                activeTab === "escalations"
                  ? "bg-indigo-600 text-white shadow-sm"
                  : "text-indigo-900 hover:text-indigo-700 bg-indigo-50"
              }`}
            >
              ⚡ Escalations &amp; Actions
            </button>

            {/* Role Views Tab (Visible to Admin role 2 for role-based dashboard viewing) */}
            {effectiveRoleId === 2 && (
              <button
                type="button"
                onClick={() => setActiveTab("role-dashboard")}
                className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                  activeTab === "role-dashboard"
                    ? "bg-white text-slate-900 shadow-sm"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                👤 Role Views
              </button>
            )}
          </div>

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

      {/* Role View Persona Switcher (Only visible in Role Views tab for Admin) */}
      {activeTab === "role-dashboard" && effectiveRoleId === 2 && (
        <div className="mb-6 flex items-center gap-3 bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Switch Persona:
          </span>
          <div className="flex gap-2">
            {[
              { id: "student", label: "Student / Faculty" },
              { id: "staff", label: "Service Staff" },
              { id: "manager", label: "Staff Manager" },
            ].map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => setRolePersona(p.id)}
                className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                  rolePersona === p.id
                    ? "bg-blue-600 text-white"
                    : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Main Tab Content */}
      {activeTab === "escalations" ? (
        <EscalationConsole roleId={effectiveRoleId} />
      ) : activeTab === "reports" ? (
        <ReportsView />
      ) : activeTab === "role-dashboard" ? (
        <RoleDashboard key={rolePersona} initialRole={rolePersona} />
      ) : (
        <AnalyticsDashboard />
      )}
    </div>
  );
}

// Analytics dashboard component with KPI cards, filters, and charts
function AnalyticsDashboard() {
  const [filters, setFilters] = useState({});
  const { data, isLoading, error, isEmpty, refetch } = useDashboardData(filters);

  return (
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

      {!error && !isEmpty && data && <DashboardCharts summary={data} />}
    </>
  );
}
