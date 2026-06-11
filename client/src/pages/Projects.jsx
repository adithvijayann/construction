import {
  Ban,
  BriefcaseBusiness,
  CalendarDays,
  Camera,
  CheckCircle2,
  ClipboardList,
  Edit3,
  FilePlus2,
  Filter,
  FolderKanban,
  Hammer,
  KeyRound,
  MapPin,
  PackagePlus,
  Plus,
  RefreshCw,
  Route,
  Search,
  ShieldCheck,
  Trash2,
  UploadCloud,
  X,
  UserPlus,
  Users,
  Wallet
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { api, assetUrl } from "../api/http.js";
import { Loading } from "../components/Loading.jsx";
import { StatusBadge } from "../components/StatusBadge.jsx";
import { useAuth } from "../context/AuthContext.jsx";

const today = () => new Date().toISOString().slice(0, 10);

const money = (value) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0
  }).format(value || 0);

const dateLabel = (value) =>
  value
    ? new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(value))
    : "Not set";

const Field = ({ label, children, className = "" }) => (
  <label className={className}>
    {label}
    {children}
  </label>
);

const SearchBar = ({ value, onChange }) => (
  <div className="search-box">
    <Search size={17} />
    <input value={value} onChange={(event) => onChange(event.target.value)} placeholder="Search" />
  </div>
);

const humanize = (value = "") => value.replace(/_/g, " ").replace(/\b\w/g, (char) => char.toUpperCase()) || "Not set";

const initials = (value = "") =>
  value
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("") || "NA";

const credentialNotice = (label, email, temporaryPassword = "") => {
  const passwordLine = temporaryPassword ? ` Temporary password: ${temporaryPassword}` : "";
  if (email?.sending) return `${label} created and email delivery started.${passwordLine}`;
  if (email?.sent) return `${label} created and credential email sent.${passwordLine}`;
  return `${label} created, but email was not sent: ${email?.reason || "check email settings"}.${passwordLine}`;
};

const contractorNotice = (data) => {
  const passwordLine = data.temporaryPassword ? ` Temporary password: ${data.temporaryPassword}` : "";
  if (data.reusedUser && data.email?.sending) return `Contractor created under the existing login and notification email delivery started.${passwordLine}`;
  if (data.email?.sending) return `Contractor created and notification email delivery started.${passwordLine}`;
  if (data.reusedUser && data.email?.sent) return `Contractor created under the existing login and notification email sent.${passwordLine}`;
  if (data.email?.sent) return `Contractor created and notification email sent.${passwordLine}`;
  if (data.reusedUser) return `Contractor created under the existing login, but email was not sent: ${data.email?.reason || "check email settings"}.${passwordLine}`;
  return `${credentialNotice("Contractor", data.email)}${passwordLine}`;
};

const AdminDashboard = () => {
  const [overview, setOverview] = useState(null);
  const [contractors, setContractors] = useState([]);
  const [query, setQuery] = useState("");
  const [form, setForm] = useState({ name: "", email: "", companyName: "", phone: "", address: "" });
  const [editingId, setEditingId] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [saving, setSaving] = useState(false);
  const [actionBusy, setActionBusy] = useState("");

  const load = async () => {
    const [overviewResponse, contractorsResponse] = await Promise.all([api.get("/admin/overview"), api.get("/admin/contractors")]);
    setOverview(overviewResponse.data.overview);
    setContractors(contractorsResponse.data.contractors || []);
  };

  useEffect(() => {
    load().catch((err) => setError(err.response?.data?.message || "Unable to load admin dashboard"));
  }, []);

  const filtered = contractors.filter((contractor) => {
    const text = `${contractor.companyName} ${contractor.user?.name} ${contractor.user?.email}`.toLowerCase();
    return text.includes(query.toLowerCase());
  });

  const resetForm = () => {
    setEditingId("");
    setForm({ name: "", email: "", companyName: "", phone: "", address: "" });
  };

  const startEdit = (contractor) => {
    setError("");
    setNotice("");
    setEditingId(contractor.id);
    setForm({
      name: contractor.user?.name || "",
      email: contractor.user?.email || "",
      companyName: contractor.companyName || "",
      phone: contractor.phone || "",
      address: contractor.address || ""
    });
  };

  const submit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError("");
    setNotice("");
    try {
      const { data } = editingId ? await api.put(`/admin/contractors/${editingId}`, form) : await api.post("/admin/contractors", form);
      setNotice(editingId ? "Contractor details updated." : contractorNotice(data));
      resetForm();
      await load();
    } catch (err) {
      setError(err.response?.data?.message || (editingId ? "Unable to update contractor" : "Unable to create contractor"));
    } finally {
      setSaving(false);
    }
  };

  const deactivate = async (contractor) => {
    setActionBusy(`deactivate-${contractor.id}`);
    setError("");
    setNotice("");
    try {
      await api.patch(`/admin/contractors/${contractor.id}/deactivate`);
      setNotice("Contractor deactivated.");
      if (editingId === contractor.id) resetForm();
      await load();
    } catch (err) {
      setError(err.response?.data?.message || "Unable to deactivate contractor");
    } finally {
      setActionBusy("");
    }
  };

  const removeContractor = async (contractor) => {
    if (!window.confirm(`Delete contractor "${contractor.companyName}"? This removes it from the admin list and disables the login if no other contractor uses it.`)) return;
    setActionBusy(`delete-${contractor.id}`);
    setError("");
    setNotice("");
    try {
      await api.delete(`/admin/contractors/${contractor.id}`);
      setNotice("Contractor deleted.");
      if (editingId === contractor.id) resetForm();
      await load();
    } catch (err) {
      setError(err.response?.data?.message || "Unable to delete contractor");
    } finally {
      setActionBusy("");
    }
  };

  return (
    <section className="content-stack">
      <div className="metric-grid">
        <article className="metric-tile"><Users size={19} /><span>Users</span><strong>{overview?.users || 0}</strong></article>
        <article className="metric-tile"><BriefcaseBusiness size={19} /><span>Contractors</span><strong>{overview?.contractors || 0}</strong></article>
        <article className="metric-tile"><FolderKanban size={19} /><span>Projects</span><strong>{overview?.projects || 0}</strong></article>
        <article className="metric-tile"><Wallet size={19} /><span>Expenses</span><strong>{money(overview?.expenses)}</strong></article>
      </div>
      {error ? <p className="form-error">{error}</p> : null}
      {notice ? <p className="form-success">{notice}</p> : null}
      <div className="two-column">
        <form className="panel form-grid compact-form" onSubmit={submit}>
          <div className="panel-heading wide-field">
            <h3>{editingId ? "Edit contractor" : "Add contractor"}</h3>
            {editingId ? <button className="icon-button" type="button" onClick={resetForm} title="Cancel edit"><X size={18} /></button> : <UserPlus size={18} />}
          </div>
          <Field label="Name"><input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} required /></Field>
          <Field label="Email"><input type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} required /></Field>
          <Field label="Company"><input value={form.companyName} onChange={(event) => setForm({ ...form, companyName: event.target.value })} required /></Field>
          <Field label="Phone"><input value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} /></Field>
          <Field label="Address" className="wide-field"><textarea rows={3} value={form.address} onChange={(event) => setForm({ ...form, address: event.target.value })} /></Field>
          <button className="primary-button" type="submit" disabled={saving}>{editingId ? <Edit3 size={18} /> : <Plus size={18} />}{saving ? "Saving" : editingId ? "Update contractor" : "Create contractor"}</button>
        </form>
        <div className="panel">
          <div className="panel-heading"><h3>Contractors</h3><SearchBar value={query} onChange={setQuery} /></div>
          <div className="simple-table">
            {filtered.map((contractor) => (
              <div className="simple-row" key={contractor.id}>
                <span><strong>{contractor.companyName}</strong><small>{contractor.user?.name} · {contractor.user?.email}</small></span>
                <span className="row-actions">
                  <StatusBadge value={contractor.isActive === false ? "inactive" : contractor.user?.status || "active"} />
                  <button className="icon-button" type="button" onClick={() => startEdit(contractor)} title="Edit contractor"><Edit3 size={17} /></button>
                  <button className="icon-button" type="button" onClick={() => deactivate(contractor)} disabled={actionBusy === `deactivate-${contractor.id}` || contractor.isActive === false} title="Deactivate contractor"><Ban size={17} /></button>
                  <button className="icon-button danger" type="button" onClick={() => removeContractor(contractor)} disabled={actionBusy === `delete-${contractor.id}`} title="Delete contractor"><Trash2 size={17} /></button>
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

const ContractorDashboard = () => {
  const [clients, setClients] = useState([]);
  const [supervisors, setSupervisors] = useState([]);
  const [projects, setProjects] = useState([]);
  const [expenses, setExpenses] = useState({ summary: null, expenses: [] });
  const [query, setQuery] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [saving, setSaving] = useState("");
  const [recentCredentials, setRecentCredentials] = useState([]);
  const [clientForm, setClientForm] = useState({ name: "", email: "", phone: "", address: "" });
  const [supervisorForm, setSupervisorForm] = useState({ name: "", email: "", phone: "", address: "", qualification: "", projectIds: [] });
  const [projectForm, setProjectForm] = useState({
    clientId: "",
    supervisorId: "",
    name: "",
    clientName: "",
    clientEmail: "",
    address: "",
    workLocation: "",
    startDate: today(),
    endDate: "",
    estimatedCost: "",
    projectStatus: "active",
    progressStatus: "planning",
    notes: "",
    plotPhoto: null,
    agreementFile: null
  });

  const load = async () => {
    const [clientsResponse, supervisorsResponse, projectsResponse, expensesResponse] = await Promise.all([
      api.get("/contractor/clients"),
      api.get("/contractor/supervisors"),
      api.get("/contractor/projects"),
      api.get("/contractor/expenses")
    ]);
    setClients(clientsResponse.data.clients || []);
    setSupervisors(supervisorsResponse.data.supervisors || []);
    setProjects(projectsResponse.data.projects || []);
    setExpenses(expensesResponse.data);
  };

  useEffect(() => {
    load().catch((err) => setError(err.response?.data?.message || "Unable to load contractor dashboard"));
  }, []);

  const rememberCredential = ({ role, user, temporaryPassword }) => {
    if (!temporaryPassword || !user?.email) return;
    setRecentCredentials((current) =>
      [
        {
          id: `${role}-${user.email}-${Date.now()}`,
          role,
          name: user.name || "",
          email: user.email,
          temporaryPassword
        },
        ...current
      ].slice(0, 6)
    );
  };

  const createClient = async (event) => {
    event.preventDefault();
    setSaving("client");
    setError("");
    setNotice("");
    try {
      const { data } = await api.post("/contractor/clients", clientForm);
      setNotice(credentialNotice("Client", data.email, data.temporaryPassword));
      setClientForm({ name: "", email: "", phone: "", address: "" });
      setClients((current) => [data.client, ...current]);
      rememberCredential({ role: "Client", user: data.client?.user, temporaryPassword: data.temporaryPassword });
    } catch (err) {
      setError(err.response?.data?.message || "Unable to create client");
    } finally {
      setSaving("");
    }
  };

  const createSupervisor = async (event) => {
    event.preventDefault();
    setSaving("supervisor");
    setError("");
    setNotice("");
    try {
      const { data } = await api.post("/contractor/supervisors", supervisorForm);
      setNotice(credentialNotice("Supervisor", data.email, data.temporaryPassword));
      setSupervisorForm({ name: "", email: "", phone: "", address: "", qualification: "", projectIds: [] });
      setSupervisors((current) => [data.supervisor, ...current]);
      rememberCredential({ role: "Supervisor", user: data.supervisor?.user, temporaryPassword: data.temporaryPassword });
    } catch (err) {
      setError(err.response?.data?.message || "Unable to create supervisor");
    } finally {
      setSaving("");
    }
  };

  const createProject = async (event) => {
    event.preventDefault();
    setSaving("project");
    setError("");
    setNotice("");
    try {
      const selectedClient = clients.find((client) => client.user?.id === projectForm.clientId);
      const body = new FormData();
      Object.entries({
        ...projectForm,
        clientName: projectForm.clientName || selectedClient?.user?.name || "",
        clientEmail: projectForm.clientEmail || selectedClient?.user?.email || "",
        supervisorId: projectForm.supervisorId || ""
      }).forEach(([key, value]) => {
        if (key !== "plotPhoto" && key !== "agreementFile") body.append(key, value ?? "");
      });
      if (projectForm.plotPhoto) body.append("plotPhoto", projectForm.plotPhoto);
      if (projectForm.agreementFile) body.append("agreementFile", projectForm.agreementFile);

      const { data } = await api.post("/contractor/projects", body, { headers: { "Content-Type": "multipart/form-data" } });
      setNotice("Project created.");
      setProjectForm({ ...projectForm, name: "", address: "", workLocation: "", estimatedCost: "", notes: "", plotPhoto: null, agreementFile: null });
      setProjects((current) => [data.project, ...current]);
    } catch (err) {
      setError(err.response?.data?.message || "Unable to create project");
    } finally {
      setSaving("");
    }
  };

  const filteredProjects = projects.filter((project) =>
    [
      project.name,
      project.workLocation,
      project.location,
      project.address,
      project.client?.name,
      project.clientName,
      project.supervisor?.name
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase()
      .includes(query.toLowerCase())
  );
  const activeProjects = projects.filter((project) => project.status === "active");
  const portfolioStats = {
    activeProjects: activeProjects.length,
    clients: clients.length,
    supervisors: supervisors.length,
    estimate: projects.reduce((sum, project) => sum + Number(project.estimatedCost || 0), 0)
  };
  const activityItems = [
    ...recentCredentials.map((credential) => ({
      id: credential.id,
      tone: credential.role === "Supervisor" ? "orange" : "blue",
      when: "Just now",
      title: `${credential.role} account ready`,
      text: `${credential.name || credential.email} can sign in with the generated credentials.`
    })),
    ...projects.slice(0, 4).map((project) => ({
      id: `project-${project.id}`,
      tone: project.progressStatus === "completed" ? "green" : project.progressStatus === "on_hold" ? "orange" : "blue",
      when: dateLabel(project.updatedAt || project.createdAt || project.startDate),
      title: project.name,
      text: `${humanize(project.progressStatus)} at ${project.workLocation || project.location || "site location"}`
    })),
    ...(expenses.expenses || []).slice(0, 3).map((expense) => ({
      id: `expense-${expense.id}`,
      tone: "slate",
      when: dateLabel(expense.expenseDate),
      title: expense.description,
      text: `${money(expense.amount)} recorded${expense.project?.name ? ` for ${expense.project.name}` : ""}.`
    }))
  ].slice(0, 8);

  return (
    <section id="contractor-dashboard-top" className="contractor-dashboard content-stack">
      <div className="contractor-hero">
        <div>
          <span className="contractor-kicker">Administrative Control</span>
          <h2>Contractor Dashboard</h2>
          <p>Project portfolio, teams, client accounts, and cost movement in one operational view.</p>
        </div>
        <div className="contractor-actions">
          <a className="industrial-action secondary" href="#contractor-supervisor-form"><UserPlus size={17} />Invite Supervisor</a>
          <a className="industrial-action secondary" href="#contractor-client-form"><Users size={17} />Add Client</a>
          <a className="industrial-action primary" href="#contractor-project-form"><Plus size={18} />New Project</a>
        </div>
      </div>
      <div className="contractor-stat-grid">
        <article className="contractor-stat stat-blue"><span>Active Projects</span><div><strong>{portfolioStats.activeProjects}</strong><small>{projects.length} total</small></div></article>
        <article className="contractor-stat stat-slate"><span>Total Clients</span><div><strong>{portfolioStats.clients}</strong><small>Portfolio accounts</small></div></article>
        <article className="contractor-stat stat-yellow"><span>Supervisors</span><div><strong>{portfolioStats.supervisors}</strong><small>Field coverage</small></div></article>
        <article className="contractor-stat stat-orange"><span>Estimated Value</span><div><strong>{money(portfolioStats.estimate)}</strong><small>Across projects</small></div></article>
      </div>
      {error ? <p className="form-error">{error}</p> : null}
      {notice ? <p className="form-success">{notice}</p> : null}
      {recentCredentials.length ? (
        <div className="panel">
          <div className="panel-heading"><h3>New account passwords</h3><KeyRound size={18} /></div>
          <div className="simple-table">
            {recentCredentials.map((credential) => (
              <div className="simple-row" key={credential.id}>
                <span><strong>{credential.role}: {credential.name || credential.email}</strong><small>{credential.email}</small></span>
                <code className="credential-code">{credential.temporaryPassword}</code>
              </div>
            ))}
          </div>
        </div>
      ) : null}
      <div className="two-column">
        <div className="content-stack">
          <form id="contractor-client-form" className="panel contractor-form-card form-grid compact-form" onSubmit={createClient}>
            <div className="panel-heading wide-field"><h3>Add client</h3><UserPlus size={18} /></div>
            <Field label="Name"><input value={clientForm.name} onChange={(event) => setClientForm({ ...clientForm, name: event.target.value })} required /></Field>
            <Field label="Email"><input type="email" value={clientForm.email} onChange={(event) => setClientForm({ ...clientForm, email: event.target.value })} required /></Field>
            <Field label="Phone"><input value={clientForm.phone} onChange={(event) => setClientForm({ ...clientForm, phone: event.target.value })} /></Field>
            <Field label="Address"><input value={clientForm.address} onChange={(event) => setClientForm({ ...clientForm, address: event.target.value })} /></Field>
            <button className="secondary-button" disabled={saving === "client"}><Plus size={17} />Add client</button>
          </form>
          <form id="contractor-supervisor-form" className="panel contractor-form-card form-grid compact-form" onSubmit={createSupervisor}>
            <div className="panel-heading wide-field"><h3>Add supervisor</h3><Hammer size={18} /></div>
            <Field label="Name"><input value={supervisorForm.name} onChange={(event) => setSupervisorForm({ ...supervisorForm, name: event.target.value })} required /></Field>
            <Field label="Phone"><input value={supervisorForm.phone} onChange={(event) => setSupervisorForm({ ...supervisorForm, phone: event.target.value })} /></Field>
            <Field label="Address"><input value={supervisorForm.address} onChange={(event) => setSupervisorForm({ ...supervisorForm, address: event.target.value })} /></Field>
            <Field label="Qualification"><input value={supervisorForm.qualification} onChange={(event) => setSupervisorForm({ ...supervisorForm, qualification: event.target.value })} /></Field>
            <Field label="Email"><input type="email" value={supervisorForm.email} onChange={(event) => setSupervisorForm({ ...supervisorForm, email: event.target.value })} required /></Field>
            <Field label="Projects" className="wide-field">
              <select
                multiple
                value={supervisorForm.projectIds}
                onChange={(event) =>
                  setSupervisorForm({
                    ...supervisorForm,
                    projectIds: Array.from(event.target.selectedOptions, (option) => option.value)
                  })
                }
              >
                {projects.map((project) => (
                  <option key={project.id} value={project.id}>{project.name}</option>
                ))}
              </select>
            </Field>
            <button className="secondary-button" disabled={saving === "supervisor"}><Plus size={17} />Add supervisor</button>
          </form>
          <div className="panel">
            <div className="panel-heading"><h3>Clients</h3><Users size={18} /></div>
            <div className="simple-table">
              {clients.map((client) => (
                <div className="simple-row" key={client.id}>
                  <span><strong>{client.user?.name || "Unnamed client"}</strong><small>{client.user?.email}</small></span>
                  <StatusBadge value={client.user?.status || "active"} />
                </div>
              ))}
              {!clients.length ? <p className="muted-line">No clients yet.</p> : null}
            </div>
          </div>
          <div className="panel">
            <div className="panel-heading"><h3>Supervisors</h3><Hammer size={18} /></div>
            <div className="simple-table">
              {supervisors.map((supervisor) => (
                <div className="simple-row" key={supervisor.id}>
                  <span><strong>{supervisor.user?.name || "Unnamed supervisor"}</strong><small>{supervisor.user?.email}</small></span>
                  <StatusBadge value={supervisor.user?.status || "active"} />
                </div>
              ))}
              {!supervisors.length ? <p className="muted-line">No supervisors yet.</p> : null}
            </div>
          </div>
        </div>
        <form id="contractor-project-form" className="panel contractor-form-card contractor-project-form form-grid compact-form" onSubmit={createProject}>
          <div className="panel-heading wide-field"><h3>Add project</h3><FilePlus2 size={18} /></div>
          <Field label="Client"><select value={projectForm.clientId} onChange={(event) => setProjectForm({ ...projectForm, clientId: event.target.value })} required><option value="">Select client</option>{clients.map((client) => <option key={client.id} value={client.user?.id}>{client.user?.name}</option>)}</select></Field>
          <Field label="Supervisor"><select value={projectForm.supervisorId} onChange={(event) => setProjectForm({ ...projectForm, supervisorId: event.target.value })}><option value="">Unassigned</option>{supervisors.map((supervisor) => <option key={supervisor.id} value={supervisor.user?.id}>{supervisor.user?.name}</option>)}</select></Field>
          <Field label="Project name"><input value={projectForm.name} onChange={(event) => setProjectForm({ ...projectForm, name: event.target.value })} required /></Field>
          <Field label="Work location"><input value={projectForm.workLocation} onChange={(event) => setProjectForm({ ...projectForm, workLocation: event.target.value })} required /></Field>
          <Field label="Address" className="wide-field"><textarea rows={2} value={projectForm.address} onChange={(event) => setProjectForm({ ...projectForm, address: event.target.value })} required /></Field>
          <Field label="Start date"><input type="date" value={projectForm.startDate} onChange={(event) => setProjectForm({ ...projectForm, startDate: event.target.value })} required /></Field>
          <Field label="End date"><input type="date" value={projectForm.endDate} onChange={(event) => setProjectForm({ ...projectForm, endDate: event.target.value })} /></Field>
          <Field label="Estimated cost"><input type="number" value={projectForm.estimatedCost} onChange={(event) => setProjectForm({ ...projectForm, estimatedCost: event.target.value })} required /></Field>
          <Field label="Status"><select value={projectForm.progressStatus} onChange={(event) => setProjectForm({ ...projectForm, progressStatus: event.target.value })}><option value="planning">Planning</option><option value="in_progress">In progress</option><option value="on_hold">On hold</option><option value="completed">Completed</option></select></Field>
          <Field label="Agreement JPG/PDF"><input type="file" accept=".jpg,.jpeg,.pdf" onChange={(event) => setProjectForm({ ...projectForm, agreementFile: event.target.files?.[0] || null })} /></Field>
          <Field label="Plot photo JPG"><input type="file" accept=".jpg,.jpeg" onChange={(event) => setProjectForm({ ...projectForm, plotPhoto: event.target.files?.[0] || null })} /></Field>
          <Field label="Notes" className="wide-field"><textarea rows={3} value={projectForm.notes} onChange={(event) => setProjectForm({ ...projectForm, notes: event.target.value })} /></Field>
          <button className="primary-button" disabled={saving === "project"}><Plus size={18} />Create project</button>
        </form>
      </div>
      <div className="contractor-overview-grid">
      <div id="contractor-portfolio" className="contractor-project-panel">
        <div className="panel-heading"><div><h3>Active Project Portfolio</h3><p className="muted-line">{filteredProjects.length} visible projects</p></div><SearchBar value={query} onChange={setQuery} /></div>
        <div className="contractor-project-grid">
          {filteredProjects.map((project) => {
            const clientName = project.client?.name || project.clientName || "Client";
            const supervisorName = project.supervisor?.name || "Supervisor";
            const statusText = humanize(project.progressStatus);
            return (
              <Link className="contractor-portfolio-card" to={`/projects/${project.id}`} key={project.id}>
                <div>
                  <div className="contractor-card-topline">
                    <span>Project</span>
                    <strong>
                      <i />
                      {statusText}
                    </strong>
                  </div>
                  <h3>{project.name}</h3>
                  <p>{project.workLocation || project.location || "Location not set"}</p>
                </div>
                <div className="contractor-card-footer">
                  <div className="contractor-avatar-stack" aria-label={`${clientName} and ${supervisorName}`}>
                    <span>{initials(clientName)}</span>
                    <span>{initials(supervisorName)}</span>
                    <em>{money(project.estimatedCost)}</em>
                  </div>
                  <span className="contractor-view-button">View Details</span>
                </div>
              </Link>
            );
          })}
          {!filteredProjects.length ? <div className="empty-state"><h3>No projects found</h3><p className="muted-line">Project details will appear here.</p></div> : null}
        </div>
      </div>
      <aside className="panel contractor-activity-panel">
        <div className="panel-heading"><div><h3>Recent Activity</h3><p className="muted-line">Latest portfolio signals</p></div><RefreshCw size={18} /></div>
        <div className="contractor-activity-list">
          {activityItems.map((item) => (
            <article className={`contractor-activity-item activity-${item.tone}`} key={item.id}>
              <span>{item.when}</span>
              <strong>{item.title}</strong>
              <p>{item.text}</p>
            </article>
          ))}
          {!activityItems.length ? <p className="muted-line">No activity yet.</p> : null}
        </div>
      </aside>
      </div>
      <div id="contractor-expense-summary" className="panel contractor-expense-panel">
        <div className="panel-heading"><h3>Expense summary</h3><Filter size={18} /></div>
        <div className="simple-table">
          {(expenses.expenses || []).map((expense) => (
            <div className="simple-row" key={expense.id}><span><strong>{expense.description}</strong><small>{expense.project?.name} · {dateLabel(expense.expenseDate)}</small></span><b>{money(expense.amount)}</b></div>
          ))}
        </div>
      </div>
    </section>
  );
};

const SupervisorDashboard = () => {
  const [projects, setProjects] = useState([]);
  const [workLogs, setWorkLogs] = useState([]);
  const [materialLogs, setMaterialLogs] = useState([]);
  const [progressUpdates, setProgressUpdates] = useState([]);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [saving, setSaving] = useState("");
  const [workerForm, setWorkerForm] = useState({ projectId: "", workerName: "", salary: "", date: today(), paymentType: "daily", logPeriod: "daily", notes: "" });
  const [materialForm, setMaterialForm] = useState({ projectId: "", materialName: "", quantity: "", unit: "", cost: "", date: today(), usagePeriod: "daily", notes: "" });
  const [progressForm, setProgressForm] = useState({ projectId: "", status: "in_progress", updateDate: today(), notes: "", photos: [] });

  const load = async () => {
    const [projectsResponse, workResponse, materialResponse, progressResponse] = await Promise.all([
      api.get("/supervisor/projects"),
      api.get("/supervisor/work-logs"),
      api.get("/supervisor/material-logs"),
      api.get("/supervisor/progress-updates")
    ]);
    setProjects(projectsResponse.data.projects || []);
    setWorkLogs(workResponse.data.workerLogs || []);
    setMaterialLogs(materialResponse.data.materialLogs || []);
    setProgressUpdates(progressResponse.data.progressUpdates || []);
  };

  useEffect(() => {
    load().catch((err) => setError(err.response?.data?.message || "Unable to load supervisor dashboard"));
  }, []);

  const submitWorker = async (event) => {
    event.preventDefault();
    setSaving("worker");
    setError("");
    try {
      await api.post("/supervisor/work-logs", workerForm);
      setNotice("Worker log saved.");
      setWorkerForm({ ...workerForm, workerName: "", salary: "", notes: "" });
      await load();
    } catch (err) {
      setError(err.response?.data?.message || "Unable to save worker log");
    } finally {
      setSaving("");
    }
  };

  const submitMaterial = async (event) => {
    event.preventDefault();
    setSaving("material");
    setError("");
    try {
      await api.post("/supervisor/material-logs", materialForm);
      setNotice("Material log saved.");
      setMaterialForm({ ...materialForm, materialName: "", quantity: "", unit: "", cost: "", notes: "" });
      await load();
    } catch (err) {
      setError(err.response?.data?.message || "Unable to save material log");
    } finally {
      setSaving("");
    }
  };

  const submitProgress = async (event) => {
    event.preventDefault();
    setSaving("progress");
    setError("");
    const body = new FormData();
    Object.entries(progressForm).forEach(([key, value]) => {
      if (key !== "photos") body.append(key, value ?? "");
    });
    progressForm.photos.forEach((file) => body.append("photos", file));
    try {
      await api.post("/supervisor/progress-updates", body, { headers: { "Content-Type": "multipart/form-data" } });
      setNotice("Progress update saved.");
      setProgressForm({ ...progressForm, notes: "", photos: [] });
      await load();
    } catch (err) {
      setError(err.response?.data?.message || "Unable to save progress update");
    } finally {
      setSaving("");
    }
  };

  const primaryProject = projects[0];
  const latestProgress = progressUpdates[0];
  const projectName = primaryProject?.name || "Assigned Site";
  const projectLocation = primaryProject?.workLocation || primaryProject?.location || primaryProject?.address || "No active site selected";
  const projectPhase = humanize(primaryProject?.progressStatus || latestProgress?.status || "in_progress");
  const progressMap = {
    not_started: 8,
    planning: 18,
    delayed: 42,
    on_hold: 42,
    in_progress: 68,
    completed: 100
  };
  const progressPercent = progressMap[primaryProject?.progressStatus] ?? progressMap[latestProgress?.status] ?? (projects.length ? 56 : 0);
  const activeWorkers = new Set(workLogs.map((log) => log.workerName).filter(Boolean)).size || workLogs.length;
  const materialSpend = materialLogs.reduce((sum, log) => sum + Number(log.cost || 0), 0);
  const photoCount = progressUpdates.reduce((sum, update) => sum + (update.photos?.length || 0), 0);
  const focusItems = [
    {
      when: "Today",
      title: primaryProject ? `Update ${primaryProject.name}` : "Select an assigned project",
      text: latestProgress?.notes || "Record labor, material usage, and progress evidence before end of shift."
    },
    {
      when: "Daily",
      title: `${workLogs.length} labor logs captured`,
      text: activeWorkers ? `${activeWorkers} unique workers are represented in recent logs.` : "No worker logs have been recorded yet."
    },
    {
      when: "Materials",
      title: `${materialLogs.length} material entries`,
      text: materialSpend ? `${money(materialSpend)} logged in material usage.` : "Material movement will appear after the first entry."
    }
  ];
  const phaseItems = [
    { label: "Planning", threshold: 10 },
    { label: "Foundation", threshold: 25 },
    { label: "Framework", threshold: 55 },
    { label: "Finish", threshold: 80 },
    { label: "Handover", threshold: 100 }
  ];

  return (
    <section id="supervisor-dashboard-top" className="supervisor-dashboard">
      <div className="supervisor-context">
        <div>
          <span className="supervisor-kicker">Site Supervisor Dashboard</span>
          <h2>{projectName}</h2>
          <p>
            <MapPin size={17} />
            {projectLocation} - {projectPhase}
          </p>
        </div>
        <div className="supervisor-actions">
          <a className="supervisor-action secondary" href="#supervisor-progress-form">
            <UploadCloud size={17} />
            Upload Site Photo
          </a>
          <a className="supervisor-action primary" href="#supervisor-worker-form">
            <CheckCircle2 size={17} />
            Submit Daily Summary
          </a>
        </div>
      </div>

      <div className="supervisor-health-grid">
        <article className="supervisor-health-card accent-blue">
          <span>Overall Progress</span>
          <div>
            <strong>{progressPercent}%</strong>
            <Route size={34} />
          </div>
          <div className="supervisor-meter">
            <span style={{ width: `${progressPercent}%` }} />
          </div>
        </article>
        <article className="supervisor-health-card accent-blue">
          <span>Active Workforce</span>
          <div>
            <strong>{activeWorkers}</strong>
            <Users size={34} />
          </div>
          <small>{workLogs.length} worker logs recorded</small>
        </article>
        <article className="supervisor-health-card accent-yellow">
          <span>Material Budget</span>
          <div>
            <strong>{money(materialSpend)}</strong>
            <Wallet size={34} />
          </div>
          <small>{materialLogs.length} material usage entries</small>
        </article>
        <article className="supervisor-health-card accent-orange">
          <span>Incident Status</span>
          <div>
            <strong>0</strong>
            <ShieldCheck size={34} />
          </div>
          <small>{progressUpdates.length} progress checks, {photoCount} photos</small>
        </article>
      </div>

      {error ? <p className="form-error">{error}</p> : null}
      {notice ? <p className="form-success">{notice}</p> : null}

      <div id="supervisor-reports" className="supervisor-bento">
        <section id="supervisor-worker-form" className="supervisor-panel supervisor-panel-wide">
          <div className="supervisor-panel-heading muted">
            <div>
              <span><ClipboardList size={18} /> Labor Attendance & Log</span>
              <small>{workLogs.length} records</small>
            </div>
            <Hammer size={20} />
          </div>
          <form className="supervisor-entry-form worker-entry" onSubmit={submitWorker}>
            <Field label="Project" className="wide-field"><select value={workerForm.projectId} onChange={(event) => setWorkerForm({ ...workerForm, projectId: event.target.value })} required><option value="">Select project</option>{projects.map((project) => <option value={project.id} key={project.id}>{project.name}</option>)}</select></Field>
            <Field label="Worker name"><input value={workerForm.workerName} onChange={(event) => setWorkerForm({ ...workerForm, workerName: event.target.value })} required /></Field>
            <Field label="Salary"><input type="number" value={workerForm.salary} onChange={(event) => setWorkerForm({ ...workerForm, salary: event.target.value })} required /></Field>
            <Field label="Date"><input type="date" value={workerForm.date} onChange={(event) => setWorkerForm({ ...workerForm, date: event.target.value })} required /></Field>
            <Field label="Log period"><select value={workerForm.logPeriod} onChange={(event) => setWorkerForm({ ...workerForm, logPeriod: event.target.value })}><option value="daily">Daily used</option><option value="monthly">Monthly used</option></select></Field>
            <Field label="Payment type"><select value={workerForm.paymentType} onChange={(event) => setWorkerForm({ ...workerForm, paymentType: event.target.value })}><option value="daily">Daily</option><option value="monthly">Monthly</option></select></Field>
            <button className="supervisor-submit primary" disabled={saving === "worker"}><Plus size={18} />Save Worker Log</button>
          </form>
          <div className="supervisor-data-table">
            <div className="supervisor-table-head">
              <span>Worker / Team</span>
              <span>Project</span>
              <span>Date</span>
              <span>Period</span>
              <span>Cost</span>
            </div>
            {workLogs.slice(0, 5).map((log) => (
              <div className="supervisor-table-row" key={log.id}>
                <span className="supervisor-person-cell">
                  <i>{initials(log.workerName)}</i>
                  <strong>{log.workerName}</strong>
                </span>
                <span>{log.project?.name || "Project"}</span>
                <span>{dateLabel(log.date)}</span>
                <span><b className="supervisor-pill">{humanize(log.logPeriod)}</b></span>
                <span>{money(log.salary)}</span>
              </div>
            ))}
            {!workLogs.length ? <p className="muted-line">No worker logs recorded.</p> : null}
          </div>
        </section>

        <aside className="supervisor-panel supervisor-focus-panel">
          <div className="supervisor-panel-heading dark">
            <div>
              <span><CalendarDays size={18} /> Next 48 Hours</span>
              <small>Site focus</small>
            </div>
          </div>
          <div className="supervisor-focus-list">
            {focusItems.map((item, index) => (
              <article className={index === 0 ? "is-hot" : ""} key={item.title}>
                <span>{item.when}</span>
                <strong>{item.title}</strong>
                <p>{item.text}</p>
              </article>
            ))}
          </div>
        </aside>

        <section id="supervisor-material-form" className="supervisor-panel">
          <div className="supervisor-panel-heading">
            <div>
              <span><PackagePlus size={18} /> Material Ledger</span>
              <small>{materialLogs.length} entries</small>
            </div>
          </div>
          <form className="supervisor-entry-form compact" onSubmit={submitMaterial}>
            <Field label="Project" className="wide-field"><select value={materialForm.projectId} onChange={(event) => setMaterialForm({ ...materialForm, projectId: event.target.value })} required><option value="">Select project</option>{projects.map((project) => <option value={project.id} key={project.id}>{project.name}</option>)}</select></Field>
            <Field label="Material"><input value={materialForm.materialName} onChange={(event) => setMaterialForm({ ...materialForm, materialName: event.target.value })} required /></Field>
            <Field label="Quantity"><input type="number" value={materialForm.quantity} onChange={(event) => setMaterialForm({ ...materialForm, quantity: event.target.value })} required /></Field>
            <Field label="Unit"><input value={materialForm.unit} onChange={(event) => setMaterialForm({ ...materialForm, unit: event.target.value })} required /></Field>
            <Field label="Cost"><input type="number" value={materialForm.cost} onChange={(event) => setMaterialForm({ ...materialForm, cost: event.target.value })} required /></Field>
            <Field label="Usage"><select value={materialForm.usagePeriod} onChange={(event) => setMaterialForm({ ...materialForm, usagePeriod: event.target.value })}><option value="daily">Daily used</option><option value="monthly">Monthly used</option></select></Field>
            <button className="supervisor-submit secondary" disabled={saving === "material"}><Plus size={18} />Add Entry</button>
          </form>
          <div className="supervisor-ledger-list">
            {materialLogs.slice(0, 4).map((log) => (
              <article key={log.id}>
                <span><PackagePlus size={18} /></span>
                <div>
                  <strong>{log.materialName}</strong>
                  <small>{log.quantity} {log.unit} - {log.project?.name || "Project"}</small>
                </div>
                <b>{money(log.cost)}</b>
              </article>
            ))}
            {!materialLogs.length ? <p className="muted-line">No material usage recorded.</p> : null}
          </div>
        </section>

        <section id="supervisor-progress-form" className="supervisor-panel supervisor-progress-panel">
          <div className="supervisor-panel-heading">
            <div>
              <span><Route size={18} /> Project Roadmap</span>
              <small>{projectPhase}</small>
            </div>
          </div>
          <div className="supervisor-roadmap" aria-label="Project phase progress">
            <div className="roadmap-track"><span style={{ width: `${progressPercent}%` }} /></div>
            <div className="roadmap-points">
              {phaseItems.map((phase) => (
                <span className={progressPercent >= phase.threshold ? "is-complete" : progressPercent >= phase.threshold - 20 ? "is-current" : ""} key={phase.label}>
                  <i />
                  <small>{phase.label}</small>
                </span>
              ))}
            </div>
          </div>
          <form className="supervisor-entry-form compact" onSubmit={submitProgress}>
            <Field label="Project" className="wide-field"><select value={progressForm.projectId} onChange={(event) => setProgressForm({ ...progressForm, projectId: event.target.value })} required><option value="">Select project</option>{projects.map((project) => <option value={project.id} key={project.id}>{project.name}</option>)}</select></Field>
            <Field label="Status"><select value={progressForm.status} onChange={(event) => setProgressForm({ ...progressForm, status: event.target.value })}><option value="in_progress">In progress</option><option value="delayed">Delayed</option><option value="completed">Completed</option></select></Field>
            <Field label="Date"><input type="date" value={progressForm.updateDate} onChange={(event) => setProgressForm({ ...progressForm, updateDate: event.target.value })} /></Field>
            <Field label="Photos JPG optional" className="wide-field"><input type="file" accept=".jpg,.jpeg" multiple onChange={(event) => setProgressForm({ ...progressForm, photos: Array.from(event.target.files || []) })} /></Field>
            <Field label="Notes" className="wide-field"><textarea rows={3} value={progressForm.notes} onChange={(event) => setProgressForm({ ...progressForm, notes: event.target.value })} /></Field>
            <button className="supervisor-submit primary" disabled={saving === "progress"}><Camera size={18} />Save Progress</button>
          </form>
          <div className="supervisor-progress-feed">
            {progressUpdates.slice(0, 3).map((update) => (
              <article key={update.id}>
                <span>{dateLabel(update.updateDate)}</span>
                <strong>{humanize(update.status)}</strong>
                <p>{update.notes || update.project?.name || "Progress update recorded."}</p>
              </article>
            ))}
            {!progressUpdates.length ? <p className="muted-line">No progress updates recorded.</p> : null}
          </div>
        </section>
      </div>
    </section>
  );
};

const ClientDashboard = () => {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api.get("/client/project-details").then((response) => setData(response.data)).catch((err) => setError(err.response?.data?.message || "Unable to load client project"));
  }, []);

  if (error) return <p className="form-error">{error}</p>;
  if (!data) return <Loading label="Loading client dashboard" />;
  if (!data.project) return <div className="empty-state"><h3>No project assigned</h3><p>Your contractor project will appear here.</p></div>;

  return (
    <section className="content-stack">
      <div className="toolbar"><div><span className="eyebrow">Client dashboard</span><h2>{data.project.name}</h2><p className="muted-line">{data.project.workLocation}</p></div><StatusBadge value={data.project.progressStatus} /></div>
      <div className="metric-grid">
        <article className="metric-tile"><FolderKanban size={19} /><span>Start date</span><strong>{dateLabel(data.project.startDate)}</strong></article>
        <article className="metric-tile"><Wallet size={19} /><span>Estimated cost</span><strong>{money(data.project.estimatedCost)}</strong></article>
        <article className="metric-tile"><Hammer size={19} /><span>Worker logs</span><strong>{data.workerLogs.length}</strong></article>
        <article className="metric-tile"><PackagePlus size={19} /><span>Material logs</span><strong>{data.materialLogs.length}</strong></article>
      </div>
      <div className="two-column">
        <div className="panel">
          <div className="panel-heading"><h3>Project timeline</h3><RefreshCw size={18} /></div>
          <div className="timeline-list">
            {data.progressUpdates.map((update) => (
              <article className="timeline-item" key={update.id}>
                <span className="timeline-date">{dateLabel(update.updateDate)}</span>
                <span className="timeline-main"><strong>{update.status.replace("_", " ")}</strong><small>{update.notes}</small></span>
                <StatusBadge value={update.status} />
              </article>
            ))}
          </div>
        </div>
        <div className="panel">
          <div className="panel-heading"><h3>Photos</h3><Camera size={18} /></div>
          <div className="photo-grid">
            {data.progressUpdates.flatMap((update) => update.photos || []).map((photo) => (
              <figure className="photo-card" key={photo.id}><img src={assetUrl(photo.fileUrl)} alt={photo.originalName} /><figcaption><span>{photo.originalName}</span></figcaption></figure>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export const Projects = () => {
  const { user, loading } = useAuth();

  const title = useMemo(() => {
    if (user?.role === "admin") return "Admin dashboard";
    if (user?.role === "contractor") return "Contractor dashboard";
    if (user?.role === "supervisor") return "Supervisor dashboard";
    return "Client dashboard";
  }, [user]);

  if (loading) return <Loading label="Loading dashboard" />;

  if (user?.role === "contractor") return <ContractorDashboard />;
  if (user?.role === "supervisor") return <SupervisorDashboard />;

  return (
    <section className="content-stack">
      <div className="toolbar">
        <div>
          <span className="eyebrow">Construction Log Management</span>
          <h2>{title}</h2>
        </div>
      </div>
      {user?.role === "admin" ? <AdminDashboard /> : null}
      {user?.role === "client" ? <ClientDashboard /> : null}
    </section>
  );
};
