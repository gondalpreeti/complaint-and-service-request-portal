import React, { useState, useEffect } from "react";
import axios from "axios";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";
const DEV_TOKEN =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxIiwicm9sZSI6ImFkbWluIiwiZXhwIjo0MTAyNDQ0ODAwfQ.TkQTz9gu_19StaUCkk7pSuaDFaeQlI2M_71poqx4iNk";

export default function EscalationConsole({ roleId } = {}) {
  const effectiveRoleId = Number(roleId || localStorage.getItem("user_role_id") || 2);
  const [staffList, setStaffList] = useState([]);
  const [selectedStaffId, setSelectedStaffId] = useState(2); // Default Priya Patil
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [feedback, setFeedback] = useState(null);

  // Filter and search states
  const [filterPriority, setFilterPriority] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterCategory, setFilterCategory] = useState("all");
  const [searchName, setSearchName] = useState("");

  // Modal states
  const [escalateModal, setEscalateModal] = useState(null); // { type: 'peer' | 'manager', ticket }
  const [eligibleStaff, setEligibleStaff] = useState([]);
  const [targetStaffId, setTargetStaffId] = useState("");
  const [escalationReason, setEscalationReason] = useState("");
  const [resolveModal, setResolveModal] = useState(null); // ticket
  const [resolutionNotes, setResolutionNotes] = useState("");
  const [historyModal, setHistoryModal] = useState(null); // ticket
  const [auditLogs, setAuditLogs] = useState([]);

  // Dynamic categories extracted from tickets
  const categories = React.useMemo(() => {
    const cats = new Set();
    tickets.forEach((t) => {
      if (t.category_name) cats.add(t.category_name);
    });
    return ["all", ...Array.from(cats).sort()];
  }, [tickets]);

  // Filtered and sorted tickets
  // Requirement: In the escalations and actions tab, put sorting according to critical.
  // critical priorities have top most priority then high, medium, then low. also unassigned should show first.
  const filteredTickets = React.useMemo(() => {
    let list = [...tickets];

    // 1. Priority filter
    if (filterPriority !== "all") {
      list = list.filter(
        (t) => (t.priority_status || "").toLowerCase() === filterPriority.toLowerCase()
      );
    }

    // 2. Status filter
    if (filterStatus !== "all") {
      list = list.filter(
        (t) => (t.status || "").toLowerCase() === filterStatus.toLowerCase()
      );
    }

    // 3. Category filter
    if (filterCategory !== "all") {
      list = list.filter(
        (t) => (t.category_name || "").toLowerCase() === filterCategory.toLowerCase()
      );
    }

    // 4. Name / Keyword search
    if (searchName.trim()) {
      const q = searchName.trim().toLowerCase();
      list = list.filter(
        (t) =>
          (t.staff_name && t.staff_name.toLowerCase().includes(q)) ||
          (t.submitter_name && t.submitter_name.toLowerCase().includes(q)) ||
          (t.subject && t.subject.toLowerCase().includes(q)) ||
          (t.description && t.description.toLowerCase().includes(q)) ||
          String(t.request_id).includes(q) ||
          String(t.complaint_id).includes(q)
      );
    }

    // 5. Sorting: Unassigned first, then Critical -> High -> Medium -> Low
    const priorityRank = {
      critical: 1,
      high: 2,
      medium: 3,
      low: 4,
    };

    list.sort((a, b) => {
      const isUnassignedA = !a.staff_id || (a.staff_name || "").toLowerCase() === "unassigned";
      const isUnassignedB = !b.staff_id || (b.staff_name || "").toLowerCase() === "unassigned";
      if (isUnassignedA && !isUnassignedB) return -1;
      if (!isUnassignedA && isUnassignedB) return 1;

      const rankA = priorityRank[(a.priority_status || "").toLowerCase()] || 5;
      const rankB = priorityRank[(b.priority_status || "").toLowerCase()] || 5;
      if (rankA !== rankB) return rankA - rankB;

      return (b.request_id || 0) - (a.request_id || 0);
    });

    return list;
  }, [tickets, filterPriority, filterStatus, filterCategory, searchName]);

  // Fetch staff list on mount
  useEffect(() => {
    async function loadStaff() {
      try {
        const res = await axios.get(`${API_BASE_URL}/api/escalations/staff-list`, {
          headers: { Authorization: `Bearer ${DEV_TOKEN}` },
        });
        setStaffList(res.data);
        if (res.data.length > 0 && !selectedStaffId) {
          setSelectedStaffId(res.data[0].staff_id);
        }
      } catch (err) {
        console.error("Failed to load staff list:", err);
      }
    }
    loadStaff();
  }, []);

  // Fetch active tickets when selected staff changes
  const loadTickets = async () => {
    setLoading(true);
    setFeedback(null);
    try {
      const res = await axios.get(`${API_BASE_URL}/api/escalations/all-active`, {
        headers: { Authorization: `Bearer ${DEV_TOKEN}`, "X-Staff-Id": selectedStaffId },
      });
      setTickets(res.data);
    } catch (err) {
      console.error("Failed to load active tickets:", err);
      setFeedback({ type: "error", message: "Failed to load active tickets from server." });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTickets();
  }, [selectedStaffId]);

  const currentStaff = staffList.find((s) => s.staff_id === Number(selectedStaffId)) || {
    staff_id: selectedStaffId,
    full_name: "Active Staff",
    designation: "Staff",
    department: "Operations",
  };

  // 1. Action: Start Progress
  const handleStartProgress = async (ticket) => {
    setActionLoading(true);
    const actingStaffId = selectedStaffId || ticket.staff_id || currentStaff.staff_id;
    try {
      const res = await axios.post(
        `${API_BASE_URL}/api/escalations/status/start-progress`,
        {
          request_id: ticket.request_id,
          notes: "Staff has actively started diagnosis and resolution work.",
        },
        {
          headers: { Authorization: `Bearer ${DEV_TOKEN}`, "X-Staff-Id": actingStaffId },
        }
      );
      setFeedback({
        type: "success",
        message: `✅ Status updated: Ticket #${ticket.request_id} transitioned to IN PROGRESS. Complainant notified.`,
      });
      await loadTickets();
    } catch (err) {
      setFeedback({
        type: "error",
        message: `❌ Failed to start progress: ${err.response?.data?.detail || err.message}`,
      });
    } finally {
      setActionLoading(false);
    }
  };

  // 2. Open Peer Escalation Modal
  const openPeerEscalation = async (ticket) => {
    setEscalationReason("");
    setTargetStaffId("");
    setEligibleStaff([]);
    setEscalateModal({ type: "peer", ticket });
    const actingStaffId = selectedStaffId || ticket.staff_id || currentStaff.staff_id;
    try {
      const res = await axios.get(`${API_BASE_URL}/api/escalations/staff/${ticket.request_id}`, {
        headers: { Authorization: `Bearer ${DEV_TOKEN}`, "X-Staff-Id": actingStaffId },
      });
      let staffResults = res.data.staff || [];
      if (staffResults.length === 0) {
        staffResults = staffList.filter((s) => s.staff_id !== actingStaffId);
      }
      setEligibleStaff(staffResults);
      if (staffResults.length > 0) {
        setTargetStaffId(staffResults[0].staff_id);
      }
    } catch (err) {
      console.warn("Peer staff endpoint fallback:", err);
      const fallback = staffList.filter((s) => s.staff_id !== actingStaffId);
      setEligibleStaff(fallback);
      if (fallback.length > 0) {
        setTargetStaffId(fallback[0].staff_id);
      }
    }
  };

  // 3. Open Manager Escalation Modal
  const openManagerEscalation = (ticket) => {
    setEscalationReason("Requires supervisor assessment, technical budget and higher authorization.");
    setEscalateModal({ type: "manager", ticket });
  };

  // Submit Escalation
  const submitEscalation = async () => {
    if (!escalationReason.trim() || escalationReason.trim().length < 5) {
      alert("Please provide an escalation explanation of at least 5 characters.");
      return;
    }
    setActionLoading(true);
    const { type, ticket } = escalateModal;
    const actingStaffId = selectedStaffId || ticket.staff_id || currentStaff.staff_id;
    try {
      let res;
      if (type === "peer") {
        res = await axios.post(
          `${API_BASE_URL}/api/escalations/staff`,
          {
            request_id: ticket.request_id,
            target_staff_id: Number(targetStaffId),
            reason: escalationReason.trim(),
          },
          {
            headers: { Authorization: `Bearer ${DEV_TOKEN}`, "X-Staff-Id": actingStaffId },
          }
        );
      } else {
        res = await axios.post(
          `${API_BASE_URL}/api/escalations/manager`,
          {
            request_id: ticket.request_id,
            reason: escalationReason.trim(),
          },
          {
            headers: { Authorization: `Bearer ${DEV_TOKEN}`, "X-Staff-Id": actingStaffId },
          }
        );
      }

      setEscalateModal(null);
      setFeedback({
        type: "success",
        message: `🚀 Escalation Successful! ${res.data.message} | Log ID: #${res.data.escalation_id} | New Assignment: #${res.data.new_assignment_id}`,
      });
      await loadTickets();
    } catch (err) {
      alert(`Escalation failed: ${err.response?.data?.detail || err.message}`);
    } finally {
      setActionLoading(false);
    }
  };

  // 4. Resolve Ticket
  const submitResolution = async () => {
    if (!resolutionNotes.trim()) {
      alert("Please enter resolution notes.");
      return;
    }
    setActionLoading(true);
    const actingStaffId = selectedStaffId || resolveModal.staff_id || currentStaff.staff_id;
    try {
      const res = await axios.post(
        `${API_BASE_URL}/api/escalations/status/resolve`,
        {
          request_id: resolveModal.request_id,
          resolution_notes: resolutionNotes.trim(),
        },
        {
          headers: { Authorization: `Bearer ${DEV_TOKEN}`, "X-Staff-Id": actingStaffId },
        }
      );
      setResolveModal(null);
      setFeedback({
        type: "success",
        message: `🎉 Resolution Complete! Ticket #${resolveModal.request_id} marked as Solved/Resolved. Complainant notified.`,
      });
      await loadTickets();
    } catch (err) {
      alert(`Failed to resolve: ${err.response?.data?.detail || err.message}`);
    } finally {
      setActionLoading(false);
    }
  };

  // 5. View History
  const openHistory = async (ticket) => {
    setHistoryModal(ticket);
    setAuditLogs([]);
    try {
      const res = await axios.get(`${API_BASE_URL}/api/escalations/history/${ticket.request_id}`, {
        headers: { Authorization: `Bearer ${DEV_TOKEN}`, "X-Staff-Id": ticket.staff_id },
      });
      setAuditLogs(res.data);
    } catch (err) {
      console.error("Failed to load audit history:", err);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Profile Switcher */}
      <div className="rounded-xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 p-6 text-white shadow-md">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="rounded bg-indigo-500/20 px-2 py-0.5 text-xs font-semibold text-indigo-300 border border-indigo-500/30">
                {effectiveRoleId === 3
                  ? "Manager Escalations & Oversight"
                  : effectiveRoleId === 4
                  ? "Staff Operations & Triage"
                  : "Escalations & Resolution System"}
              </span>
              <span className="rounded bg-emerald-500/20 px-2 py-0.5 text-xs font-semibold text-emerald-300 border border-emerald-500/30">
                Active
              </span>
            </div>
            <h2 className="mt-2 text-xl font-bold tracking-tight">
              {effectiveRoleId === 3
                ? "Manager Escalation & Approval Console"
                : effectiveRoleId === 4
                ? "Staff Service Request & Escalation Console"
                : "Staff & Escalation Operations Console"}
            </h2>
            <p className="mt-1 text-xs text-slate-300">
              {effectiveRoleId === 3
                ? "Review and resolve escalated service requests, assign peer staff, and monitor SLA audit logs."
                : "Directly perform staff workflow actions: Start progress, trigger peer staff or vertical escalations, resolve tickets, and inspect audit logs."}
            </p>
          </div>

          {/* Active staff profile selector */}
          <div className="flex flex-col gap-1 rounded-lg bg-white/10 p-3 backdrop-blur-sm border border-white/10 min-w-[280px]">
            <label className="text-[11px] font-semibold text-slate-300 uppercase tracking-wider">
              Active Staff Profile:
            </label>
            <select
              value={selectedStaffId}
              onChange={(e) => setSelectedStaffId(Number(e.target.value))}
              className="rounded bg-slate-800 text-xs text-white border border-slate-600 px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-400"
            >
              {staffList.map((s) => (
                <option key={s.staff_id} value={s.staff_id}>
                  {s.full_name} ({s.designation} - {s.department})
                </option>
              ))}
            </select>
            <div className="mt-1 flex items-center justify-between text-[11px] text-slate-300">
              <span>Dept: <strong>{currentStaff.department}</strong></span>
              <span className="rounded bg-blue-400/20 px-1.5 py-0.2 text-[10px] text-blue-200">
                {currentStaff.designation}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Live Feedback Alert */}
      {feedback && (
        <div
          className={`flex items-center justify-between rounded-lg p-4 text-sm font-medium shadow-sm transition-all ${
            feedback.type === "success"
              ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
              : "bg-red-50 text-red-800 border border-red-200"
          }`}
        >
          <span>{feedback.message}</span>
          <button onClick={() => setFeedback(null)} className="text-xs font-bold underline ml-4">
            Dismiss
          </button>
        </div>
      )}

      {/* Tickets List & Filters */}
      <div className="rounded-xl bg-white p-6 shadow-sm border border-slate-200">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div>
            <h3 className="text-base font-bold text-slate-900">Active Service Request Queue</h3>
            <p className="text-xs text-slate-500">
              Showing tickets sorted by priority (Critical first, Unassigned at top) with multi-criteria filtering.
            </p>
          </div>
          <button
            onClick={loadTickets}
            disabled={loading}
            className="rounded border border-slate-300 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition-colors shadow-sm"
          >
            ↻ Refresh Queue
          </button>
        </div>

        {/* Filters and Search Bar (Priority, Status, Name, Category) */}
        <div className="mb-6 rounded-lg bg-slate-50 p-4 border border-slate-200">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {/* 1. Name / Search filter */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Search Name / Ticket
              </label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="Student, staff, or subject..."
                  value={searchName}
                  onChange={(e) => setSearchName(e.target.value)}
                  className="w-full rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
                {searchName && (
                  <button
                    onClick={() => setSearchName("")}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600"
                  >
                    ✕
                  </button>
                )}
              </div>
            </div>

            {/* 2. Priority Filter */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Priority
              </label>
              <select
                value={filterPriority}
                onChange={(e) => setFilterPriority(e.target.value)}
                className="w-full rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-800 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="all">All Priorities</option>
                <option value="critical">Critical (Highest)</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </div>

            {/* 3. Status Filter */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Status
              </label>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="w-full rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-800 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="all">All Statuses</option>
                <option value="pending">Pending</option>
                <option value="assigned">Assigned</option>
                <option value="in progress">In Progress</option>
                <option value="resolved">Resolved</option>
                <option value="closed">Closed</option>
              </select>
            </div>

            {/* 4. Category Filter */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Category
              </label>
              <select
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
                className="w-full rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-800 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                {categories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat === "all" ? "All Categories" : cat}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Active filter summary & reset */}
          {(filterPriority !== "all" ||
            filterStatus !== "all" ||
            filterCategory !== "all" ||
            searchName.trim()) && (
            <div className="mt-3 flex items-center justify-between border-t border-slate-200 pt-2 text-xs">
              <span className="text-slate-600">
                Filtered: <strong>{filteredTickets.length}</strong> of{" "}
                <strong>{tickets.length}</strong> service requests
              </span>
              <button
                onClick={() => {
                  setFilterPriority("all");
                  setFilterStatus("all");
                  setFilterCategory("all");
                  setSearchName("");
                }}
                className="font-medium text-blue-600 hover:text-blue-800 underline"
              >
                Reset All Filters
              </button>
            </div>
          )}
        </div>

        {loading ? (
          <div className="py-12 text-center text-sm text-slate-500">Loading service requests...</div>
        ) : filteredTickets.length === 0 ? (
          <div className="py-12 text-center text-sm text-slate-400">
            No service requests match the selected filters.
          </div>
        ) : (
          <div className="space-y-4">
            {filteredTickets.map((t) => {
              const isUnassigned = !t.staff_id || (t.staff_name || "").toLowerCase() === "unassigned";
              return (
                <div
                  key={`${t.request_id}-${t.assignment_id || "unassigned"}`}
                  className={`rounded-lg border bg-white p-5 transition-shadow hover:shadow-md ${
                    isUnassigned ? "border-amber-300 bg-amber-50/20" : "border-slate-200"
                  }`}
                >
                  <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                    {/* Ticket Details */}
                    <div className="space-y-2 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono text-xs font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                          SR #{t.request_id} (CMP #{t.complaint_id})
                        </span>
                        <span className="text-xs font-medium text-slate-500">• {t.category_name}</span>

                        {/* Unassigned badge */}
                        {isUnassigned && (
                          <span className="rounded bg-rose-100 text-rose-700 border border-rose-300 px-2 py-0.5 text-[10px] font-bold uppercase">
                            ⚠️ Unassigned
                          </span>
                        )}

                        <span
                          className={`rounded px-2 py-0.5 text-[10px] font-bold uppercase ${
                            t.priority_status === "Critical"
                              ? "bg-red-100 text-red-700 border border-red-200"
                              : t.priority_status === "High"
                              ? "bg-orange-100 text-orange-700 border border-orange-200"
                              : t.priority_status === "Medium"
                              ? "bg-amber-100 text-amber-700 border border-amber-200"
                              : "bg-emerald-100 text-emerald-700 border border-emerald-200"
                          }`}
                        >
                          Priority: {t.priority_status}
                        </span>
                        <span
                          className={`rounded px-2 py-0.5 text-[10px] font-bold uppercase ${
                            t.status === "In Progress"
                              ? "bg-violet-100 text-violet-700 border border-violet-200"
                              : t.status === "Completed" || t.status === "Resolved"
                              ? "bg-emerald-100 text-emerald-700 border border-emerald-200"
                              : "bg-blue-100 text-blue-700 border border-blue-200"
                          }`}
                        >
                          Status: {t.status}
                        </span>
                      </div>

                      <h4 className="text-sm font-semibold text-slate-900">{t.subject}</h4>
                      <p className="text-xs text-slate-600 line-clamp-2">{t.description}</p>

                      <div className="flex flex-wrap items-center gap-4 text-[11px] text-slate-500 pt-1 border-t border-slate-50">
                        <span>
                          Complainant: <strong className="text-slate-700">{t.submitter_name || "Student"}</strong>
                        </span>
                        <span>
                          Assigned To: <strong className="text-slate-700">{t.staff_name}</strong> {t.designation && t.designation !== "Unassigned" ? `(${t.designation})` : ""}
                        </span>
                        {t.due_date && <span>Due Date: <strong>{t.due_date}</strong></span>}
                        {t.remarks && (
                          <span className="text-slate-400 italic max-w-md truncate" title={t.remarks}>
                            Notes: {t.remarks}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Operational Action Buttons */}
                    <div className="flex flex-wrap items-center gap-2 pt-2 lg:pt-0 lg:flex-col lg:items-end">
                      {/* Button 1: Start Progress */}
                      {t.status.toLowerCase() !== "in progress" && (
                        <button
                          onClick={() => handleStartProgress(t)}
                          disabled={actionLoading}
                          className="rounded-md bg-violet-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-violet-700 transition-colors flex items-center gap-1.5"
                          title="Mark ticket as active in progress"
                        >
                          ▶ Start Progress
                        </button>
                      )}

                      {/* Button 2: Peer Escalate */}
                      <button
                        onClick={() => openPeerEscalation(t)}
                        disabled={actionLoading}
                        className="rounded-md bg-amber-500 px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-amber-600 transition-colors flex items-center gap-1.5"
                        title="Escalate horizontally to another staff member in the same department"
                      >
                        👥 Peer Escalate
                      </button>

                      {/* Button 3: Escalate to Manager (Removed for Manager roleId === 3) */}
                      {effectiveRoleId !== 3 && (
                        <button
                          onClick={() => openManagerEscalation(t)}
                          disabled={actionLoading}
                          className="rounded-md bg-red-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-red-700 transition-colors flex items-center gap-1.5"
                          title="Escalate vertically to departmental manager with priority elevation"
                        >
                          ⬆ Escalate to Manager
                        </button>
                      )}

                      {/* Button 4: Resolve Ticket */}
                      <button
                        onClick={() => {
                          setResolutionNotes("");
                          setResolveModal(t);
                        }}
                        disabled={actionLoading}
                        className="rounded-md bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-emerald-700 transition-colors flex items-center gap-1.5"
                        title="Resolve this ticket and mark complaint as solved"
                      >
                        ✓ Mark Solved
                      </button>

                      {/* Button 5: View Escalation Audit Trail */}
                      <button
                        onClick={() => openHistory(t)}
                        className="rounded-md border border-slate-300 bg-white px-2.5 py-1 text-[11px] font-medium text-slate-600 hover:bg-slate-50 transition-colors"
                        title="Inspect permanent audit trail in escalation_logs"
                      >
                        📜 Audit Logs
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* MODAL 1: Peer or Manager Escalation */}
      {escalateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-2xl border border-slate-100">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900">
                {escalateModal.type === "peer" ? "👥 Escalate to Peer Staff" : "⬆ Escalate to Department Manager"}
              </h3>
              <button
                onClick={() => setEscalateModal(null)}
                className="text-slate-400 hover:text-slate-600 font-bold text-lg"
              >
                ✕
              </button>
            </div>

            <div className="mt-4 space-y-4">
              <div className="rounded bg-slate-50 p-3 text-xs text-slate-600">
                <p>
                  <strong>Ticket:</strong> #{escalateModal.ticket.request_id} — {escalateModal.ticket.subject}
                </p>
                <p>
                  <strong>Currently Assigned:</strong> {escalateModal.ticket.staff_name} (
                  {escalateModal.ticket.designation})
                </p>
              </div>

              {escalateModal.type === "peer" ? (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Select Available Staff:
                  </label>
                  {eligibleStaff.length === 0 ? (
                    <p className="text-xs text-amber-600">No staff currently available.</p>
                  ) : (
                    <select
                      value={targetStaffId}
                      onChange={(e) => setTargetStaffId(e.target.value)}
                      className="w-full rounded border border-slate-300 px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-amber-500"
                    >
                      {eligibleStaff.map((s) => (
                        <option key={s.staff_id} value={s.staff_id}>
                          {s.full_name} ({s.department} • {s.designation} — {s.availability_status})
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              ) : (
                <div className="rounded border border-red-100 bg-red-50/50 p-3 text-xs text-red-800">
                  <p className="font-semibold">⚠️ Manager Escalation Notice:</p>
                  <p className="mt-1">
                    This ticket will be reassigned directly to the <strong>Department Manager</strong>. The ticket
                    priority will be automatically elevated (e.g. Medium ➔ High or High ➔ Critical), and permanent audit
                    logs will be recorded in <code>escalation_logs</code>.
                  </p>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Escalation Reason / Justification <span className="text-red-500">*</span>:
                </label>
                <textarea
                  rows={3}
                  value={escalationReason}
                  onChange={(e) => setEscalationReason(e.target.value)}
                  placeholder="Explain why this ticket is being escalated (e.g., requires specialized tools, managerial budget approval, or workload transfer)..."
                  className="w-full rounded border border-slate-300 p-2 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEscalateModal(null)}
                  className="rounded border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={submitEscalation}
                  disabled={actionLoading || (escalateModal.type === "peer" && !targetStaffId)}
                  className={`rounded px-4 py-1.5 text-xs font-bold text-white shadow transition-colors ${
                    escalateModal.type === "peer"
                      ? "bg-amber-600 hover:bg-amber-700"
                      : "bg-red-600 hover:bg-red-700"
                  }`}
                >
                  {actionLoading ? "Processing..." : "Confirm Escalation"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: Resolve Complaint */}
      {resolveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-2xl border border-slate-100">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900">✓ Mark Complaint as Resolved</h3>
              <button
                onClick={() => setResolveModal(null)}
                className="text-slate-400 hover:text-slate-600 font-bold text-lg"
              >
                ✕
              </button>
            </div>

            <div className="mt-4 space-y-4">
              <div className="rounded bg-emerald-50 p-3 text-xs text-emerald-800">
                <p>
                  <strong>Ticket:</strong> #{resolveModal.request_id} — {resolveModal.subject}
                </p>
                <p className="mt-1">
                  Resolving this will update both <code>complaints.status = 'Resolved'</code> and{" "}
                  <code>service_request.status = 'completed'</code>, close any open escalation audit records, and notify the
                  student.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Resolution Notes <span className="text-red-500">*</span>:
                </label>
                <textarea
                  rows={3}
                  value={resolutionNotes}
                  onChange={(e) => setResolutionNotes(e.target.value)}
                  placeholder="Describe the actions taken to solve this issue (e.g., Replaced fuse capacitor, tested circuits, confirmed normal operation)..."
                  className="w-full rounded border border-slate-300 p-2 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setResolveModal(null)}
                  className="rounded border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={submitResolution}
                  disabled={actionLoading || !resolutionNotes.trim()}
                  className="rounded bg-emerald-600 px-4 py-1.5 text-xs font-bold text-white shadow hover:bg-emerald-700 transition-colors"
                >
                  {actionLoading ? "Saving..." : "Confirm Resolution"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: Audit Logs Drawer */}
      {historyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-2xl rounded-xl bg-white p-6 shadow-2xl border border-slate-100">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  📜 Escalation Audit Trail — Ticket #{historyModal.request_id}
                </h3>
                <p className="text-xs text-slate-500">{historyModal.subject}</p>
              </div>
              <button
                onClick={() => setHistoryModal(null)}
                className="text-slate-400 hover:text-slate-600 font-bold text-lg"
              >
                ✕
              </button>
            </div>

            <div className="mt-4 max-h-96 overflow-y-auto space-y-3">
              {auditLogs.length === 0 ? (
                <p className="py-8 text-center text-xs text-slate-400">No escalation logs recorded for this ticket.</p>
              ) : (
                auditLogs.map((log) => (
                  <div key={log.escalation_id} className="rounded-lg border border-slate-200 bg-slate-50/50 p-4 text-xs space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-800">
                        {log.escalation_type === "staff_to_manager" ? "⬆ Staff ➔ Manager" : "👥 Peer Reassignment"}
                      </span>
                      <span className="text-[10px] text-slate-400">{log.escalated_at}</span>
                    </div>
                    <p className="text-slate-600">
                      <strong>Transfer:</strong> {log.from_person} ➔ {log.to_person}
                    </p>
                    {log.priority_before && (
                      <p className="text-slate-600">
                        <strong>Priority Shift:</strong> {log.priority_before} ➔{" "}
                        <span className="text-red-600 font-bold">{log.priority_after}</span>
                      </p>
                    )}
                    <p className="text-slate-700 bg-white p-2 rounded border border-slate-200 mt-1">
                      <strong>Reason:</strong> {log.reason}
                    </p>
                    <div className="flex items-center justify-between pt-1 text-[10px]">
                      <span className="font-mono text-slate-400">Log #{log.escalation_id}</span>
                      <span className={`font-semibold ${log.status === "resolved" ? "text-emerald-600" : "text-amber-600"}`}>
                        Status: {log.status}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="mt-4 flex justify-end border-t border-slate-100 pt-3">
              <button
                onClick={() => setHistoryModal(null)}
                className="rounded border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

