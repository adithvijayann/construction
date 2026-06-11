import { ArrowLeft, Camera, CheckCircle2, Download, Save, Trash2, Upload } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { API_ORIGIN, api, assetUrl } from "../api/http.js";
import { Loading } from "../components/Loading.jsx";
import { StatusBadge } from "../components/StatusBadge.jsx";

const money = (value) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0
  }).format(value || 0);

const dateInput = (value) => (value ? new Date(value).toISOString().slice(0, 10) : "");

const dateLabel = (value) =>
  new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  }).format(new Date(value));

const calculatedWage = (worker, status, hoursWorked) => {
  if (status === "absent") return 0;
  return Math.round((Number(worker?.dailyWage || 0) * (Number(hoursWorked || 0) / 8) + Number.EPSILON) * 100) / 100;
};

export const LogDetail = () => {
  const { logId } = useParams();
  const [payload, setPayload] = useState(null);
  const [form, setForm] = useState(null);
  const [workers, setWorkers] = useState([]);
  const [materials, setMaterials] = useState([]);
  const [attendanceRows, setAttendanceRows] = useState([]);
  const [materialRows, setMaterialRows] = useState([]);
  const [photoFiles, setPhotoFiles] = useState([]);
  const [caption, setCaption] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const log = payload?.log;
  const project = payload?.project;
  const canEdit = Boolean(payload?.access?.canWrite && log?.status === "draft");

  const totals = useMemo(() => {
    const labour = attendanceRows.reduce((sum, row) => sum + calculatedWage(row.worker, row.status, row.hoursWorked), 0);
    const materialsCost = materialRows.reduce((sum, row) => sum + Number(row.qtyUsed || 0) * Number(row.material?.unitCost || 0), 0);
    return { labour, materials: materialsCost, combined: labour + materialsCost };
  }, [attendanceRows, materialRows]);

  const hydrateRows = (logData, workerList, materialList) => {
    const attendanceByWorker = new Map((logData.attendance || []).map((item) => [item.worker?.id, item]));
    const usageByMaterial = new Map((logData.materialUsage || []).map((item) => [item.material?.id, item]));

    setAttendanceRows(
      workerList.map((worker) => {
        const existing = attendanceByWorker.get(worker.id);
        const status = existing?.status || "present";
        const hoursWorked = existing?.hoursWorked ?? (status === "half_day" ? 4 : status === "absent" ? 0 : 8);
        return {
          worker,
          status,
          hoursWorked
        };
      })
    );

    setMaterialRows(
      materialList.map((material) => {
        const existing = usageByMaterial.get(material.id);
        return {
          material,
          qtyUsed: existing?.qtyUsed ?? "",
          notes: existing?.notes || ""
        };
      })
    );
  };

  const loadLog = async () => {
    setLoading(true);
    setError("");
    try {
      const { data } = await api.get(`/logs/${logId}`);
      setPayload(data);
      setForm({
        logDate: dateInput(data.log.logDate),
        weather: data.log.weather || "",
        siteNotes: data.log.siteNotes || "",
        progressPercent: data.log.progressPercent || 0
      });

      if (data.access.canWrite) {
        const [workerResponse, materialResponse] = await Promise.all([
          api.get(`/projects/${data.project.id}/workers`),
          api.get(`/projects/${data.project.id}/materials`)
        ]);
        const workerList = workerResponse.data.workers || [];
        const materialList = materialResponse.data.materials || [];
        setWorkers(workerList);
        setMaterials(materialList);
        hydrateRows(data, workerList, materialList);
      } else {
        const workerList = (data.attendance || []).map((item) => item.worker).filter(Boolean);
        const materialList = (data.materialUsage || []).map((item) => item.material).filter(Boolean);
        setWorkers(workerList);
        setMaterials(materialList);
        setAttendanceRows(
          (data.attendance || []).map((item) => ({
            worker: item.worker,
            status: item.status,
            hoursWorked: item.hoursWorked
          }))
        );
        setMaterialRows(
          (data.materialUsage || []).map((item) => ({
            material: item.material,
            qtyUsed: item.qtyUsed,
            notes: item.notes
          }))
        );
      }
    } catch (err) {
      setError(err.response?.data?.message || "Unable to load daily log");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLog();
  }, [logId]);

  const updateForm = (event) => {
    setForm((current) => ({ ...current, [event.target.name]: event.target.value }));
  };

  const saveLog = async (event) => {
    event.preventDefault();
    setSaving("log");
    setError("");
    setNotice("");
    try {
      await api.put(`/logs/${logId}`, {
        ...form,
        progressPercent: Number(form.progressPercent)
      });
      setNotice("Daily log saved.");
      await loadLog();
    } catch (err) {
      setError(err.response?.data?.message || "Unable to save daily log");
    } finally {
      setSaving("");
    }
  };

  const saveAttendance = async () => {
    setSaving("attendance");
    setError("");
    setNotice("");
    try {
      await api.post(`/logs/${logId}/attendance`, {
        records: attendanceRows.map((row) => ({
          workerId: row.worker.id,
          status: row.status,
          hoursWorked: Number(row.hoursWorked || 0)
        }))
      });
      setNotice("Attendance saved.");
      await loadLog();
    } catch (err) {
      setError(err.response?.data?.message || "Unable to save attendance");
    } finally {
      setSaving("");
    }
  };

  const saveMaterials = async () => {
    const records = materialRows
      .filter((row) => Number(row.qtyUsed || 0) > 0)
      .map((row) => ({
        materialId: row.material.id,
        qtyUsed: Number(row.qtyUsed || 0),
        notes: row.notes || ""
      }));

    if (!records.length) {
      setError("Enter at least one material quantity.");
      return;
    }

    setSaving("materials");
    setError("");
    setNotice("");
    try {
      await api.post(`/logs/${logId}/materials`, { records });
      setNotice("Material usage saved.");
      await loadLog();
    } catch (err) {
      setError(err.response?.data?.message || "Unable to save material usage");
    } finally {
      setSaving("");
    }
  };

  const uploadPhotos = async (event) => {
    event.preventDefault();
    if (!photoFiles.length) {
      setError("Choose at least one photo.");
      return;
    }

    const body = new FormData();
    photoFiles.forEach((file) => body.append("photos", file));
    body.append("caption", caption);

    setSaving("photos");
    setError("");
    setNotice("");
    try {
      await api.post(`/logs/${logId}/photos`, body, {
        headers: { "Content-Type": "multipart/form-data" }
      });
      setPhotoFiles([]);
      setCaption("");
      setNotice("Photo proof uploaded.");
      await loadLog();
    } catch (err) {
      setError(err.response?.data?.message || "Unable to upload photos");
    } finally {
      setSaving("");
    }
  };

  const deletePhoto = async (photoId) => {
    setSaving(photoId);
    setError("");
    try {
      await api.delete(`/photos/${photoId}`);
      await loadLog();
    } catch (err) {
      setError(err.response?.data?.message || "Unable to delete photo");
    } finally {
      setSaving("");
    }
  };

  const submitLog = async () => {
    setSaving("submit");
    setError("");
    setNotice("");
    try {
      await api.post(`/logs/${logId}/submit`);
      setNotice("Daily log submitted and locked.");
      await loadLog();
    } catch (err) {
      setError(err.response?.data?.message || "Unable to submit daily log");
    } finally {
      setSaving("");
    }
  };

  if (loading) return <Loading label="Loading daily log" />;
  if (!log || !project || !form) {
    return (
      <section className="content-stack">
        <p className="form-error">{error || "Daily log not found"}</p>
      </section>
    );
  }

  return (
    <section className="content-stack">
      <div className="toolbar">
        <div>
          <Link className="inline-link" to={`/projects/${project.id}`}>
            <ArrowLeft size={16} />
            {project.name}
          </Link>
          <h2>{dateLabel(log.logDate)}</h2>
          <p className="muted-line">{project.location}</p>
        </div>
        <div className="toolbar-actions">
          <StatusBadge value={log.status} />
          <a className="secondary-button" href={`${API_ORIGIN}/api/projects/${project.id}/report`}>
            <Download size={17} />
            PDF
          </a>
          {canEdit ? (
            <button className="primary-button" type="button" onClick={submitLog} disabled={saving === "submit"}>
              <CheckCircle2 size={18} />
              {saving === "submit" ? "Submitting" : "Submit"}
            </button>
          ) : null}
        </div>
      </div>

      {error ? <p className="form-error">{error}</p> : null}
      {notice ? <p className="form-success">{notice}</p> : null}

      <div className="metric-grid">
        <article className="metric-tile">
          <span>Headcount</span>
          <strong>{attendanceRows.filter((row) => row.status !== "absent").length}</strong>
        </article>
        <article className="metric-tile">
          <span>Labour wages</span>
          <strong>{money(totals.labour)}</strong>
        </article>
        <article className="metric-tile">
          <span>Material spend</span>
          <strong>{money(totals.materials)}</strong>
        </article>
        <article className="metric-tile">
          <span>Daily total</span>
          <strong>{money(totals.combined)}</strong>
        </article>
      </div>

      <div className="two-column wide-left">
        <div className="content-stack">
          <form className="panel form-grid compact-form" onSubmit={saveLog}>
            <div className="panel-heading">
              <h3>Site conditions</h3>
              <StatusBadge value={payload.access.role} />
            </div>
            <label>
              Date
              <input name="logDate" type="date" value={form.logDate} onChange={updateForm} disabled={!canEdit} />
            </label>
            <label>
              Weather
              <input name="weather" value={form.weather} onChange={updateForm} disabled={!canEdit} />
            </label>
            <label>
              Progress
              <input name="progressPercent" type="range" min="0" max="100" value={form.progressPercent} onChange={updateForm} disabled={!canEdit} />
              <span className="range-value">{form.progressPercent}%</span>
            </label>
            <label className="wide-field">
              Site notes
              <textarea name="siteNotes" rows={5} value={form.siteNotes} onChange={updateForm} disabled={!canEdit} />
            </label>
            {canEdit ? (
              <button className="secondary-button" type="submit" disabled={saving === "log"}>
                <Save size={17} />
                {saving === "log" ? "Saving" : "Save notes"}
              </button>
            ) : null}
          </form>

          <div className="panel">
            <div className="panel-heading">
              <h3>Attendance</h3>
              {canEdit ? (
                <button className="secondary-button" type="button" onClick={saveAttendance} disabled={saving === "attendance" || !attendanceRows.length}>
                  <Save size={17} />
                  {saving === "attendance" ? "Saving" : "Save"}
                </button>
              ) : null}
            </div>
            <div className="data-table attendance-table">
              <div className="table-head">
                <span>Worker</span>
                <span>Status</span>
                <span>Hours</span>
                <span>Wage</span>
              </div>
              {attendanceRows.map((row, index) => (
                <div className="table-row" key={row.worker.id}>
                  <span>
                    <strong>{row.worker.name}</strong>
                    <small>{row.worker.trade}</small>
                  </span>
                  <select
                    value={row.status}
                    disabled={!canEdit}
                    onChange={(event) =>
                      setAttendanceRows((current) =>
                        current.map((item, itemIndex) =>
                          itemIndex === index
                            ? {
                                ...item,
                                status: event.target.value,
                                hoursWorked: event.target.value === "absent" ? 0 : event.target.value === "half_day" ? 4 : item.hoursWorked || 8
                              }
                            : item
                        )
                      )
                    }
                  >
                    <option value="present">Present</option>
                    <option value="half_day">Half day</option>
                    <option value="absent">Absent</option>
                  </select>
                  <input
                    type="number"
                    min="0"
                    max="24"
                    value={row.hoursWorked}
                    disabled={!canEdit || row.status === "absent"}
                    onChange={(event) =>
                      setAttendanceRows((current) =>
                        current.map((item, itemIndex) => (itemIndex === index ? { ...item, hoursWorked: event.target.value } : item))
                      )
                    }
                  />
                  <strong>{money(calculatedWage(row.worker, row.status, row.hoursWorked))}</strong>
                </div>
              ))}
              {!attendanceRows.length ? <p className="muted-line">No workers available.</p> : null}
            </div>
          </div>
        </div>

        <div className="content-stack">
          <div className="panel">
            <div className="panel-heading">
              <h3>Materials</h3>
              {canEdit ? (
                <button className="secondary-button" type="button" onClick={saveMaterials} disabled={saving === "materials" || !materialRows.length}>
                  <Save size={17} />
                  {saving === "materials" ? "Saving" : "Save"}
                </button>
              ) : null}
            </div>
            <div className="data-table material-table">
              <div className="table-head">
                <span>Material</span>
                <span>Used</span>
                <span>Cost</span>
              </div>
              {materialRows.map((row, index) => (
                <div className="table-row" key={row.material.id}>
                  <span>
                    <strong>{row.material.name}</strong>
                    <small>
                      Ordered {row.material.orderedQty} {row.material.unit}
                    </small>
                  </span>
                  <label className="inline-quantity">
                    <input
                      type="number"
                      min="0"
                      value={row.qtyUsed}
                      disabled={!canEdit}
                      onChange={(event) =>
                        setMaterialRows((current) =>
                          current.map((item, itemIndex) => (itemIndex === index ? { ...item, qtyUsed: event.target.value } : item))
                        )
                      }
                    />
                    <span>{row.material.unit}</span>
                  </label>
                  <strong>{money(Number(row.qtyUsed || 0) * Number(row.material.unitCost || 0))}</strong>
                </div>
              ))}
              {!materialRows.length ? <p className="muted-line">No materials available.</p> : null}
            </div>
          </div>

          <div className="panel">
            <div className="panel-heading">
              <h3>Photo proof</h3>
              <Camera size={18} />
            </div>

            {canEdit ? (
              <form className="upload-box" onSubmit={uploadPhotos}>
                <input type="file" accept="image/*" multiple onChange={(event) => setPhotoFiles(Array.from(event.target.files || []))} />
                <input value={caption} onChange={(event) => setCaption(event.target.value)} placeholder="Caption" />
                <button className="secondary-button" type="submit" disabled={saving === "photos"}>
                  <Upload size={17} />
                  {saving === "photos" ? "Uploading" : "Upload"}
                </button>
              </form>
            ) : null}

            <div className="photo-grid">
              {(payload.photos || []).map((photo) => (
                <figure className="photo-card" key={photo.id}>
                  <img src={assetUrl(photo.fileUrl)} alt={photo.caption || "Site progress"} />
                  <figcaption>
                    <span>{photo.caption || "Site progress"}</span>
                    {canEdit ? (
                      <button className="icon-button danger" type="button" onClick={() => deletePhoto(photo.id)} disabled={saving === photo.id} title="Delete photo">
                        <Trash2 size={16} />
                      </button>
                    ) : null}
                  </figcaption>
                </figure>
              ))}
            </div>
            {!payload.photos?.length ? <p className="muted-line">No photo proof uploaded.</p> : null}
          </div>
        </div>
      </div>
    </section>
  );
};
