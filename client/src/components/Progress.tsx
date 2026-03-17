type ProgressProps = {
  percent: number;
};

export function Progress({ percent }: ProgressProps) {
  const safePercent = Math.max(0, Math.min(100, percent));

  return (
    <div className="flex items-center gap-3 min-w-20">
      <div className="relative h-6 w-20 rounded bg-primary/40 overflow-hidden">
        {/* battery fill */}
        <div
          className={`h-full rounded bg-primary transition-all duration-300`}
          style={{ width: `${safePercent}%` }}
        />

        <span
          className={`absolute inset-0 inline-flex justify-center rounded-md px-2 py-1 text-xs font-semibold text-white`}
        >
          {safePercent}%
        </span>
      </div>
    </div>
  );
}