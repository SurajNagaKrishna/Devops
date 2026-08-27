import { useEffect, useState } from "react";
import { BrowserRouter, Routes, Route, Navigate, Outlet, useLocation } from "react-router-dom";
import Login               from "./pages/Login";
import LandingPage         from "./pages/LandingPage";
import AdminDashboard      from "./pages/AdminDashboard";
import Overview            from "./pages/Overview";
import Teams               from "./pages/Teams";
import CreateTeam          from "./pages/CreateTeam";
import RegisterUser        from "./pages/Registeruser";
import ManagerDashboard    from "./pages/ManagerDashboard";
import ManagerOverview     from "./pages/Manageroverview";
import ManagerTeam         from "./pages/Managerteam";
import ManagerTasks        from "./pages/Managertasks";
import EmployeeDashboard   from "./pages/Employeedashboard";
import EmployeeOverview    from "./pages/Employeeoverview";
import EmployeeTasks       from "./pages/Employeetasks";
import EmployeeTeam        from "./pages/Employeeteam";
import EmployeeInvitations from "./pages/Employeeinvitations";
import api from "./services/api";
import "./styles/global.css";

function ProtectedRoute({ roles }) {
  const location = useLocation();
  const [state, setState] = useState({ loading: true, user: null });

  useEffect(() => {
    let active = true;
    api.get("/auth/me")
      .then(({ data }) => {
        if (active) setState({ loading: false, user: data.user });
      })
      .catch(() => {
        if (active) setState({ loading: false, user: null });
      });
    return () => { active = false; };
  }, []);

  if (state.loading) return <div className="route-loading">Loading...</div>;
  if (!state.user) return <Navigate to="/" replace state={{ from: location }} />;
  if (roles && !roles.includes(state.user.role)) return <Navigate to="/" replace />;
  return <Outlet />;
}

function AuthenticatedLanding() {
  const [state, setState] = useState({ loading: true, user: null });

  useEffect(() => {
    let active = true;
    api.get("/auth/me")
      .then(({ data }) => {
        if (active) setState({ loading: false, user: data.user });
      })
      .catch(() => {
        if (active) setState({ loading: false, user: null });
      });
    return () => { active = false; };
  }, []);

  if (state.loading) return <div className="route-loading">Loading...</div>;
  if (!state.user) return <LandingPage />;
  if (state.user.role === "Admin") return <Navigate to="/admin" replace />;
  if (state.user.role === "Team Manager") return <Navigate to="/manager" replace />;
  if (state.user.role === "Employee") return <Navigate to="/employee" replace />;
  return <LandingPage />;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public */}
        <Route path="/" element={<AuthenticatedLanding />} />

        {/* Admin */}
        <Route element={<ProtectedRoute roles={["Admin"]} />}>
          <Route path="/admin" element={<AdminDashboard />}>
          <Route index             element={<Overview />} />
          <Route path="teams"      element={<Teams />} />
          <Route path="teams/create" element={<CreateTeam />} />
          <Route path="register"   element={<RegisterUser />} />
          </Route>
        </Route>

        {/* Team Manager */}
        <Route element={<ProtectedRoute roles={["Team Manager"]} />}>
          <Route path="/manager" element={<ManagerDashboard />}>
          <Route index        element={<ManagerOverview />} />
          <Route path="team"  element={<ManagerTeam />} />
          <Route path="tasks" element={<ManagerTasks />} />
          </Route>
        </Route>

        {/* Employee */}
        <Route element={<ProtectedRoute roles={["Employee"]} />}>
          <Route path="/employee" element={<EmployeeDashboard />}>
          <Route index               element={<EmployeeOverview />} />
          <Route path="tasks"        element={<EmployeeTasks />} />
          <Route path="team"         element={<EmployeeTeam />} />
          <Route path="invitations"  element={<EmployeeInvitations />} />
          </Route>
        </Route>

        {/* Catch-all */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}