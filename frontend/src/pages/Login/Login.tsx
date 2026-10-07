import "./Login.css";

import { useEffect } from "react";
import {
  GoogleLogin,
  type CredentialResponse,
} from "@react-oauth/google";
import { useNavigate } from "react-router-dom";

import {
  getCurrentUser,
  saveSession,
} from "../../utils/session";

function Login() {
  const navigate = useNavigate();

  // Se já tem sessão válida, vai direto pro dashboard
  useEffect(() => {
    if (getCurrentUser()) {
      navigate("/dashboard", { replace: true });
    }
  }, [navigate]);

  const handleGoogleSuccess = async (
    credentialResponse: CredentialResponse
  ) => {
    const credential =
      credentialResponse.credential;

    if (!credential) {
      alert("O Google não retornou as credenciais.");
      return;
    }

    try {
      const response = await fetch(
        "/api/auth/google",
        {
          method: "POST",

          headers: {
            "Content-Type": "application/json",
          },

          body: JSON.stringify({
            credential,
          }),
        }
      );

      const data = await response.json();

      if (
        !response.ok ||
        !data.success ||
        !data.token
      ) {
        alert(
          `Login negado: ${data.message ?? "não autorizado."}`
        );

        return;
      }

      saveSession(data.token, data.user);

      navigate("/dashboard", { replace: true });
    } catch (error) {
      console.error(
        "Erro ao conectar com o backend:",
        error
      );

      alert(
        "Não foi possível conectar ao servidor."
      );
    }
  };

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="brand-section">
          <img
            src="/logo-shopee-fleet.png"
            alt="Shopee Fleet"
            className="brand-logo"
          />

          <h1 className="app-title">
            KPI Team Dashboard
          </h1>
        </div>

        <p>Faça login com sua conta corporativa</p>

        <div id="google-signin-btn">
          <GoogleLogin
            onSuccess={handleGoogleSuccess}
            onError={() =>
              alert("Falha ao autenticar com o Google.")
            }
            theme="outline"
            size="large"
            width="320"
          />
        </div>

        <div className="domain-info">
          Apenas contas
          <br />
          <strong>@shopee.com</strong>
        </div>

        <div className="login-footer">
          © Shopee Brasil
        </div>
      </div>
    </div>
  );
}

export default Login;