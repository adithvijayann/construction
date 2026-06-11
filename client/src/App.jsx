import { Navigate, Route, Routes } from "react-router-dom";
import { AppShell } from "./components/AppShell.jsx";
import { Loading } from "./components/Loading.jsx";
import { useAuth } from "./context/AuthContext.jsx";
import { LogDetail } from "./pages/LogDetail.jsx";
import { Login } from "./pages/Login.jsx";
import { ProjectDetail } from "./pages/ProjectDetail.jsx";
import { Projects } from "./pages/Projects.jsx";
import { Profile } from "./pages/Profile.jsx";

const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return <Loading label="Checking session" />;
  if (!user) return <Navigate to="/login" replace />;
  return children;
};

const PublicRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return <Loading label="Checking session" />;
  if (user) return <Navigate to="/projects" replace />;
  return children;
};

export const App = () => (
  <Routes>
    <Route
      path="/login"
      element={
        <PublicRoute>
          <Login />
        </PublicRoute>
      }
    />
    <Route path="/register" element={<Navigate to="/login" replace />} />
    <Route
      element={
        <ProtectedRoute>
          <AppShell />
        </ProtectedRoute>
      }
    >
      <Route path="/projects" element={<Projects />} />
      <Route path="/settings" element={<Profile />} />
      <Route path="/projects/:projectId" element={<ProjectDetail />} />
      <Route path="/logs/:logId" element={<LogDetail />} />
    </Route>
    <Route path="*" element={<Navigate to="/projects" replace />} />
  </Routes>
);
