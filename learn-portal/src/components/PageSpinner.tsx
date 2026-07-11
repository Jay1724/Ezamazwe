export function PageSpinner() {
  return (
    <div className="wrap section" style={{ display: 'flex', justifyContent: 'center', padding: '96px 0' }}>
      <div className="spinner" role="status" aria-label="Loading" />
    </div>
  );
}
