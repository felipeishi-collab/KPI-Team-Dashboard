import {
  Routes,
  Route,
  Navigate,
} from "react-router-dom";

import Login from "../pages/Login/Login";
import Dashboard from "../pages/Dashboard/Dashboard";
import BAU from "../pages/BAU/BAU";
import Barometro from "../pages/Barometro/Barometro";
import ProtectedRoute from "../components/ProtectedRoute";

function AppRoutes() {
  return (
    <Routes>

      <Route
        path="/"
        element={
          <Navigate
            to="/login"
            replace
          />
        }
      />

      <Route
        path="/login"
        element={<Login />}
      />

      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        }
      />

      <Route
        path="/bau"
        element={
          <ProtectedRoute>
            <BAU />
          </ProtectedRoute>
        }
      />

      <Route
        path="/barometro"
        element={
          <ProtectedRoute>
            <Barometro />
          </ProtectedRoute>
        }
      />

      <Route
        path="*"
        element={
          <Navigate
            to="/login"
            replace
          />
        }
      />

    </Routes>
  );
}

export default AppRoutes;