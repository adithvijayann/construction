import { BarChart3, Bell, Building2, CircleHelp, Construction, FileText, HardHat, LogOut, Menu, Search, Settings, ShieldCheck, UserRound, Users } from "lucide-react";
import { useState } from "react";
import { Link, NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import { StatusBadge } from "./StatusBadge.jsx";

export const AppShell = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate("/login", { replace: true });
  };

  if (user?.role === "contractor") {
    return (
      <div className="app-shell contractor-shell">
        <aside className={`sidebar contractor-sidebar ${open ? "sidebar-open" : ""}`}>
          <Link className="contractor-brand" to="/projects">
            <span className="contractor-brand-mark">
              <Building2 size={24} />
            </span>
            <span>
              <strong>ConstructPro</strong>
              <small>Contractor Admin</small>
            </span>
          </Link>

          <nav className="contractor-side-nav" aria-label="Main navigation">
            <NavLink to="/projects">
              <BarChart3 size={19} />
              Dashboard
            </NavLink>
            <a href="#contractor-portfolio">
              <Construction size={19} />
              Projects
            </a>
            <a href="#contractor-client-form">
              <Users size={19} />
              Clients
            </a>
            <a href="#contractor-supervisor-form">
              <HardHat size={19} />
              Staff
            </a>
            <a href="#contractor-expense-summary">
              <FileText size={19} />
              Reports
            </a>
          </nav>

          <div className="contractor-sidebar-footer">
            <div className="contractor-site-card">
              <span>Project Alpha</span>
              <strong>Site 402-B</strong>
            </div>
            <a href="#support">
              <CircleHelp size={19} />
              Support
            </a>
            <button type="button" onClick={handleLogout}>
              <LogOut size={19} />
              Logout
            </button>
          </div>
        </aside>

        <main className="workspace contractor-workspace">
          <header className="contractor-topbar">
            <div className="contractor-topbar-left">
              <button className="icon-button mobile-only" type="button" onClick={() => setOpen((value) => !value)} title="Toggle menu">
                <Menu size={20} />
              </button>
              <h1>Industrial Integrity</h1>
            </div>
            <div className="contractor-top-search">
              <Search size={17} />
              <input placeholder="Search projects, logs, or teams..." />
            </div>
            <div className="contractor-top-actions">
              <button type="button" title="Notifications"><Bell size={20} /></button>
              <Link to="/settings" title="Settings"><Settings size={20} /></Link>
              <span className="contractor-profile-avatar">{user?.name?.slice(0, 1)?.toUpperCase() || "C"}</span>
            </div>
          </header>
          <Outlet />
        </main>
        <a className="contractor-mobile-fab" href="#contractor-project-form" title="New project">
          +
        </a>
        <nav className="contractor-mobile-nav" aria-label="Contractor quick navigation">
          <a href="#contractor-dashboard-top"><BarChart3 size={19} /><span>Home</span></a>
          <a href="#contractor-portfolio"><Construction size={19} /><span>Projects</span></a>
          <a href="#contractor-client-form"><Users size={19} /><span>Clients</span></a>
          <a href="#contractor-supervisor-form"><HardHat size={19} /><span>Staff</span></a>
        </nav>
      </div>
    );
  }

  if (user?.role === "supervisor") {
    return (
      <div className="app-shell supervisor-shell">
        <aside className={`sidebar supervisor-sidebar ${open ? "sidebar-open" : ""}`}>
          <Link className="supervisor-brand" to="/projects">
            <span className="supervisor-brand-mark">
              <Building2 size={24} />
            </span>
            <span>
              <strong>Industrial Integrity</strong>
              <small>Precision Site Management</small>
            </span>
          </Link>

          <nav className="supervisor-side-nav" aria-label="Supervisor navigation">
            <NavLink to="/projects">
              <BarChart3 size={19} />
              Dashboard
            </NavLink>
            <a href="#supervisor-worker-form">
              <FileText size={19} />
              Daily Logs
            </a>
            <a href="#supervisor-material-form">
              <Construction size={19} />
              Materials
            </a>
            <a href="#supervisor-progress-form">
              <ShieldCheck size={19} />
              Progress
            </a>
            <a href="#supervisor-reports">
              <FileText size={19} />
              Reports
            </a>
          </nav>

          <div className="supervisor-sidebar-footer">
            <a href="#support">
              <CircleHelp size={19} />
              Support
            </a>
            <button type="button" onClick={handleLogout}>
              <LogOut size={19} />
              Logout
            </button>
          </div>
        </aside>

        <main className="workspace supervisor-workspace">
          <header className="supervisor-topbar">
            <div className="supervisor-topbar-left">
              <button className="icon-button mobile-only" type="button" onClick={() => setOpen((value) => !value)} title="Toggle menu">
                <Menu size={20} />
              </button>
              <Link className="supervisor-top-title" to="/projects">
                Industrial Integrity
              </Link>
              <span className="supervisor-project-chip">
                <Construction size={17} />
                Site Operations
              </span>
            </div>
            <div className="supervisor-top-search">
              <Search size={17} />
              <input placeholder="Search site logs..." />
            </div>
            <div className="supervisor-top-actions">
              <button type="button" title="Notifications">
                <Bell size={20} />
              </button>
              <Link to="/settings" title="Settings">
                <Settings size={20} />
              </Link>
              <span className="supervisor-profile-avatar">{user?.name?.slice(0, 1)?.toUpperCase() || "S"}</span>
            </div>
          </header>
          <Outlet />
        </main>
        <div className="supervisor-quick-actions" aria-label="Supervisor quick actions">
          <a href="#supervisor-progress-form" title="Upload site photo">
            +
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="app-shell">
      <aside className={`sidebar ${open ? "sidebar-open" : ""}`}>
        <Link className="brand" to="/projects">
          <span className="brand-mark">
            <Building2 size={22} />
          </span>
          <span>
            <strong>SiteLog</strong>
            <small>Daily verification</small>
          </span>
        </Link>

        <nav className="side-nav" aria-label="Main navigation">
          <NavLink to="/projects">
            <BarChart3 size={18} />
            Dashboard
          </NavLink>
          <NavLink to="/settings">
            <Settings size={18} />
            Settings
          </NavLink>
        </nav>

        <div className="sidebar-footer">
          <div className="user-chip">
            <UserRound size={18} />
            <span>
              <strong>{user?.name}</strong>
              <StatusBadge value={user?.role} />
            </span>
          </div>
          <button className="ghost-button" type="button" onClick={handleLogout}>
            <LogOut size={17} />
            Sign out
          </button>
        </div>
      </aside>

      <main className="workspace">
        <header className="topbar">
          <button className="icon-button mobile-only" type="button" onClick={() => setOpen((value) => !value)} title="Toggle menu">
            <Menu size={20} />
          </button>
          <div>
            <span className="eyebrow">Construction Site Daily Log</span>
            <h1>Daily site records</h1>
          </div>
          <div className="trust-pill">
            <ShieldCheck size={17} />
            Timestamped logs
          </div>
        </header>
        <Outlet />
      </main>
    </div>
  );
};
