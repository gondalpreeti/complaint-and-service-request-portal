export default function ChartCard({ title, isEmpty, children }) {
  return (
    <div className="rounded-lg bg-white p-4 shadow-sm">
      <h3 className="mb-3 text-sm font-semibold text-slate-700">{title}</h3>
      {isEmpty ? (
        <div className="flex h-64 items-center justify-center text-sm text-slate-400">No data for this range</div>
      ) : (
        children
      )}
    </div>
  );
}
