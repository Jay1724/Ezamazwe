export function ProgressBar({ percent }: { percent: number }) {
  const clamped = Math.max(0, Math.min(100, percent));
  return (
    <div className="stack-row" style={{ gap: 10 }}>
      <div className="progress-track" style={{ flexGrow: 1 }}>
        <div className="progress-fill" style={{ width: `${clamped}%` }} />
      </div>
      <span className="mono text-soft" style={{ fontSize: 12, minWidth: 34, textAlign: 'right' }}>
        {Math.round(clamped)}%
      </span>
    </div>
  );
}
