const labels = {
  active: "Active",
  inactive: "Inactive",
  on_hold: "On hold",
  completed: "Completed",
  draft: "Draft",
  submitted: "Submitted",
  client_viewed: "Client viewed",
  contractor: "Contractor",
  client: "Client",
  supervisor: "Supervisor",
  admin: "Admin"
};

export const StatusBadge = ({ value }) => {
  const className = `status status-${String(value || "neutral").replace("_", "-")}`;
  return <span className={className}>{labels[value] || value || "Unknown"}</span>;
};
