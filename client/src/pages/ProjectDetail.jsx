import { ArrowLeft, CalendarPlus, Camera, Download, Hammer, MailPlus, PackagePlus, Plus, UserPlus, Wallet } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { API_ORIGIN, api } from "../api/http.js";
import { Loading } from "../components/Loading.jsx";
import { StatusBadge } from "../components/StatusBadge.jsx";

const money = (value) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0
  }).format(value || 0);

const dateLabel = (value) =>
  value
    ? new Intl.DateTimeFormat("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric"
      }).format(new Date(value))
    : "Not set";

const today = () => new Date().toISOString().slice(0, 10);

const newLogDefaults = {
  logDate: today(),
  weather: "",
  siteNotes: "",
  progressPercent: 0
};

const newWorkerDefaults = {
  name: "",
  trade: "",
  dailyWage: "",
  phone: ""
};

const newMaterialDefaults = {
  name: "",
  unit: "",
  unitCost: "",
  orderedQty: ""
};

const inviteNotice = (email, temporaryPassword = "") => {
  const passwordLine = temporaryPassword ? ` Temporary password: ${temporaryPassword}` : "";
  if (email?.sending) return `Client access updated and credential email delivery started.${passwordLine}`;
  if (email?.sent) return `Client access updated and credential email sent.${passwordLine}`;
  return `Client access updated, but credential email was not sent: ${email?.reason || "check email settings"}.${passwordLine}`;
};

export const ProjectDetail = () => {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const [detail, setDetail] = useState(null);
  const [logs, setLogs] = useState([]);
  const [workers, setWorkers] = useState([]);
  const [materials, setMaterials] = useState([]);
  const [logForm, setLogForm] = useState(newLogDefaults);
  const [workerForm, setWorkerForm] = useState(newWorkerDefaults);
  const [materialForm, setMaterialForm] = useState(newMaterialDefaults);
  const [inviteForm, setInviteForm] = useState({ name: "", email: "" });
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState("");

  const canWrite = Boolean(detail?.access?.canWrite);
  const summary = detail?.summary;
  const project = detail?.project;
  const progressUpdates = detail?.progressUpdates || [];
  const workerLogs = detail?.workerLogs || [];
  const materialLogs = detail?.materialLogs || [];
  const expenses = detail?.expenses || [];

  const submittedLogs = useMemo(() => logs.filter((log) => log.status !== "draft").length, [logs]);

  const loadProject = async () => {
    setLoading(true);
    setError("");
    try {
      const detailResponse = await api.get(`/projects/${projectId}`);
      const access = detailResponse.data.access;
      const requests = [api.get(`/projects/${projectId}/logs`), api.get(`/projects/${projectId}/materials`)];
      if (access.canWrite) requests.push(api.get(`/projects/${projectId}/workers`));
      const [logsResponse, materialsResponse, workersResponse] = await Promise.all(requests);

      setDetail(detailResponse.data);
      setLogs(logsResponse.data.logs || []);
      setMaterials(materialsResponse.data.materials || []);
      setWorkers(workersResponse?.data?.workers || []);
      setLogForm((current) => ({
        ...current,
        progressPercent: detailResponse.data.summary?.latestProgressPercent || 0
      }));
    } catch (err) {
      setError(err.response?.data?.message || "Unable to load project");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProject();
  }, [projectId]);

  const update = (setter) => (event) => {
    setter((current) => ({ ...current, [event.target.name]: event.target.value }));
  };

  const createLog = async (event) => {
    event.preventDefault();
    setSaving("log");
    setError("");
    try {
      const { data } = await api.post(`/projects/${projectId}/logs`, logForm);
      navigate(`/logs/${data.log.id}`);
    } catch (err) {
      setError(err.response?.data?.message || "Unable to create daily log");
    } finally {
      setSaving("");
    }
  };

  const addWorker = async (event) => {
    event.preventDefault();
    setSaving("worker");
    setError("");
    try {
      await api.post(`/projects/${projectId}/workers`, {
        ...workerForm,
        dailyWage: Number(workerForm.dailyWage)
      });
      setWorkerForm(newWorkerDefaults);
      await loadProject();
    } catch (err) {
      setError(err.response?.data?.message || "Unable to add worker");
    } finally {
      setSaving("");
    }
  };

  const addMaterial = async (event) => {
    event.preventDefault();
    setSaving("material");
    setError("");
    try {
      await api.post(`/projects/${projectId}/materials`, {
        ...materialForm,
        unitCost: Number(materialForm.unitCost),
        orderedQty: Number(materialForm.orderedQty || 0)
      });
      setMaterialForm(newMaterialDefaults);
      await loadProject();
    } catch (err) {
      setError(err.response?.data?.message || "Unable to add material");
    } finally {
      setSaving("");
    }
  };

  const inviteClient = async (event) => {
    event.preventDefault();
    setSaving("invite");
    setError("");
    setNotice("");
    try {
      const { data } = await api.post(`/projects/${projectId}/invite`, inviteForm);
      setInviteForm({ name: "", email: "" });
      setNotice(inviteNotice(data.email, data.temporaryPassword));
      setDetail((current) => {
        if (!current) return current;
        const clientUser = data.share?.clientUser;
        const clients = data.share ? [data.share, ...(current.clients || []).filter((share) => share.id !== data.share?.id)] : current.clients || [];
        return {
          ...current,
          clients,
          project: {
            ...current.project,
            clientName: current.project.clientName || clientUser?.name || inviteForm.name,
            clientEmail: current.project.clientEmail || clientUser?.email || inviteForm.email
          }
        };
      });
    } catch (err) {
      setError(err.response?.data?.message || "Unable to invite client");
    } finally {
      setSaving("");
    }
  };

  if (loading) return <Loading label="Loading project" />;
  if (!project) {
    return (
      <section className="content-stack">
        <Link className="inline-link" to="/projects">
          <ArrowLeft size={16} />
          Projects
        </Link>
        <p className="form-error">{error || "Project not found"}</p>
      </section>
    );
  }

  return (
    <section className="content-stack">
      <div className="toolbar">
        <div>
          <Link className="inline-link" to="/projects">
            <ArrowLeft size={16} />
            Projects
          </Link>
          <h2>{project.name}</h2>
          <p className="muted-line">{project.location}</p>
        </div>
        <div className="toolbar-actions">
          <StatusBadge value={project.status} />
          <a className="secondary-button" href={`${API_ORIGIN}/api/projects/${projectId}/report`}>
            <Download size={17} />
            PDF
          </a>
        </div>
      </div>

      {error ? <p className="form-error">{error}</p> : null}
      {notice ? <p className="form-success">{notice}</p> : null}

      <div className="metric-grid project-summary-grid">
        <article className="metric-tile">
          <span>Submitted logs</span>
          <strong>
            {submittedLogs}/{logs.length}
          </strong>
        </article>
        <article className="metric-tile">
          <span>Progress</span>
          <strong>{summary?.latestProgressPercent || 0}%</strong>
        </article>
        <article className="metric-tile">
          <span>Labour cost</span>
          <strong>{money(summary?.labourCost)}</strong>
        </article>
        <article className="metric-tile">
          <span>Material cost</span>
          <strong>{money(summary?.materialCost)}</strong>
        </article>
      </div>

      <div className="two-column">
        <div className="content-stack">
          {canWrite ? (
            <form className="panel form-grid compact-form" onSubmit={createLog}>
              <div className="panel-heading">
                <h3>New daily log</h3>
                <CalendarPlus size={18} />
              </div>
              <label>
                Date
                <input name="logDate" type="date" value={logForm.logDate} onChange={update(setLogForm)} required />
              </label>
              <label>
                Weather
                <input name="weather" value={logForm.weather} onChange={update(setLogForm)} />
              </label>
              <label className="wide-field">
                Site notes
                <textarea name="siteNotes" value={logForm.siteNotes} onChange={update(setLogForm)} rows={3} />
              </label>
              <label>
                Progress %
                <input name="progressPercent" type="number" min="0" max="100" value={logForm.progressPercent} onChange={update(setLogForm)} />
              </label>
              <button className="primary-button" type="submit" disabled={saving === "log"}>
                <Plus size={18} />
                {saving === "log" ? "Creating" : "Create log"}
              </button>
            </form>
          ) : null}

          <div className="panel">
            <div className="panel-heading">
              <h3>Daily logs</h3>
              <span className="muted-line">{logs.length} records</span>
            </div>
            <div className="timeline-list">
              {logs.map((log) => (
                <Link className="timeline-item" to={`/logs/${log.id}`} key={log.id}>
                  <span className="timeline-date">{dateLabel(log.logDate)}</span>
                  <span className="timeline-main">
                    <strong>{log.weather || "Weather not recorded"}</strong>
                    <small>{log.siteNotes || "No notes"}</small>
                  </span>
                  <StatusBadge value={log.status} />
                </Link>
              ))}
              {!logs.length ? <p className="muted-line">No daily logs recorded.</p> : null}
            </div>
          </div>

          <div className="panel">
            <div className="panel-heading">
              <h3>Progress updates</h3>
              <Camera size={18} />
            </div>
            <div className="timeline-list">
              {progressUpdates.map((update) => (
                <article className="timeline-item" key={update.id}>
                  <span className="timeline-date">{dateLabel(update.updateDate)}</span>
                  <span className="timeline-main">
                    <strong>{update.status.replace("_", " ")}</strong>
                    <small>{update.notes || update.supervisor?.name || "No notes"}</small>
                  </span>
                  <StatusBadge value={update.status} />
                </article>
              ))}
              {!progressUpdates.length ? <p className="muted-line">No progress updates recorded.</p> : null}
            </div>
          </div>
        </div>

        <div className="content-stack">
          <div className="panel">
            <div className="panel-heading">
              <h3>Project access</h3>
              {detail.access.role === "client" ? <StatusBadge value="client" /> : null}
            </div>
            <dl className="detail-list">
              <div>
                <dt>Client</dt>
                <dd>{project.clientName || "Not assigned"}</dd>
              </div>
              <div>
                <dt>Start</dt>
                <dd>{dateLabel(project.startDate)}</dd>
              </div>
              <div>
                <dt>End</dt>
                <dd>{dateLabel(project.endDate)}</dd>
              </div>
            </dl>
            {canWrite ? (
              <form className="inline-form" onSubmit={inviteClient}>
                <input name="name" value={inviteForm.name} onChange={update(setInviteForm)} placeholder="Client name" />
                <input name="email" type="email" value={inviteForm.email} onChange={update(setInviteForm)} placeholder="client@email.com" required />
                <button className="icon-button" type="submit" disabled={saving === "invite"} title="Invite client">
                  <MailPlus size={18} />
                </button>
              </form>
            ) : null}
          </div>

          {canWrite ? (
            <div className="panel">
              <div className="panel-heading">
                <h3>Site updates</h3>
                <Hammer size={18} />
              </div>
              <div className="timeline-list">
                {workerLogs.map((log) => (
                  <article className="timeline-item" key={`worker-${log.id}`}>
                    <span className="timeline-date">{dateLabel(log.date)}</span>
                    <span className="timeline-main">
                      <strong>{log.workerName}</strong>
                      <small>{log.supervisor?.name || "Supervisor"} - {money(log.salary)}</small>
                    </span>
                    <StatusBadge value="supervisor" />
                  </article>
                ))}
                {materialLogs.map((log) => (
                  <article className="timeline-item" key={`material-${log.id}`}>
                    <span className="timeline-date">{dateLabel(log.date)}</span>
                    <span className="timeline-main">
                      <strong>{log.materialName}</strong>
                      <small>{log.quantity} {log.unit} - {money(log.cost)}</small>
                    </span>
                    <PackagePlus size={17} />
                  </article>
                ))}
                {!workerLogs.length && !materialLogs.length ? <p className="muted-line">No worker or material updates recorded.</p> : null}
              </div>
            </div>
          ) : null}

          {expenses.length ? (
            <div className="panel">
              <div className="panel-heading">
                <h3>Project expenses</h3>
                <Wallet size={18} />
              </div>
              <div className="simple-table">
                {expenses.map((expense) => (
                  <div className="simple-row" key={expense.id}>
                    <span><strong>{expense.description}</strong><small>{dateLabel(expense.expenseDate)}</small></span>
                    <b>{money(expense.amount)}</b>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          <div className="panel">
            <div className="panel-heading">
              <h3>Materials consumed vs ordered</h3>
              <PackagePlus size={18} />
            </div>
            <div className="usage-list">
              {(summary?.materialBreakdown || []).map((material) => (
                <div className="usage-row" key={material.id}>
                  <div>
                    <strong>{material.name}</strong>
                    <small>
                      {material.qtyUsed}/{material.orderedQty} {material.unit}
                    </small>
                  </div>
                  <div className="usage-meter">
                    <span style={{ width: `${Math.min(material.utilizationPercent, 100)}%` }} />
                  </div>
                  <b>{material.utilizationPercent}%</b>
                </div>
              ))}
              {!summary?.materialBreakdown?.length ? <p className="muted-line">No materials configured.</p> : null}
            </div>
          </div>

          {canWrite ? (
            <>
              <form className="panel form-grid compact-form" onSubmit={addWorker}>
                <div className="panel-heading">
                  <h3>Worker roster</h3>
                  <UserPlus size={18} />
                </div>
                <label>
                  Name
                  <input name="name" value={workerForm.name} onChange={update(setWorkerForm)} required />
                </label>
                <label>
                  Trade
                  <input name="trade" value={workerForm.trade} onChange={update(setWorkerForm)} required />
                </label>
                <label>
                  Daily wage
                  <input name="dailyWage" type="number" min="0" value={workerForm.dailyWage} onChange={update(setWorkerForm)} required />
                </label>
                <label>
                  Phone
                  <input name="phone" value={workerForm.phone} onChange={update(setWorkerForm)} />
                </label>
                <button className="secondary-button" type="submit" disabled={saving === "worker"}>
                  <Plus size={17} />
                  Add worker
                </button>
                <div className="mini-list wide-field">
                  {workers.map((worker) => (
                    <span key={worker.id}>
                      {worker.name} · {worker.trade} · {money(worker.dailyWage)}
                    </span>
                  ))}
                </div>
              </form>

              <form className="panel form-grid compact-form" onSubmit={addMaterial}>
                <div className="panel-heading">
                  <h3>Material catalogue</h3>
                  <PackagePlus size={18} />
                </div>
                <label>
                  Material
                  <input name="name" value={materialForm.name} onChange={update(setMaterialForm)} required />
                </label>
                <label>
                  Unit
                  <input name="unit" value={materialForm.unit} onChange={update(setMaterialForm)} required />
                </label>
                <label>
                  Unit cost
                  <input name="unitCost" type="number" min="0" value={materialForm.unitCost} onChange={update(setMaterialForm)} required />
                </label>
                <label>
                  Ordered qty
                  <input name="orderedQty" type="number" min="0" value={materialForm.orderedQty} onChange={update(setMaterialForm)} />
                </label>
                <button className="secondary-button" type="submit" disabled={saving === "material"}>
                  <Plus size={17} />
                  Add material
                </button>
                <div className="mini-list wide-field">
                  {materials.map((material) => (
                    <span key={material.id}>
                      {material.name} · {material.orderedQty} {material.unit}
                    </span>
                  ))}
                </div>
              </form>
            </>
          ) : null}
        </div>
      </div>
    </section>
  );
};
