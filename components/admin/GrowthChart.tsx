export function GrowthChart({ data }: { data: { label: string; count: number }[] }) {
  const max = Math.max(1, ...data.map((d) => d.count));

  return (
    <div className="flex h-40 items-end gap-2">
      {data.map((d) => (
        <div key={d.label} className="flex flex-1 flex-col items-center gap-2">
          <div
            className="w-full rounded-t-lg bg-accent"
            style={{ height: `${Math.max(4, (d.count / max) * 120)}px` }}
            title={`${d.label}: ${d.count}`}
          />
          <p className="text-[10px] text-muted">{d.label}</p>
        </div>
      ))}
    </div>
  );
}
