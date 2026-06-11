export const Loading = ({ label = "Loading" }) => (
  <div className="loading-panel">
    <span className="loader" aria-hidden="true" />
    <span>{label}</span>
  </div>
);
