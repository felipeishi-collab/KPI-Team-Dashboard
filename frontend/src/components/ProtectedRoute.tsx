import { Navigate } from "react-router-dom";

import { getCurrentUser } from "../utils/session";

interface ProtectedRouteProps {
  children: React.ReactNode;
}

// Só renderiza a página se houver sessão válida no navegador. É um gate
// de UI; a restrição de verdade é o requireAuth do backend.
function ProtectedRoute({
  children,
}: ProtectedRouteProps) {
  if (!getCurrentUser()) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

export default ProtectedRoute;
