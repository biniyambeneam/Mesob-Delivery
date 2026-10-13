export default function EmptyState({ title, description }) {
  return (
    <div className="soft-panel w-full rounded-3xl px-5 py-6 text-center md:rounded-2xl md:p-6">
      <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
      <p className="mt-2 text-sm text-slate-600">{description}</p>
    </div>
  );
}
