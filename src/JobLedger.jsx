import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  Plus, Search, Phone, Mail, Building2, RefreshCw, Clock, X, Edit2, Trash2,
  DollarSign, AlertCircle, CheckCircle2, ChevronRight, CalendarDays, LayoutGrid,
  BookOpen, Loader2, ArrowUpRight, Briefcase, User, Link as LinkIcon, Ban
} from "lucide-react";

const STAGES = ["1st Call", "2nd Call", "3rd Call", "Final Call", "Offer", "Rejected"];
const PLATFORMS = ["LinkedIn", "Company Site", "Referral", "Indeed", "Wellfound", "Recruiter Outreach", "Other"];

const STAGE_META = {
  "1st Call": { tone: "var(--accent)",   num: "01" },
  "2nd Call": { tone: "var(--accent)",   num: "02" },
  "3rd Call": { tone: "var(--rust)",     num: "03" },
  "Final Call": { tone: "var(--rust)",   num: "04" },
  Offer:      { tone: "var(--teal)",     num: "05" },
  Rejected:   { tone: "var(--ink-soft)", num: "06" },
};

const uid = () => Math.random().toString(36).slice(2, 10);
const normalizeStage = (raw) => {
  if (!raw) return "1st Call";
  const match = STAGES.find(s => s.toLowerCase() === String(raw).trim().toLowerCase());
  return match || "1st Call";
};
const todayISO = () => new Date().toISOString().slice(0, 10);
const fmtMoney = (n) => n ? `$${Number(n).toLocaleString()}` : "—";
const fmtDate = (iso) => {
  if (!iso) return "—";
  const hasTime = iso.length > 10;
  const d = new Date(iso + (hasTime ? "" : "T00:00:00"));
  if (isNaN(d)) return "—";
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" }) +
    (hasTime ? `, ${d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}` : "");
};
const daysUntil = (iso) => {
  if (!iso) return null;
  const d = new Date(iso + (iso.length === 10 ? "T00:00:00" : ""));
  const now = new Date(); now.setHours(0,0,0,0);
  return Math.round((d - now) / 86400000);
};

const seedApps = () => ([
  {
    id: uid(), company: "Northline Retail", jobTitle: "Senior Frontend Engineer",
    recruiterName: "Priya Kapoor", recruiterEmail: "priya@northline.co", recruiterPhone: "+92 300 1234567",
    platform: "LinkedIn", stage: "2nd Call", salary: 95000,
    nextCall: todayISO(), jobUrl: "", notes: "Panel interview next, focus on system design.",
    createdAt: Date.now() - 6 * 86400000, activity: ["Application created — sourced via LinkedIn", "1st call completed — moved to 2nd round"],
  },
  {
    id: uid(), company: "Vantage Logistics", jobTitle: "Product Designer",
    recruiterName: "Ahmed Raza", recruiterEmail: "ahmed@vantage-log.com", recruiterPhone: "+92 301 9988776",
    platform: "Referral", stage: "1st Call", salary: 78000,
    nextCall: new Date(Date.now() + 2 * 86400000).toISOString().slice(0, 10), jobUrl: "", notes: "Recruiter screen scheduled, sent portfolio.",
    createdAt: Date.now() - 3 * 86400000, activity: ["Application created — referred by a friend", "Portfolio sent"],
  },
  {
    id: uid(), company: "Bloom & Co", jobTitle: "Growth Marketing Lead",
    recruiterName: "Sara Malik", recruiterEmail: "sara@bloomco.pk", recruiterPhone: "+92 333 4455667",
    platform: "Company Site", stage: "1st Call", salary: 60000,
    nextCall: new Date(Date.now() - 1 * 86400000).toISOString().slice(0, 10), jobUrl: "", notes: "Applied directly, no response yet — follow up.",
    createdAt: Date.now() - 1 * 86400000, activity: ["Application submitted via company careers page"],
  },
]);

const emptyDraft = () => ({
  id: null, company: "", jobTitle: "", recruiterName: "", recruiterEmail: "", recruiterPhone: "",
  platform: "LinkedIn", stage: "1st Call", salary: "", nextCall: "", jobUrl: "", notes: "",
});

export default function JobLedger() {
  const [apps, setApps] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [view, setView] = useState("dashboard");
  const [search, setSearch] = useState("");
  const [stageFilter, setStageFilter] = useState("All");
  const [draft, setDraft] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [syncing, setSyncing] = useState(false);
  const [syncLog, setSyncLog] = useState([]);
  const [toast, setToast] = useState(null);

  useEffect(() => {
    const saved = localStorage.getItem("applications");
    if (saved) {
      const parsed = JSON.parse(saved);
      const migrated = parsed.map(a =>
        STAGES.includes(a.stage) ? a : { ...a, stage: normalizeStage(a.stage) }
      );
      setApps(migrated);
    } else {
      setApps(seedApps());
    }
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (!loaded) return;
    localStorage.setItem("applications", JSON.stringify(apps));
  }, [apps, loaded]);

  const showToast = useCallback((msg, kind = "ok") => {
    setToast({ msg, kind });
    setTimeout(() => setToast(null), 3200);
  }, []);

  const filtered = useMemo(() => {
    return apps.filter((a) => {
      const matchesStage = stageFilter === "All" || a.stage === stageFilter;
      const q = search.trim().toLowerCase();
      const matchesSearch = !q || [a.company, a.jobTitle, a.recruiterName, a.notes].join(" ").toLowerCase().includes(q);
      return matchesStage && matchesSearch;
    }).sort((a, b) => {
      const da = a.nextCall || "9999", db = b.nextCall || "9999";
      return da.localeCompare(db);
    });
  }, [apps, search, stageFilter]);

  const stats = useMemo(() => {
    const active = apps.filter(a => a.stage !== "Offer" && a.stage !== "Rejected");
    const offers = apps.filter(a => a.stage === "Offer");
    const overdue = apps.filter(a => a.nextCall && daysUntil(a.nextCall) < 0 && a.stage !== "Offer" && a.stage !== "Rejected");
    const upcoming = apps.filter(a => a.nextCall && daysUntil(a.nextCall) >= 0 && daysUntil(a.nextCall) <= 7 && a.stage !== "Offer" && a.stage !== "Rejected")
      .sort((a,b) => a.nextCall.localeCompare(b.nextCall));
    const byStage = STAGES.map(s => ({ stage: s, count: apps.filter(a => a.stage === s).length }));
    const topSalary = offers.reduce((m, a) => Math.max(m, Number(a.salary || 0)), 0);
    return { total: apps.length, active: active.length, offers: offers.length, overdue, upcoming, byStage, topSalary };
  }, [apps]);

  const openNew = () => setDraft(emptyDraft());
  const openEdit = (app) => setDraft({ ...app, salary: String(app.salary ?? "") });
  const closeDraft = () => setDraft(null);

  const saveDraft = () => {
    if (!draft.company.trim()) { showToast("An application needs at least a company name.", "warn"); return; }
    if (draft.id) {
      setApps(prev => prev.map(a => a.id === draft.id ? {
        ...a, ...draft, salary: Number(draft.salary) || 0,
        activity: [...(a.activity || []), `Updated — stage: ${draft.stage}`],
      } : a));
      showToast("Application updated.");
    } else {
      const newApp = {
        ...draft, id: uid(), salary: Number(draft.salary) || 0, createdAt: Date.now(),
        activity: [`Application created manually — source: ${draft.platform}`],
      };
      setApps(prev => [newApp, ...prev]);
      showToast("Application added.");
    }
    setDraft(null);
  };

  const deleteApp = (id) => {
    setApps(prev => prev.filter(a => a.id !== id));
    setConfirmDelete(null);
    showToast("Application removed.", "warn");
  };

  const markContacted = (id) => {
    setApps(prev => prev.map(a => a.id === id ? {
      ...a,
      nextCall: new Date(Date.now() + 5 * 86400000).toISOString().slice(0, 16),
      activity: [...(a.activity || []), "Marked as followed up — next check-in pushed 5 days"],
    } : a));
    showToast("Follow-up rescheduled.");
  };

  const markRejected = (id) => {
    const now = new Date().toISOString();
    setApps(prev => prev.map(a => a.id === id ? {
      ...a,
      stage: "Rejected",
      rejectedAt: now,
      activity: [...(a.activity || []), `Marked as rejected — ${new Date(now).toLocaleString(undefined, { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" })}`],
    } : a));
    showToast("Marked as rejected.", "warn");
  };

  // ---- Calendar sync via Anthropic API + Google Calendar MCP ----
  const syncFromCalendar = async () => {
    setSyncing(true);
    try {
      const API_BASE = import.meta.env.PROD ? "" : "http://localhost:3001";
      const response = await fetch(`${API_BASE}/api/calendar-events`);
      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.error || `Backend returned ${response.status} — is it running on port 3001?`);
      }
      let matches = await response.json();
      if (!Array.isArray(matches)) matches = [];

      let added = 0, updated = 0;
      setApps(prev => {
        let next = [...prev];
        matches.forEach(m => {
          if (!m.company) return;
          const existingIdx = next.findIndex(a =>
            a.company.toLowerCase() === String(m.company).toLowerCase() &&
            (a.recruiterName || "").toLowerCase() === String(m.recruiterName || "").toLowerCase()
          );
          const validStage = STAGES.includes(m.stage) ? m.stage : normalizeStage(m.stage);
          if (existingIdx >= 0) {
            next[existingIdx] = {
              ...next[existingIdx],
              stage: validStage,
              nextCall: m.eventDate || next[existingIdx].nextCall,
              jobTitle: m.jobTitle || next[existingIdx].jobTitle,
              recruiterEmail: m.recruiterEmail || next[existingIdx].recruiterEmail,
              jobUrl: m.jobUrl || next[existingIdx].jobUrl,
              salary: m.salary || next[existingIdx].salary,
              notes: m.notes || next[existingIdx].notes,
              activity: [...(next[existingIdx].activity || []), `Calendar sync — ${validStage} on ${m.eventDate || "?"}`],
            };
            updated++;
          } else {
            next = [{
              id: uid(), company: m.company, jobTitle: m.jobTitle || "", recruiterName: m.recruiterName || "",
              recruiterEmail: m.recruiterEmail || "", recruiterPhone: "", platform: "Recruiter Outreach", stage: validStage, salary: m.salary || 0,
              nextCall: m.eventDate || "", jobUrl: m.jobUrl || "", notes: m.notes || "",
              createdAt: Date.now(), activity: [`Imported from calendar — ${validStage} on ${m.eventDate || "?"}`],
            }, ...next];
            added++;
          }
        });
        return next;
      });
      const logEntry = { time: new Date().toLocaleTimeString(), added, updated, found: matches.length };
      setSyncLog(prev => [logEntry, ...prev].slice(0, 8));
      showToast(matches.length ? `Synced: ${added} new, ${updated} updated.` : "No interview-style events found in your calendar.");
    } catch (err) {
      setSyncLog(prev => [{ time: new Date().toLocaleTimeString(), error: String(err && err.message ? err.message : err) }, ...prev].slice(0, 8));
      showToast("Calendar sync failed — see the sync log for details.", "warn");
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div className="ll-root">
      <Style />
      <aside className="ll-sidebar">
        <div className="ll-brand">
          <BookOpen size={20} strokeWidth={1.75} />
          <div>
            <div className="ll-brand-name">Ledger</div>
            <div className="ll-brand-sub">job pipeline</div>
          </div>
        </div>
        <nav className="ll-nav">
          <NavItem icon={<LayoutGrid size={16} />} label="Dashboard" active={view === "dashboard"} onClick={() => setView("dashboard")} />
          <NavItem icon={<Briefcase size={16} />} label="Applications" active={view === "apps"} onClick={() => setView("apps")} count={apps.length} />
          <NavItem icon={<CalendarDays size={16} />} label="Calendar Sync" active={view === "sync"} onClick={() => setView("sync")} />
        </nav>
        <div className="ll-sidebar-foot">
          <div className="ll-mini-stat">
            <span>Active applications</span>
            <strong>{stats.active}</strong>
          </div>
          <div className="ll-mini-stat">
            <span>Overdue follow-ups</span>
            <strong style={{ color: stats.overdue.length ? "var(--rust)" : "var(--ink)" }}>{stats.overdue.length}</strong>
          </div>
        </div>
      </aside>

      <main className="ll-main">
        {view === "dashboard" && (
          <Dashboard stats={stats} onMarkContacted={markContacted} onOpenApp={openEdit} />
        )}
        {view === "apps" && (
          <AppsView
            filtered={filtered}
            search={search} setSearch={setSearch}
            stageFilter={stageFilter} setStageFilter={setStageFilter}
            onNew={openNew} onEdit={openEdit} onDelete={(id) => setConfirmDelete(id)}
            onMarkContacted={markContacted}
            onMarkRejected={markRejected}
          />
        )}
        {view === "sync" && (
          <SyncView syncing={syncing} onSync={syncFromCalendar} log={syncLog} />
        )}
      </main>

      {draft && (
        <AppModal draft={draft} setDraft={setDraft} onSave={saveDraft} onClose={closeDraft} />
      )}

      {confirmDelete && (
        <ConfirmModal
          text="Remove this application permanently? This can't be undone."
          onCancel={() => setConfirmDelete(null)}
          onConfirm={() => deleteApp(confirmDelete)}
        />
      )}

      {toast && (
        <div className={`ll-toast ${toast.kind === "warn" ? "ll-toast-warn" : ""}`}>
          {toast.kind === "warn" ? <AlertCircle size={15} /> : <CheckCircle2 size={15} />}
          {toast.msg}
        </div>
      )}
    </div>
  );
}

function NavItem({ icon, label, active, onClick, count }) {
  return (
    <button className={`ll-navitem ${active ? "ll-navitem-active" : ""}`} onClick={onClick}>
      {icon}
      <span>{label}</span>
      {typeof count === "number" && <span className="ll-navcount">{count}</span>}
    </button>
  );
}

function Dashboard({ stats, onMarkContacted, onOpenApp }) {
  const maxCount = Math.max(1, ...stats.byStage.map(s => s.count));
  return (
    <div className="ll-page">
      <PageHeader eyebrow="Overview" title="Dashboard" subtitle="Where every application stands, at a glance." />

      <div className="ll-statgrid">
        <StatCard label="Total applications" value={stats.total} icon={<Briefcase size={16} />} />
        <StatCard label="Active pipeline" value={stats.active} icon={<Building2 size={16} />} />
        <StatCard label="Offers" value={stats.offers} icon={<ArrowUpRight size={16} />} tone="teal" />
        <StatCard label="Overdue follow-ups" value={stats.overdue.length} icon={<AlertCircle size={16} />} tone={stats.overdue.length ? "rust" : undefined} />
      </div>

      <div className="ll-splitgrid">
        <section className="ll-card">
          <div className="ll-card-title">Pipeline ledger</div>
          <div className="ll-funnel">
            {stats.byStage.map(({ stage, count }) => (
              <div className="ll-funnel-row" key={stage}>
                <span className="ll-funnel-num">{STAGE_META[stage].num}</span>
                <span className="ll-funnel-label">{stage}</span>
                <span className="ll-funnel-track">
                  <span className="ll-funnel-fill" style={{ width: `${(count / maxCount) * 100}%`, background: STAGE_META[stage].tone }} />
                </span>
                <span className="ll-funnel-count">{count}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="ll-card">
          <div className="ll-card-title">Due within 7 days</div>
          {stats.upcoming.length === 0 && stats.overdue.length === 0 && (
            <div className="ll-empty">Nothing due. The ledger is quiet.</div>
          )}
          <div className="ll-followlist">
            {stats.overdue.map(a => (
              <FollowRow key={a.id} app={a} overdue onOpen={() => onOpenApp(a)} onContact={() => onMarkContacted(a.id)} />
            ))}
            {stats.upcoming.map(a => (
              <FollowRow key={a.id} app={a} onOpen={() => onOpenApp(a)} onContact={() => onMarkContacted(a.id)} />
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

function StatCard({ label, value, icon, tone }) {
  return (
    <div className="ll-statcard">
      <div className="ll-statcard-top">
        <span className="ll-statcard-icon" style={tone === "teal" ? { color: "var(--teal)" } : tone === "rust" ? { color: "var(--rust)" } : undefined}>{icon}</span>
        <span className="ll-statcard-label">{label}</span>
      </div>
      <div className="ll-statcard-value" style={tone === "teal" ? { color: "var(--teal)" } : tone === "rust" ? { color: "var(--rust)" } : undefined}>{value}</div>
    </div>
  );
}

function FollowRow({ app, overdue, onOpen, onContact }) {
  const d = daysUntil(app.nextCall);
  const dueLabel = overdue ? `${Math.abs(d)}d overdue` : d === 0 ? "Today" : d === 1 ? "Tomorrow" : `in ${d}d`;
  return (
    <div className="ll-followrow">
      <button className="ll-followrow-main" onClick={onOpen}>
        <span className={`ll-dot ${overdue ? "ll-dot-rust" : ""}`} />
        <span className="ll-followrow-name">{app.company}</span>
        <span className="ll-followrow-company">{app.jobTitle || app.recruiterName}</span>
      </button>
      <span className={`ll-due ${overdue ? "ll-due-rust" : ""}`}><Clock size={12} /> {dueLabel}</span>
      <button className="ll-iconbtn" title="Mark followed up" onClick={onContact}><CheckCircle2 size={14} /></button>
    </div>
  );
}

function AppsView({ filtered, search, setSearch, stageFilter, setStageFilter, onNew, onEdit, onDelete, onMarkContacted, onMarkRejected }) {
  return (
    <div className="ll-page">
      <PageHeader eyebrow="Records" title="Applications" subtitle="Every application, in ledger order." action={
        <button className="ll-btn ll-btn-primary" onClick={onNew}><Plus size={15} /> Add application</button>
      } />

      <div className="ll-toolbar">
        <div className="ll-search">
          <Search size={14} />
          <input placeholder="Search company, role, recruiter…" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <div className="ll-chips">
          <button className={`ll-chip ${stageFilter === "All" ? "ll-chip-active" : ""}`} onClick={() => setStageFilter("All")}>All</button>
          {STAGES.map(s => (
            <button key={s} className={`ll-chip ${stageFilter === s ? "ll-chip-active" : ""}`} onClick={() => setStageFilter(s)}>{s}</button>
          ))}
        </div>
      </div>

      <div className="ll-card ll-ledgercard">
        <div className="ll-ledger-head">
          <span>#</span><span>Company / Role</span><span>Stage</span><span>Salary</span><span>Next call</span><span></span>
        </div>
        {filtered.length === 0 && <div className="ll-empty" style={{ padding: "32px 8px" }}>No applications match. Try clearing filters, or add one.</div>}
        {filtered.map((a, i) => {
          const d = daysUntil(a.nextCall);
          const overdue = a.nextCall && d < 0 && a.stage !== "Offer" && a.stage !== "Rejected";
          return (
            <div className="ll-ledger-row" key={a.id}>
              <span className="ll-ledger-serial">{String(i + 1).padStart(2, "0")}</span>
              <button className="ll-ledger-lead" onClick={() => onEdit(a)}>
                <span className="ll-ledger-name">{a.company}</span>
                <span className="ll-ledger-company">{a.jobTitle || "—"}{a.recruiterName ? ` · ${a.recruiterName}` : ""}</span>
              </button>
              <span className="ll-badge" style={{ color: (STAGE_META[a.stage] || STAGE_META["1st Call"]).tone, borderColor: (STAGE_META[a.stage] || STAGE_META["1st Call"]).tone }}>{a.stage}</span>
              <span className="ll-ledger-value">{fmtMoney(a.salary)}</span>
              <span className={`ll-ledger-due ${overdue ? "ll-due-rust" : ""}`}>
                {a.stage === "Rejected" ? (a.rejectedAt ? `Rejected ${fmtDate(a.rejectedAt)}` : "Rejected") : fmtDate(a.nextCall)}
              </span>
              <span className="ll-ledger-actions">
                <button className="ll-iconbtn" title="Mark followed up" onClick={() => onMarkContacted(a.id)}><CheckCircle2 size={14} /></button>
                <button className="ll-iconbtn ll-iconbtn-danger" title="Mark rejected" onClick={() => onMarkRejected(a.id)}><Ban size={14} /></button>
                <button className="ll-iconbtn" title="Edit" onClick={() => onEdit(a)}><Edit2 size={14} /></button>
                <button className="ll-iconbtn ll-iconbtn-danger" title="Delete" onClick={() => onDelete(a.id)}><Trash2 size={14} /></button>
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function SyncView({ syncing, onSync, log }) {
  return (
    <div className="ll-page">
      <PageHeader eyebrow="Automation" title="Calendar Sync" subtitle="Pull new and updated applications straight from your Google Calendar." />

      <div className="ll-splitgrid">
        <section className="ll-card">
          <div className="ll-card-title">How it recognizes a call</div>
          <p className="ll-copy">
            Title your interview events the way you already do:
          </p>
          <ul className="ll-list">
            <li><code>Company - Recruiter - Round</code>, e.g. <code>Northline Retail - Priya Kapoor - 2nd Call</code></li>
            <li>Or anything that clearly reads as a recruiter screen, interview, or hiring call</li>
          </ul>
          <p className="ll-copy">
            On sync, it scans events from 3 days ago through the next 30 days, and maps the round in
            the title to a pipeline stage — "recruiter screen" becomes <strong>Screening</strong>, "onsite" or
            "panel" becomes <strong>Final Call</strong>, and so on. New matches become new applications;
            existing ones (matched by company + recruiter) get their stage and next-call date refreshed,
            with an activity note instead of a duplicate entry.
          </p>
          <button className="ll-btn ll-btn-primary" onClick={onSync} disabled={syncing} style={{ marginTop: 14 }}>
            {syncing ? <Loader2 size={15} className="ll-spin" /> : <RefreshCw size={15} />}
            {syncing ? "Syncing…" : "Sync from Google Calendar"}
          </button>
          <p className="ll-copy" style={{ marginTop: 10, fontSize: 12 }}>
            When running locally, needs the sync server on port 3001 (connected once via
            <code style={{ marginLeft: 4 }}>localhost:3001/auth</code>). On the deployed site,
            this connects automatically via <code style={{ marginLeft: 4 }}>/api/calendar-events</code>.
          </p>
        </section>

        <section className="ll-card">
          <div className="ll-card-title">Sync log</div>
          {log.length === 0 && <div className="ll-empty">No syncs yet — run one to see results here.</div>}
          <div className="ll-synclog">
            {log.map((entry, i) => (
              <div className="ll-synclog-row" key={i}>
                <span className="ll-synclog-time">{entry.time}</span>
                {entry.error ? (
                  <span className="ll-due-rust">Failed — {entry.error}</span>
                ) : (
                  <span>{entry.found} matched · {entry.added} added · {entry.updated} updated</span>
                )}
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

function PageHeader({ eyebrow, title, subtitle, action }) {
  return (
    <div className="ll-pagehead">
      <div>
        <div className="ll-eyebrow">{eyebrow}</div>
        <h1 className="ll-title">{title}</h1>
        <p className="ll-subtitle">{subtitle}</p>
      </div>
      {action}
    </div>
  );
}

function AppModal({ draft, setDraft, onSave, onClose }) {
  const set = (k) => (e) => setDraft(d => ({ ...d, [k]: e.target.value }));
  return (
    <div className="ll-overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="ll-modal">
        <div className="ll-modal-head">
          <div>
            <div className="ll-eyebrow">{draft.id ? "Edit entry" : "New entry"}</div>
            <h2 className="ll-modal-title">{draft.id ? draft.company : "Add an application"}</h2>
          </div>
          <button className="ll-iconbtn" onClick={onClose}><X size={16} /></button>
        </div>

        <div className="ll-form">
          <div className="ll-field">
            <label><Building2 size={12} /> Company</label>
            <input value={draft.company} onChange={set("company")} placeholder="Acme Corp" autoFocus />
          </div>
          <div className="ll-field">
            <label><Briefcase size={12} /> Job title</label>
            <input value={draft.jobTitle} onChange={set("jobTitle")} placeholder="Senior Frontend Engineer" />
          </div>
          <div className="ll-field">
            <label><User size={12} /> Recruiter name</label>
            <input value={draft.recruiterName} onChange={set("recruiterName")} placeholder="Jane Doe" />
          </div>
          <div className="ll-field-row">
            <div className="ll-field">
              <label><Mail size={12} /> Recruiter email</label>
              <input value={draft.recruiterEmail} onChange={set("recruiterEmail")} placeholder="jane@acme.com" />
            </div>
            <div className="ll-field">
              <label><Phone size={12} /> Recruiter phone</label>
              <input value={draft.recruiterPhone} onChange={set("recruiterPhone")} placeholder="+92 3xx xxxxxxx" />
            </div>
          </div>
          <div className="ll-field-row">
            <div className="ll-field">
              <label>Stage</label>
              <select value={draft.stage} onChange={set("stage")}>
                {STAGES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div className="ll-field">
              <label>Source</label>
              <select value={draft.platform} onChange={set("platform")}>
                {PLATFORMS.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>
          <div className="ll-field-row">
            <div className="ll-field">
              <label><DollarSign size={12} /> Salary (annual)</label>
              <input type="number" min="0" value={draft.salary} onChange={set("salary")} placeholder="0" />
            </div>
            <div className="ll-field">
              <label><CalendarDays size={12} /> Next call</label>
              <input type="datetime-local" value={draft.nextCall} onChange={set("nextCall")} />
            </div>
          </div>
          <div className="ll-field">
            <label><LinkIcon size={12} /> Job posting URL</label>
            <input value={draft.jobUrl} onChange={set("jobUrl")} placeholder="https://…" />
          </div>
          <div className="ll-field">
            <label>Notes</label>
            <textarea rows={3} value={draft.notes} onChange={set("notes")} placeholder="Interview prep, questions asked, next steps…" />
          </div>

          {draft.activity && draft.activity.length > 0 && (
            <div className="ll-field">
              <label>Activity</label>
              <div className="ll-activity">
                {draft.activity.slice().reverse().map((a, i) => (
                  <div key={i} className="ll-activity-row"><ChevronRight size={12} />{a}</div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="ll-modal-foot">
          <button className="ll-btn" onClick={onClose}>Cancel</button>
          <button className="ll-btn ll-btn-primary" onClick={onSave}>{draft.id ? "Save changes" : "Add application"}</button>
        </div>
      </div>
    </div>
  );
}

function ConfirmModal({ text, onCancel, onConfirm }) {
  return (
    <div className="ll-overlay" onMouseDown={(e) => e.target === e.currentTarget && onCancel()}>
      <div className="ll-modal ll-modal-sm">
        <p className="ll-copy" style={{ marginTop: 4 }}>{text}</p>
        <div className="ll-modal-foot">
          <button className="ll-btn" onClick={onCancel}>Cancel</button>
          <button className="ll-btn ll-btn-danger" onClick={onConfirm}>Delete</button>
        </div>
      </div>
    </div>
  );
}

function Style() {
  return (
    <style>{`
      @import url('https://fonts.googleapis.com/css2?family=Source+Serif+4:opsz,wght@8..60,500;8..60,600&family=Inter:wght@400;500;600&family=IBM+Plex+Mono:wght@400;500&display=swap');

      .ll-root {
        --ink: #1C2430;
        --ink-soft: #667085;
        --paper: #ECEFE9;
        --card: #FFFFFF;
        --line: #DBDFD5;
        --accent: #C97A2B;
        --teal: #2F6F63;
        --rust: #B5482A;
        display: flex;
        min-height: 100%;
        width: 100%;
        background: var(--paper);
        color: var(--ink);
        font-family: 'Inter', system-ui, sans-serif;
        font-size: 14px;
      }
      .ll-root * { box-sizing: border-box; }
      .ll-spin { animation: ll-spin 1s linear infinite; }
      @keyframes ll-spin { to { transform: rotate(360deg); } }

      .ll-sidebar {
        width: 220px; flex-shrink: 0; background: var(--ink); color: #E8E9E3;
        display: flex; flex-direction: column; padding: 22px 16px; gap: 24px;
      }
      .ll-brand { display: flex; align-items: center; gap: 10px; }
      .ll-brand-name { font-family: 'Source Serif 4', serif; font-size: 18px; font-weight: 600; letter-spacing: 0.2px; }
      .ll-brand-sub { font-size: 11px; color: #9AA0AC; text-transform: uppercase; letter-spacing: 0.08em; }
      .ll-nav { display: flex; flex-direction: column; gap: 2px; }
      .ll-navitem {
        display: flex; align-items: center; gap: 10px; padding: 9px 10px; border-radius: 6px;
        background: transparent; border: none; color: #C6CAD2; font-size: 13px; cursor: pointer; text-align: left;
        font-family: inherit;
      }
      .ll-navitem:hover { background: rgba(255,255,255,0.06); }
      .ll-navitem-active { background: rgba(255,255,255,0.1); color: #fff; }
      .ll-navcount { margin-left: auto; font-family: 'IBM Plex Mono', monospace; font-size: 11px; color: #9AA0AC; }
      .ll-sidebar-foot { margin-top: auto; display: flex; flex-direction: column; gap: 10px; padding-top: 16px; border-top: 1px solid rgba(255,255,255,0.12); }
      .ll-mini-stat { display: flex; flex-direction: column; gap: 2px; font-size: 11px; color: #9AA0AC; }
      .ll-mini-stat strong { font-family: 'IBM Plex Mono', monospace; font-size: 15px; color: #E8E9E3; }

      .ll-main { flex: 1; overflow-y: auto; padding: 32px 40px 60px; }
      .ll-page { max-width: 980px; margin: 0 auto; }
      .ll-pagehead { display: flex; align-items: flex-end; justify-content: space-between; margin-bottom: 22px; gap: 16px; }
      .ll-eyebrow { font-size: 11px; text-transform: uppercase; letter-spacing: 0.1em; color: var(--ink-soft); font-family: 'IBM Plex Mono', monospace; }
      .ll-title { font-family: 'Source Serif 4', serif; font-size: 30px; font-weight: 600; margin: 4px 0 2px; }
      .ll-subtitle { color: var(--ink-soft); font-size: 13.5px; margin: 0; }
      .ll-copy { color: #3A4250; line-height: 1.6; font-size: 13.5px; }
      .ll-list { color: #3A4250; line-height: 1.7; font-size: 13.5px; padding-left: 18px; }
      .ll-list code { background: var(--paper); padding: 1px 5px; border-radius: 4px; font-family: 'IBM Plex Mono', monospace; font-size: 12px; }

      .ll-statgrid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 20px; }
      .ll-statcard { background: var(--card); border: 1px solid var(--line); border-radius: 10px; padding: 16px; }
      .ll-statcard-top { display: flex; align-items: center; gap: 6px; color: var(--ink-soft); font-size: 12px; margin-bottom: 8px; }
      .ll-statcard-value { font-family: 'IBM Plex Mono', monospace; font-size: 22px; font-weight: 500; }

      .ll-splitgrid { display: grid; grid-template-columns: 1.15fr 0.85fr; gap: 16px; }
      .ll-card { background: var(--card); border: 1px solid var(--line); border-radius: 10px; padding: 20px; }
      .ll-card-title { font-family: 'Source Serif 4', serif; font-size: 16px; font-weight: 600; margin-bottom: 14px; }

      .ll-funnel { display: flex; flex-direction: column; gap: 10px; }
      .ll-funnel-row { display: grid; grid-template-columns: 20px 92px 1fr 22px; align-items: center; gap: 10px; }
      .ll-funnel-num { font-family: 'IBM Plex Mono', monospace; font-size: 11px; color: var(--ink-soft); }
      .ll-funnel-label { font-size: 12.5px; }
      .ll-funnel-track { height: 8px; background: var(--paper); border-radius: 4px; overflow: hidden; }
      .ll-funnel-fill { display: block; height: 100%; border-radius: 4px; }
      .ll-funnel-count { font-family: 'IBM Plex Mono', monospace; font-size: 12px; text-align: right; }

      .ll-followlist { display: flex; flex-direction: column; gap: 2px; }
      .ll-followrow { display: flex; align-items: center; gap: 8px; padding: 9px 4px; border-bottom: 1px dashed var(--line); }
      .ll-followrow:last-child { border-bottom: none; }
      .ll-followrow-main { display: flex; align-items: center; gap: 8px; background: none; border: none; cursor: pointer; padding: 0; font-family: inherit; flex: 1; min-width: 0; text-align: left; }
      .ll-followrow-name { font-weight: 500; font-size: 13px; white-space: nowrap; }
      .ll-followrow-company { color: var(--ink-soft); font-size: 12px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
      .ll-dot { width: 6px; height: 6px; border-radius: 50%; background: var(--accent); flex-shrink: 0; }
      .ll-dot-rust { background: var(--rust); }
      .ll-due { display: flex; align-items: center; gap: 4px; font-family: 'IBM Plex Mono', monospace; font-size: 11px; color: var(--ink-soft); white-space: nowrap; }
      .ll-due-rust { color: var(--rust); }
      .ll-empty { color: var(--ink-soft); font-size: 13px; padding: 6px 0; }

      .ll-toolbar { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 14px; flex-wrap: wrap; }
      .ll-search { display: flex; align-items: center; gap: 8px; background: var(--card); border: 1px solid var(--line); border-radius: 8px; padding: 8px 12px; min-width: 240px; }
      .ll-search input { border: none; outline: none; background: none; font-family: inherit; font-size: 13px; width: 100%; color: var(--ink); }
      .ll-chips { display: flex; gap: 6px; flex-wrap: wrap; }
      .ll-chip { border: 1px solid var(--line); background: var(--card); border-radius: 999px; padding: 6px 12px; font-size: 12px; cursor: pointer; color: var(--ink-soft); font-family: inherit; }
      .ll-chip-active { background: var(--ink); color: #fff; border-color: var(--ink); }

      .ll-ledgercard { padding: 8px 20px 12px; }
      .ll-ledger-head, .ll-ledger-row {
        display: grid; grid-template-columns: 34px 1.6fr 110px 90px 110px 124px;
        align-items: center; gap: 8px; padding: 11px 4px;
      }
      .ll-ledger-head { font-size: 11px; text-transform: uppercase; letter-spacing: 0.06em; color: var(--ink-soft); border-bottom: 1px solid var(--line); }
      .ll-ledger-row { border-bottom: 1px dashed var(--line); }
      .ll-ledger-row:last-child { border-bottom: none; }
      .ll-ledger-serial { font-family: 'IBM Plex Mono', monospace; font-size: 11px; color: var(--ink-soft); }
      .ll-ledger-lead { display: flex; flex-direction: column; align-items: flex-start; background: none; border: none; cursor: pointer; padding: 0; font-family: inherit; text-align: left; min-width: 0; }
      .ll-ledger-name { font-weight: 500; font-size: 13.5px; }
      .ll-ledger-company { color: var(--ink-soft); font-size: 12px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
      .ll-badge { border: 1px solid; border-radius: 999px; padding: 3px 9px; font-size: 11px; width: fit-content; }
      .ll-ledger-value { font-family: 'IBM Plex Mono', monospace; font-size: 12.5px; }
      .ll-ledger-due { font-family: 'IBM Plex Mono', monospace; font-size: 12px; color: var(--ink-soft); }
      .ll-ledger-actions { display: flex; gap: 4px; justify-content: flex-end; }

      .ll-iconbtn { border: 1px solid var(--line); background: var(--card); border-radius: 6px; width: 26px; height: 26px; display: flex; align-items: center; justify-content: center; cursor: pointer; color: var(--ink-soft); flex-shrink: 0; }
      .ll-iconbtn:hover { color: var(--ink); border-color: var(--ink-soft); }
      .ll-iconbtn-danger:hover { color: var(--rust); border-color: var(--rust); }

      .ll-btn { display: inline-flex; align-items: center; gap: 7px; border: 1px solid var(--line); background: var(--card); color: var(--ink); border-radius: 7px; padding: 9px 14px; font-size: 13px; cursor: pointer; font-family: inherit; }
      .ll-btn-primary { background: var(--ink); color: #fff; border-color: var(--ink); }
      .ll-btn-primary:disabled { opacity: 0.6; cursor: default; }
      .ll-btn-danger { background: var(--rust); color: #fff; border-color: var(--rust); }

      .ll-synclog { display: flex; flex-direction: column; gap: 8px; }
      .ll-synclog-row { display: flex; justify-content: space-between; gap: 10px; font-size: 12.5px; padding: 8px 0; border-bottom: 1px dashed var(--line); }
      .ll-synclog-row:last-child { border-bottom: none; }
      .ll-synclog-time { font-family: 'IBM Plex Mono', monospace; color: var(--ink-soft); }

      .ll-overlay { position: fixed; inset: 0; background: rgba(28,36,48,0.45); display: flex; align-items: center; justify-content: center; z-index: 50; padding: 20px; }
      .ll-modal { background: var(--card); border-radius: 12px; width: 100%; max-width: 480px; max-height: 88vh; overflow-y: auto; padding: 22px 24px; }
      .ll-modal-sm { max-width: 380px; }
      .ll-modal-head { display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 16px; }
      .ll-modal-title { font-family: 'Source Serif 4', serif; font-size: 20px; font-weight: 600; margin: 2px 0 0; }
      .ll-form { display: flex; flex-direction: column; gap: 12px; }
      .ll-field { display: flex; flex-direction: column; gap: 5px; }
      .ll-field-row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
      .ll-field label { font-size: 11.5px; color: var(--ink-soft); display: flex; align-items: center; gap: 4px; }
      .ll-field input, .ll-field select, .ll-field textarea {
        border: 1px solid var(--line); border-radius: 7px; padding: 9px 10px; font-size: 13.5px; font-family: inherit; color: var(--ink); background: #fff; outline: none; resize: vertical;
      }
      .ll-field input:focus, .ll-field select:focus, .ll-field textarea:focus { border-color: var(--ink-soft); }
      .ll-activity { display: flex; flex-direction: column; gap: 6px; background: var(--paper); border-radius: 8px; padding: 10px 12px; max-height: 130px; overflow-y: auto; }
      .ll-activity-row { display: flex; align-items: flex-start; gap: 4px; font-size: 12px; color: #3A4250; }
      .ll-modal-foot { display: flex; justify-content: flex-end; gap: 8px; margin-top: 18px; }

      .ll-toast {
        position: fixed; bottom: 22px; left: 50%; transform: translateX(-50%);
        background: var(--ink); color: #fff; padding: 10px 16px; border-radius: 8px;
        font-size: 13px; display: flex; align-items: center; gap: 8px; z-index: 100;
        box-shadow: 0 8px 24px rgba(0,0,0,0.2);
      }
      .ll-toast-warn { background: var(--rust); }

      @media (max-width: 760px) {
        .ll-root { flex-direction: column; }
        .ll-sidebar { width: 100%; flex-direction: row; align-items: center; padding: 14px 16px; }
        .ll-nav { flex-direction: row; }
        .ll-sidebar-foot { display: none; }
        .ll-main { padding: 20px; }
        .ll-statgrid { grid-template-columns: 1fr 1fr; }
        .ll-splitgrid { grid-template-columns: 1fr; }
        .ll-ledger-head { display: none; }
        .ll-ledger-row { grid-template-columns: 1fr; row-gap: 6px; padding: 14px 4px; }
        .ll-ledger-actions { justify-content: flex-start; }
      }
    `}</style>
  );
}