import { useMemo, useState } from "react";
import KPICard from "../dashboard/KPICard";
import RoleDashboardCharts from "./RoleDashboardCharts";
//import { useRoleDashboardData, isDashboardDemoMode } from "../../hooks/useRoleDashboardData";
import { useRoleDashboardData } from "../../hooks/useRoleDashboardData";
const STATUS_FILTERS = ["All", "Pending", "Assigned", "In Progress", "Resolved", "Closed"];

function normalize(value) {
  return String(value ?? "").toLowerCase();
}

function statusClass(status) {
  const s = normalize(status);
  if (s === "resolved" || s === "closed") return "bg-emerald-50 text-emerald-700";
  if (s === "in progress") return "bg-violet-50 text-violet-700";
  if (s === "assigned") return "bg-blue-50 text-blue-700";
  if (s === "pending") return "bg-amber-50 text-amber-700";
  return "bg-slate-100 text-slate-700";
}

function ComplaintTable({ data, role }) {
  const [status, setStatus] = useState("All");
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (data.complaints || []).filter((item) => {
      const statusMatch = status === "All" || normalize(item.status) === normalize(status);
      const text = `${item.request_id} ${item.complaint_id} ${item.subject} ${item.category_name} ${item.priority} ${item.assigned_staff}`.toLowerCase();
      return statusMatch && (!q || text.includes(q));
    });
  }, [data.complaints, query, status]);

  return (
    <section className="rounded-xl bg-white shadow-sm ring-1 ring-slate-100">
      <div className="flex flex-col gap-3 border-b border-slate-100 p-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="font-semibold text-slate-800">{role === "student" || role === "faculty" ? "My Complaints" : "Complaint Queue"}</h2>
          <p className="text-xs text-slate-500">Live records from service_request and complaints.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search complaints..."
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
          />
          <select value={status} onChange={(e) => setStatus(e.target.value)} className="rounded-lg border border-slate-300 px-3 py-2 text-sm">
            {STATUS_FILTERS.map((item) => <option key={item}>{item}</option>)}
          </select>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase text-slate-500">
            <tr>
              <th className="px-4 py-3">Request</th>
              <th className="px-4 py-3">Subject</th>
              <th className="px-4 py-3">Category</th>
              <th className="px-4 py-3">Priority</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Assigned To</th>
              <th className="px-4 py-3">Created</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtered.map((item) => (
              <tr key={item.request_id ?? item.complaint_id ?? `${item.subject}-${item.created_at}`} className="hover:bg-slate-50">
                <td className="whitespace-nowrap px-4 py-3 font-medium text-slate-700">#{item.request_id}</td>
                <td className="max-w-xs px-4 py-3 text-slate-800">{item.subject || "Untitled complaint"}</td>
                <td className="px-4 py-3 text-slate-600">{item.category_name || "—"}</td>
                <td className="px-4 py-3 text-slate-600">{item.priority || "—"}</td>
                <td className="px-4 py-3"><span className={`rounded-full px-2.5 py-1 text-xs font-medium ${statusClass(item.status)}`}>{item.status || "—"}</span></td>
                <td className="px-4 py-3 text-slate-600">{item.assigned_staff || "Unassigned"}</td>
                <td className="whitespace-nowrap px-4 py-3 text-slate-500">{item.created_at ? new Date(item.created_at).toLocaleDateString() : "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {!filtered.length && <div className="p-8 text-center text-sm text-slate-400">No complaints match the selected filter.</div>}
    </section>
  );
}

function Notifications({ notifications }) {
  return (
    <section className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-100">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="font-semibold text-slate-800">Notifications</h2>
        <span className="rounded-full bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700">{notifications.length}</span>
      </div>
      <div className="space-y-3">
        {notifications.slice(0, 6).map((n) => (
          <div key={n.notification_id ?? `${n.title}-${n.created_at}`} className={`rounded-lg border p-3 ${n.is_read ? "border-slate-100" : "border-blue-100 bg-blue-50/40"}`}>
            <div className="flex items-start justify-between gap-3">
              <p className="text-sm font-medium text-slate-800">{n.title || "Notification"}</p>
              <span className="whitespace-nowrap text-xs text-slate-400">{n.created_at ? new Date(n.created_at).toLocaleDateString() : ""}</span>
            </div>
            <p className="mt-1 text-xs leading-5 text-slate-600">{n.message || ""}</p>
          </div>
        ))}
        {!notifications.length && <p className="py-6 text-center text-sm text-slate-400">No notifications.</p>}
      </div>
    </section>
  );
}

function Escalations({ escalations, role }) {
  if (!escalations?.length) return null;
  return (
    <section className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-100">
      <div className="mb-3">
        <h2 className="font-semibold text-slate-800">{role === "staff" ? "Escalation Requests" : "Escalations"}</h2>
        <p className="text-xs text-slate-500">Based on escalation_logs. Manager reviews escalation requests raised by staff.</p>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="px-3 py-2">Request</th><th className="px-3 py-2">Subject</th><th className="px-3 py-2">Reason</th><th className="px-3 py-2">Status</th></tr></thead>
          <tbody className="divide-y divide-slate-100">
            {escalations.map((e) => <tr key={e.escalation_id ?? `${e.request_id}-${e.reason}`}><td className="px-3 py-3">#{e.request_id}</td><td className="px-3 py-3">{e.subject || "—"}</td><td className="max-w-sm px-3 py-3 text-slate-600">{e.reason || "—"}</td><td className="px-3 py-3"><span className={`rounded-full px-2 py-1 text-xs ${statusClass(e.status)}`}>{e.status || "—"}</span></td></tr>)}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function Workload({ workload }) {
  if (!workload?.length) return null;
  return (
    <section className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-100">
      <h2 className="mb-3 font-semibold text-slate-800">Staff Workload</h2>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
        {workload.map((staff) => (
          <div key={staff.staff_id} className="rounded-lg border border-slate-100 p-4">
            <div className="flex items-start justify-between gap-2"><div><p className="font-medium text-slate-800">{staff.staff_name}</p><p className="text-xs text-slate-500">{staff.department || ""}</p></div><span className="text-xs text-slate-500">{staff.availability_status || "—"}</span></div>
            <div className="mt-4 grid grid-cols-2 gap-2"><div className="rounded bg-amber-50 p-2"><p className="text-xs text-slate-500">Active</p><p className="text-lg font-semibold">{staff.active_assignments}</p></div><div className="rounded bg-emerald-50 p-2"><p className="text-xs text-slate-500">Resolved</p><p className="text-lg font-semibold">{staff.resolved_assignments}</p></div></div>
          </div>
        ))}
      </div>
    </section>
  );
}

//export default function RoleDashboard() {
  //const [demoRole, setDemoRole] = useState("student");*/
export default function RoleDashboard({ initialRole = "student" }) {
  const { data, isLoading, error, refetch } = useRoleDashboardData(initialRole);

  if (isLoading) return <div className="min-h-screen bg-slate-50 p-6"><div className="mx-auto max-w-7xl animate-pulse space-y-4"><div className="h-8 w-72 rounded bg-slate-200" /><div className="grid grid-cols-2 gap-4 md:grid-cols-4"><div className="h-24 rounded bg-slate-200" /><div className="h-24 rounded bg-slate-200" /><div className="h-24 rounded bg-slate-200" /><div className="h-24 rounded bg-slate-200" /></div></div></div>;

  if (error) return <div className="min-h-screen bg-slate-50 p-6"><div className="mx-auto max-w-xl rounded-xl bg-white p-8 text-center shadow-sm"><h1 className="font-semibold text-slate-900">Dashboard unavailable</h1><p className="mt-2 text-sm text-slate-500">{error}</p><button onClick={refetch} className="mt-4 rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white">Retry</button></div></div>;

  const role = data.role;
  const isStudent = ["student", "faculty", "user"].includes(role);
  const isManager = ["manager", "service_staff_manager", "service staff manager"].includes(role);
  const isStaff = !isStudent && !isManager;
  const k = data.kpis || {};

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-blue-600">Complaint &amp; Service Request Portal</p>
            <h1 className="text-2xl font-bold text-slate-900">{data.display_name}</h1>
            <p className="text-sm text-slate-500">Operational overview and service request tracking.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button onClick={refetch} className="self-start rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">Refresh</button>
          </div>
        </header>

        <div className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-7">
          <KPICard label="Total" value={k.total} accentClass="border-slate-400" />
          <KPICard label="Pending" value={k.pending} accentClass="border-amber-400" />
          <KPICard label="Assigned" value={k.assigned} accentClass="border-blue-400" />
          <KPICard label="In Progress" value={k.in_progress} accentClass="border-violet-400" />
          <KPICard label="Resolved" value={k.resolved} accentClass="border-emerald-400" />
          <KPICard label="Escalated" value={k.escalated} accentClass="border-red-400" />
          <KPICard label="Unread" value={k.unread_notifications} accentClass="border-cyan-400" />
        </div>

        <RoleDashboardCharts data={data} />
        <ComplaintTable data={data} role={isStudent ? role : isManager ? "manager" : "staff"} />

        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          <Escalations escalations={data.escalations} role={isManager ? "manager" : "staff"} />
          <Notifications notifications={data.notifications} />
        </div>
        <Workload workload={data.workload} />
      </div>
    </div>
  );
}
