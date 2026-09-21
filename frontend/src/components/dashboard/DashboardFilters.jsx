import { useEffect, useState } from "react";
import { fetchCategoryOptions } from "../../api/dashboardApi";

const STATUS_OPTIONS = ["Pending", "Assigned", "In Progress", "Resolved", "Closed"];
const PRIORITY_OPTIONS = ["Critical", "High", "Medium", "Low"];

export default function DashboardFilters({ filters, onChange }) {
  const [categories, setCategories] = useState([]);

  useEffect(() => {
    fetchCategoryOptions()
      .then(setCategories)
      .catch(() => setCategories([])); // Filter bar degrades gracefully - dropdown just stays empty
  }, []);

  const update = (key, value) => onChange({ ...filters, [key]: value || undefined });

  return (
    <div className="flex flex-wrap items-end gap-3 rounded-lg bg-white p-4 shadow-sm">
      <div>
        <label className="block text-xs font-medium text-slate-500">From</label>
        <input
          type="date"
          value={filters.dateFrom || ""}
          onChange={(e) => update("dateFrom", e.target.value)}
          className="mt-1 rounded border border-slate-300 px-2 py-1 text-sm"
        />
      </div>
      <div>
        <label className="block text-xs font-medium text-slate-500">To</label>
        <input
          type="date"
          value={filters.dateTo || ""}
          onChange={(e) => update("dateTo", e.target.value)}
          className="mt-1 rounded border border-slate-300 px-2 py-1 text-sm"
        />
      </div>
      <div>
        <label className="block text-xs font-medium text-slate-500">Status</label>
        <select
          value={filters.status || ""}
          onChange={(e) => update("status", e.target.value)}
          className="mt-1 rounded border border-slate-300 px-2 py-1 text-sm"
        >
          <option value="">All</option>
          {STATUS_OPTIONS.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="block text-xs font-medium text-slate-500">Category</label>
        <select
          value={filters.categoryId || ""}
          onChange={(e) => update("categoryId", e.target.value)}
          className="mt-1 rounded border border-slate-300 px-2 py-1 text-sm"
        >
          <option value="">All</option>
          {categories.map((c) => (
            <option key={c.category_id} value={c.category_id}>
              {c.category_name}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="block text-xs font-medium text-slate-500">Priority</label>
        <select
          value={filters.priority || ""}
          onChange={(e) => update("priority", e.target.value)}
          className="mt-1 rounded border border-slate-300 px-2 py-1 text-sm"
        >
          <option value="">All</option>
          {PRIORITY_OPTIONS.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>
      </div>
      {(filters.dateFrom || filters.dateTo || filters.status || filters.categoryId || filters.priority) && (
        <button
          onClick={() => onChange({})}
          className="rounded border border-slate-300 px-3 py-1 text-sm text-slate-600 hover:bg-slate-50"
        >
          Clear filters
        </button>
      )}
    </div>
  );
}
