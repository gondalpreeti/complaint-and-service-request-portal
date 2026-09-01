import React, { useEffect, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import KPICard from "../dashboard/KPICard";
import ChartCard from "../dashboard/ChartCard";
import ChartErrorBoundary from "../dashboard/ChartErrorBoundary";
import DashboardFilters from "../dashboard/DashboardFilters";
import { fetchReportsSummary, fetchReportsTable, getExportReportsCsvUrl } from "../../api/reportsApi";

const STATUS_COLORS = {
  Pending: "#f59e0b",
  Assigned: "#3b82f6",
  "In Progress": "#8b5cf6",
  Resolved: "#10b981",
  Closed: "#64748b",
};

const PRIORITY_COLORS = {
  Critical: "#dc2626",
  High: "#f97316",
  Medium: "#eab308",
  Low: "#22c55e",
};

export default function ReportsView() {
  const [filters, setFilters] = useState({});
  const [summary, setSummary] = useState(null);
  const [tableData, setTableData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);

  const loadData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [summaryRes, tableRes] = await Promise.all([
        fetchReportsSummary(filters),
        fetchReportsTable({ ...filters, page, pageSize: 8 }),
      ]);
      setSummary(summaryRes);
      setTableData(tableRes);
    } catch (err) {
      const msg =
        err.response?.status === 401
          ? "Your session has expired. Please log in again."
          : err.response?.status === 403
          ? "You don't have permission to view reports (Admin & Manager only)."
          : "Could not load report data. Please try again.";
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters, page]);

  const handleExportCsv = () => {
    const url = getExportReportsCsvUrl(filters);
    window.open(url, "_blank");
  };

  const handlePrint = () => {
    window.print();
  };

  const kpis = summary?.kpis;
  const statusDist = summary?.status_distribution || [];
  const categoryDist = summary?.category_distribution || [];
  const priorityDist = summary?.priority_distribution || [];
  const timeTrend = summary?.complaints_over_time || [];
  const items = tableData?.items || [];
  const totalPages = tableData?.total_pages || 1;

  return (
    <div className="space-y-6">
      {/* Header action bar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-slate-800">Reports & Analytics</h2>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleExportCsv}
            className="rounded border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 shadow-sm"
          >
            Export CSV
          </button>
          <button
            onClick={handlePrint}
            className="rounded border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 shadow-sm"
          >
            Print Report
          </button>
        </div>
      </div>

      {/* Filters */}
      <DashboardFilters filters={filters} onChange={setFilters} />

      {/* Error alert */}
      {error && (
        <div className="flex items-center justify-between rounded-lg bg-red-50 p-4 text-sm text-red-700">
          <span>{error}</span>
          <button onClick={loadData} className="font-medium underline">
            Retry
          </button>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
        <KPICard label="Total Logged" value={kpis?.total_complaints} isLoading={isLoading} accentClass="border-slate-400" />
        <KPICard label="Pending" value={kpis?.pending} isLoading={isLoading} accentClass="border-amber-400" />
        <KPICard label="In Progress" value={kpis?.in_progress} isLoading={isLoading} accentClass="border-violet-400" />
        <KPICard label="Resolved" value={kpis?.resolved} isLoading={isLoading} accentClass="border-emerald-400" />
        <KPICard
          label="Resolution Rate"
          value={kpis?.resolution_rate_percent}
          isLoading={isLoading}
          accentClass="border-blue-400"
          suffix="%"
        />
        <KPICard
          label="SLA Compliance"
          value={kpis?.sla_compliance_percent}
          isLoading={isLoading}
          accentClass="border-teal-400"
          suffix="%"
        />
      </div>

      {/* Charts Grid */}
      {!error && summary && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {/* Status Breakdown */}
          <ChartErrorBoundary>
            <ChartCard title="Complaints by Status" isEmpty={statusDist.length === 0}>
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={statusDist}
                    dataKey="count"
                    nameKey="status"
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    label={(entry) => `${entry.status}: ${entry.count}`}
                  >
                    {statusDist.map((entry) => (
                      <Cell key={entry.status} fill={STATUS_COLORS[entry.status] || "#94a3b8"} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </ChartCard>
          </ChartErrorBoundary>

          {/* Category Breakdown */}
          <ChartErrorBoundary>
            <ChartCard title="Complaints by Category" isEmpty={categoryDist.length === 0}>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={categoryDist} layout="vertical" margin={{ left: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" allowDecimals={false} />
                  <YAxis type="category" dataKey="category_name" width={110} tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Bar dataKey="total_count" name="Total" fill="#3b82f6" radius={[0, 4, 4, 0]} />
                  <Bar dataKey="resolved_count" name="Resolved" fill="#10b981" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>
          </ChartErrorBoundary>

          {/* Priority Distribution */}
          <ChartErrorBoundary>
            <ChartCard title="Priority Distribution" isEmpty={priorityDist.length === 0}>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={priorityDist}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="priority" tick={{ fontSize: 12 }} />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                    {priorityDist.map((entry) => (
                      <Cell key={entry.priority} fill={PRIORITY_COLORS[entry.priority] || "#94a3b8"} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>
          </ChartErrorBoundary>

          {/* Complaints Trend Over Time */}
          <ChartErrorBoundary>
            <ChartCard title="Complaints Over Time" isEmpty={timeTrend.length === 0}>
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={timeTrend}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="day" tick={{ fontSize: 11 }} />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Line type="monotone" dataKey="count" stroke="#3b82f6" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </ChartCard>
          </ChartErrorBoundary>
        </div>
      )}

      {/* Complaints Ledger Table */}
      <div className="rounded-lg bg-white p-4 shadow-sm">
        <h3 className="mb-3 text-sm font-semibold text-slate-700">Complaint Records Ledger</h3>
        {items.length === 0 ? (
          <p className="py-6 text-center text-xs text-slate-400">No complaint records found.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500">
                  <th className="py-2 px-3">Ticket ID</th>
                  <th className="py-2 px-3">Subject</th>
                  <th className="py-2 px-3">Category</th>
                  <th className="py-2 px-3">Priority</th>
                  <th className="py-2 px-3">Status</th>
                  <th className="py-2 px-3">Logged Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {items.map((row) => (
                  <tr key={row.complaint_id} className="hover:bg-slate-50">
                    <td className="py-2.5 px-3 font-mono font-medium text-slate-900">{row.complaint_id}</td>
                    <td className="py-2.5 px-3 font-medium text-slate-900">{row.subject}</td>
                    <td className="py-2.5 px-3 text-slate-600">{row.category_name}</td>
                    <td className="py-2.5 px-3">
                      <span
                        className={`rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase ${
                          row.priority === "Critical"
                            ? "bg-red-100 text-red-700"
                            : row.priority === "High"
                            ? "bg-orange-100 text-orange-700"
                            : row.priority === "Medium"
                            ? "bg-amber-100 text-amber-700"
                            : "bg-emerald-100 text-emerald-700"
                        }`}
                      >
                        {row.priority}
                      </span>
                    </td>
                    <td className="py-2.5 px-3">
                      <span className="font-medium text-slate-800">{row.status}</span>
                    </td>
                    <td className="py-2.5 px-3 text-slate-500">{row.created_at}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-3 text-xs text-slate-500">
            <span>
              Page {page} of {totalPages}
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="rounded border border-slate-300 px-2 py-1 hover:bg-slate-50 disabled:opacity-50"
              >
                Previous
              </button>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="rounded border border-slate-300 px-2 py-1 hover:bg-slate-50 disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
