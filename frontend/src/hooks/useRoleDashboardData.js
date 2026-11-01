import { useCallback, useEffect, useState } from "react";
import { fetchRoleDashboard } from "../api/roleDashboardApi";

const DEMO = String(import.meta.env.VITE_DASHBOARD_DEMO_MODE ?? "true").toLowerCase() !== "false";
const samples = {
  student: { role: "student", display_name: "Aarav Kulkarni", kpis: { total: 8, pending: 2, assigned: 1, in_progress: 2, resolved: 2, escalated: 0, unread_notifications: 1, avg_resolution_hours: 18 }, complaints: [{ request_id: 1042, complaint_id: 1042, subject: "Wi-Fi not working in Lab 2", category_name: "IT Services", priority: "High", status: "In Progress", assigned_staff: "Rohan Patil", created_at: "2026-10-10" }, { request_id: 1038, complaint_id: 1038, subject: "Projector display issue", category_name: "Classroom Equipment", priority: "Medium", status: "Pending", assigned_staff: "Unassigned", created_at: "2026-10-08" }, { request_id: 1021, complaint_id: 1021, subject: "Library computer login issue", category_name: "IT Services", priority: "Low", status: "Resolved", assigned_staff: "Neha Shah", created_at: "2026-10-02" }], notifications: [{ notification_id: 1, title: "Complaint assigned", message: "CP-1042 has been assigned to IT Services.", created_at: "2026-10-10", is_read: false }, { notification_id: 2, title: "Resolution updated", message: "A resolution note was added to CP-1021.", created_at: "2026-10-03", is_read: true }], escalations: [], workload: [], status_distribution: [{ status: "Pending", count: 2 }, { status: "In Progress", count: 2 }, { status: "Resolved", count: 2 }, { status: "Closed", count: 2 }], category_distribution: [{ category_name: "IT Services", count: 4 }, { category_name: "Classroom Equipment", count: 2 }], priority_distribution: [{ priority: "High", count: 2 }, { priority: "Medium", count: 3 }, { priority: "Low", count: 3 }] },
  staff: { role: "staff", display_name: "Rohan Patil", kpis: { total: 6, pending: 0, assigned: 3, in_progress: 2, resolved: 12, escalated: 1, unread_notifications: 2, avg_resolution_hours: 14 }, complaints: [{ request_id: 1042, complaint_id: 1042, subject: "Wi-Fi not working in Lab 2", category_name: "IT Services", priority: "High", status: "In Progress", assigned_staff: "Rohan Patil", created_at: "2026-10-10" }, { request_id: 1040, complaint_id: 1040, subject: "Printer queue stuck", category_name: "IT Services", priority: "Medium", status: "Assigned", assigned_staff: "Rohan Patil", created_at: "2026-10-09" }, { request_id: 1033, complaint_id: 1033, subject: "Lab desktop not starting", category_name: "Hardware", priority: "High", status: "Assigned", assigned_staff: "Rohan Patil", created_at: "2026-10-05" }], notifications: [], escalations: [{ escalation_id: 204, request_id: 1033, subject: "Lab desktop not starting", reason: "Replacement part required", status: "Pending" }], workload: [], status_distribution: [{ status: "Assigned", count: 3 }, { status: "In Progress", count: 2 }, { status: "Resolved", count: 1 }], category_distribution: [{ category_name: "IT Services", count: 4 }, { category_name: "Hardware", count: 2 }], priority_distribution: [{ priority: "High", count: 3 }, { priority: "Medium", count: 2 }, { priority: "Low", count: 1 }] },
  manager: { role: "manager", display_name: "Priya Deshmukh", kpis: { total: 11, pending: 3, assigned: 4, in_progress: 2, resolved: 8, escalated: 2, unread_notifications: 2, avg_resolution_hours: 16 }, complaints: [{ request_id: 1050, complaint_id: 1050, subject: "Access card not working", category_name: "Facilities", priority: "Medium", status: "Pending", assigned_staff: "Unassigned", created_at: "2026-10-12" }, { request_id: 1042, complaint_id: 1042, subject: "Wi-Fi not working in Lab 2", category_name: "IT Services", priority: "High", status: "In Progress", assigned_staff: "Rohan Patil", created_at: "2026-10-10" }, { request_id: 1030, complaint_id: 1030, subject: "Air conditioning in Room 304", category_name: "Facilities", priority: "Low", status: "Resolved", assigned_staff: "Neha Shah", created_at: "2026-10-04" }], notifications: [], escalations: [{ escalation_id: 204, request_id: 1033, subject: "Lab desktop not starting", reason: "Replacement part required", status: "Pending" }, { escalation_id: 201, request_id: 1027, subject: "SLA deadline approaching", reason: "SLA deadline approaching", status: "Pending" }], workload: [{ staff_id: 1, staff_name: "Rohan Patil", department: "IT Services", availability_status: "Available", active_assignments: 4, resolved_assignments: 12 }, { staff_id: 2, staff_name: "Neha Shah", department: "Facilities", availability_status: "Available", active_assignments: 3, resolved_assignments: 9 }], status_distribution: [{ status: "Pending", count: 3 }, { status: "Assigned", count: 4 }, { status: "In Progress", count: 2 }, { status: "Resolved", count: 2 }], category_distribution: [{ category_name: "IT Services", count: 6 }, { category_name: "Facilities", count: 3 }, { category_name: "Hardware", count: 2 }], priority_distribution: [{ priority: "High", count: 4 }, { priority: "Medium", count: 5 }, { priority: "Low", count: 2 }] }
};
export function isDashboardDemoMode() { return DEMO; }
export function getDemoDashboard(role) { return samples[role] || samples.student; }
//export function useRoleDashboardData(roleOverride) {
export function useRoleDashboardData(roleOverride, forceDemo = false) {
  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
     // if (DEMO) {
     if (DEMO || forceDemo){
        setData({ ...getDemoDashboard(roleOverride) }); return;
      }
      setData(await fetchRoleDashboard());
    }
    catch (err) {
      const status = err.response?.status; setError(status === 401 ? "Your session has expired. Please log in again." : status === 403 ? "You don't have permission to view this dashboard." : status === 404 ? (err.response?.data?.detail || "No dashboard profile is linked to this account.") : err.message || "Couldn't load dashboard data. Please try again.");
    } finally { setIsLoading(false); }
  },
  //[roleOverride]
  [roleOverride, forceDemo]);
  useEffect(() => {
    load();

  }, [load]);
  //return { data, isLoading, error, refetch: load, demoMode: DEMO };
   return { data, isLoading, error, refetch: load, demoMode: DEMO || forceDemo };
}
