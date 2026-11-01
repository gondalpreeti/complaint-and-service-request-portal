import { apiClient } from "./apiClient";

// Fetch role-specific live data directly from PostgreSQL backend
export async function fetchRoleDashboard(roleOverride) {
  let endpoint;
  let targetRole = roleOverride;
  let me = {};
  let resolvedRole = targetRole ? String(targetRole).trim().toLowerCase().replace(/[\s-]+/g, "_") : "admin";

  if (targetRole) {
    if (["student", "faculty", "student_faculty", "user"].includes(resolvedRole)) {
      endpoint = "/api/role-dashboard/student";
    } else if (["staff", "service_staff"].includes(resolvedRole)) {
      endpoint = "/api/role-dashboard/staff";
    } else if (resolvedRole === "manager") {
      endpoint = "/api/role-dashboard/manager";
    } else {
      endpoint = `/api/role-dashboard/${resolvedRole}`;
    }
  } else {
    try {
      const meResponse = await apiClient.get("/api/role-dashboard/me");
      me = meResponse.data || {};
      resolvedRole = String(me.role || me.role_name || "admin").trim().toLowerCase().replace(/[\s-]+/g, "_");
      if (["student", "faculty", "student_faculty", "user"].includes(resolvedRole)) {
        endpoint = "/api/role-dashboard/student";
      } else if (["staff", "service_staff"].includes(resolvedRole)) {
        endpoint = "/api/role-dashboard/staff";
      } else if (resolvedRole === "manager") {
        endpoint = "/api/role-dashboard/manager";
      } else {
        endpoint = `/api/role-dashboard/${resolvedRole}`;
      }
    } catch {
      endpoint = "/api/role-dashboard/admin";
    }
  }

  const response = await apiClient.get(endpoint);
  const payload = response.data || {};
  const complaints = payload.complaints || payload.assigned_complaints || payload.complaint_queue || [];
  const kpis = payload.kpis || {};

  // Adapt the existing backend's response to the shape expected by
  // RoleDashboard.jsx without changing auth/RBAC or backend code.
  const normalizedComplaints = complaints.map((item) => ({
    ...item,
    request_id: item.request_id ?? item.complaint_id ?? item.assignment_id ?? "—",
    complaint_id: item.complaint_id ?? item.request_id ?? "—",
    subject: item.subject || item.description || "Untitled complaint",
    assigned_staff: item.assigned_staff || item.full_name || payload.staff?.full_name || payload.manager?.full_name || "Unassigned",
  }));

  const statusCounts = {};
  normalizedComplaints.forEach((item) => {
    const status = item.status || item.assignment_status || "Pending";
    statusCounts[status] = (statusCounts[status] || 0) + 1;
  });
  const categoryCounts = {};
  normalizedComplaints.forEach((item) => {
    const category = item.category_name || "Uncategorized";
    categoryCounts[category] = (categoryCounts[category] || 0) + 1;
  });
  const priorityCounts = {};
  normalizedComplaints.forEach((item) => {
    const priority = item.priority || "Medium";
    priorityCounts[priority] = (priorityCounts[priority] || 0) + 1;
  });

  const displayName =
    payload.display_name ||
    me?.fullname || me?.full_name || me?.name ||
    payload.staff?.full_name || payload.manager?.full_name ||
    me?.email || (resolvedRole === "admin" ? "System Administrator" : `${resolvedRole.charAt(0).toUpperCase() + resolvedRole.slice(1)} Dashboard`);

  const team = payload.team || [];
  const workload = (payload.workload || team).map((item) => ({
    ...item,
    staff_name: item.staff_name || item.full_name || "Staff member",
    active_assignments: item.active_assignments ?? item.active ?? 0,
    resolved_assignments: item.resolved_assignments ?? item.resolved ?? 0,
  }));

  return {
    ...payload,
    role: resolvedRole,
    display_name: displayName,
    kpis: {
      total: kpis.total ?? kpis.total_complaints ?? 0,
      pending: kpis.pending ?? 0,
      assigned: kpis.assigned ?? 0,
      in_progress: kpis.in_progress ?? 0,
      resolved: kpis.resolved ?? 0,
      closed: kpis.closed ?? 0,
      escalated: kpis.escalated ?? payload.escalations?.length ?? 0,
      unread_notifications: kpis.unread_notifications ?? 0,
      avg_resolution_hours: kpis.avg_resolution_hours ?? null,
    },
    complaints: normalizedComplaints,
    notifications: payload.notifications || [],
    escalations: payload.escalations || [],
    workload,
    status_distribution: payload.status_distribution || Object.entries(statusCounts).map(([status, count]) => ({ status, count })),
    category_distribution: payload.category_distribution || Object.entries(categoryCounts).map(([category_name, count]) => ({ category_name, count })),
    priority_distribution: payload.priority_distribution || Object.entries(priorityCounts).map(([priority, count]) => ({ priority, count })),
  };
}
