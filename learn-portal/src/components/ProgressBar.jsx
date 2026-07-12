export default function ProgressBar({ percent, label }) {
  const clamped = Math.max(0, Math.min(100, percent ?? 0));

  return (
    <div>
      {label && (
        <div className="progress-label">
          <span>{label}</span>
          <span>{clamped}%</span>
        </div>
      )}
      <div className="progress-bar">
        <div className="progress-bar__fill" style={{ width: `${clamped}%` }} />
      </div>
    </div>
  );
}
