// Single KPI stat card. Accent color is passed per-card so callers can
// color-code (e.g. amber for pending, red for escalated) without this
// component hardcoding a status->color map itself.
export default function KPICard({ label, value, isLoading, accentClass = "border-slate-300", suffix = "" }) {
  return (
    <div className={`rounded-lg border-l-4 ${accentClass} bg-white p-4 shadow-sm`}>
      <p className="text-sm font-medium text-slate-500">{label}</p>
      {isLoading ? (
        <div className="mt-2 h-8 w-16 animate-pulse rounded bg-slate-200" />
      ) : (
        <p className="mt-1 text-2xl font-semibold text-slate-900">
          {value ?? 0}
          {suffix}
        </p>
      )}
    </div>
  );
}
