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
import ChartCard from "./ChartCard";
import ChartErrorBoundary from "./ChartErrorBoundary";

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

export default function DashboardCharts({ summary }) {
  const { status_distribution, category_distribution, priority_distribution, complaints_over_time, escalation_stats } =
    summary;

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <ChartErrorBoundary>
        <ChartCard title="Complaints by Status" isEmpty={status_distribution.length === 0}>
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie
                data={status_distribution}
                dataKey="count"
                nameKey="status"
                cx="50%"
                cy="50%"
                outerRadius={90}
                label={(entry) => `${entry.status}: ${entry.count}`}
              >
                {status_distribution.map((entry) => (
                  <Cell key={entry.status} fill={STATUS_COLORS[entry.status] || "#94a3b8"} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>
      </ChartErrorBoundary>

      <ChartErrorBoundary>
        <ChartCard title="Complaints by Category" isEmpty={category_distribution.length === 0}>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={category_distribution} layout="vertical" margin={{ left: 24 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" allowDecimals={false} />
              <YAxis type="category" dataKey="category_name" width={120} tick={{ fontSize: 12 }} />
              <Tooltip />
              <Bar dataKey="count" fill="#3b82f6" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </ChartErrorBoundary>

      <ChartErrorBoundary>
        <ChartCard title="Priority Distribution" isEmpty={priority_distribution.length === 0}>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={priority_distribution}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="priority" tick={{ fontSize: 12 }} />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                {priority_distribution.map((entry) => (
                  <Cell key={entry.priority} fill={PRIORITY_COLORS[entry.priority] || "#94a3b8"} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </ChartErrorBoundary>

      <ChartErrorBoundary>
        <ChartCard title="Complaints Over Time" isEmpty={complaints_over_time.length === 0}>
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={complaints_over_time}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="day" tick={{ fontSize: 11 }} />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Line type="monotone" dataKey="count" stroke="#3b82f6" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>
      </ChartErrorBoundary>

      <ChartErrorBoundary>
        <ChartCard title="Escalation Status" isEmpty={escalation_stats.total_escalations === 0}>
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie
                data={[
                  { name: "Open", value: escalation_stats.open_escalations },
                  { name: "Resolved", value: escalation_stats.resolved_escalations },
                ]}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={90}
                label={(entry) => `${entry.name}: ${entry.value}`}
              >
                <Cell fill="#f59e0b" />
                <Cell fill="#10b981" />
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>
      </ChartErrorBoundary>
    </div>
  );
}
