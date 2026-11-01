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

const STATUS_COLORS = {
  Pending: "#f59e0b",
  pending: "#f59e0b",
  Assigned: "#3b82f6",
  assigned: "#3b82f6",
  "In Progress": "#8b5cf6",
  "in progress": "#8b5cf6",
  Resolved: "#10b981",
  resolved: "#10b981",
  Closed: "#64748b",
  closed: "#64748b",
};

const PRIORITY_COLORS = {
  Critical: "#dc2626",
  critical: "#dc2626",
  High: "#f97316",
  high: "#f97316",
  Medium: "#eab308",
  medium: "#eab308",
  Low: "#22c55e",
  low: "#22c55e",
};

function ChartBox({ title, children, empty }) {
  return (
    <div className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-100">
      <h3 className="mb-3 text-sm font-semibold text-slate-700">{title}</h3>
      {empty ? (
        <div className="flex h-64 items-center justify-center text-sm text-slate-400">No data available</div>
      ) : children}
    </div>
  );
}

export default function RoleDashboardCharts({ data }) {
  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
      <ChartBox title="Complaints by Status" empty={!data.status_distribution?.length}>
        <ResponsiveContainer width="100%" height={260}>
          <PieChart>
            <Pie
              data={data.status_distribution}
              dataKey="count"
              nameKey="status"
              cx="50%"
              cy="50%"
              outerRadius={90}
              label={(entry) => `${entry.status}: ${entry.count}`}
            >
              {data.status_distribution.map((entry) => (
                <Cell key={entry.status} fill={STATUS_COLORS[entry.status] || "#94a3b8"} />
              ))}
            </Pie>
            <Tooltip />
          </PieChart>
        </ResponsiveContainer>
      </ChartBox>

      <ChartBox title="Complaints by Category" empty={!data.category_distribution?.length}>
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={data.category_distribution} layout="vertical" margin={{ left: 20, right: 12 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis type="number" allowDecimals={false} />
            <YAxis type="category" dataKey="category_name" width={120} tick={{ fontSize: 11 }} />
            <Tooltip />
            <Bar dataKey="count" fill="#3b82f6" radius={[0, 4, 4, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </ChartBox>

      <ChartBox title="Priority Distribution" empty={!data.priority_distribution?.length}>
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={data.priority_distribution}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="priority" tick={{ fontSize: 11 }} />
            <YAxis allowDecimals={false} />
            <Tooltip />
            <Bar dataKey="count" radius={[4, 4, 0, 0]}>
              {data.priority_distribution.map((entry) => (
                <Cell key={entry.priority} fill={PRIORITY_COLORS[entry.priority] || "#94a3b8"} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </ChartBox>

      <ChartBox title="Resolution Time" empty={!data.kpis?.avg_resolution_hours}>
        <div className="flex h-64 items-center justify-center">
          <div className="text-center">
            <p className="text-4xl font-bold text-slate-900">
              {data.kpis?.avg_resolution_hours ?? "—"}
            </p>
            <p className="mt-2 text-sm text-slate-500">Average resolution time in hours</p>
          </div>
        </div>
      </ChartBox>
    </div>
  );
}
