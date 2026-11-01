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

export default function Dashboard({ onNavigate, onLogout, userEmail } = {}) {
  const role = getDashboardRole();

  // Determine initial tab based on role
  const getInitialTab = () => {
    if (["student", "faculty", "user", "student_faculty"].includes(role)) {
      return "role-dashboard";
    }
    if (["staff", "service_staff"].includes(role)) {
      return "escalations";
    }
    if (["manager", "service_staff_manager"].includes(role)) {
      return "escalations";
    }
    return "dashboard";
  };

  const [activeTab, setActiveTab] = useState(getInitialTab);
  const [roleView, setRoleView] = useState(() => {
    if (["manager", "service_staff_manager"].includes(role)) return "manager";
    if (["staff", "service_staff"].includes(role)) return "staff";
    return "student";
  });

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <header className="mb-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            {activeTab === "dashboard"
              ? "Complaint Analytics Dashboard"
              : activeTab === "reports"
              ? "Reports & Analytics"
              : activeTab === "escalations"
              ? "Staff & Escalations Console"
              : `${roleView.charAt(0).toUpperCase() + roleView.slice(1)} Dashboard`}
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
              📊 Analytics
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
              📑 Reports
            </button>
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

      {/* Role View Persona Switcher */}
      {activeTab === "role-dashboard" && (
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
                onClick={() => setRoleView(p.id)}
                className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                  roleView === p.id
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
        <EscalationConsole />
      ) : activeTab === "reports" ? (
        <ReportsView />
      ) : activeTab === "role-dashboard" ? (
        <RoleDashboard key={roleView} initialRole={roleView} />
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
