import "./Login.css";

import { GoogleLogin } from "@react-oauth/google";
import { useNavigate } from "react-router-dom";

function Login() {
  const navigate = useNavigate();

  const handleGoogleSuccess = async (
    credentialResponse: any
  ) => {
    console.log(
      "Google respondeu:",
      credentialResponse
    );

    const credential =
      credentialResponse.credential;

    if (!credential) {
      console.error(
        "Google não retornou credential"
      );

      return;
    }

    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/api/auth/google`,
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

      console.log(
        "================================="
      );

      console.log(
        "RESPOSTA DO BACKEND"
      );

      console.log(
        "Status:",
        response.status
      );

      console.log(
        "OK:",
        response.ok
      );

      console.log(
        "Data:",
        data
      );

      console.log(
        "================================="
      );

      // ========================================
      // LOGIN NEGADO
      // ========================================

      if (!response.ok || !data.success) {
        console.error(
          "LOGIN NEGADO:",
          data.message
        );

        alert(
          `Login negado: ${data.message}`
        );

        return;
      }

      // ========================================
      // LOGIN APROVADO
      // ========================================

      console.log(
        "LOGIN APROVADO!"
      );

      console.log(
        "Usuário recebido:",
        data.user
      );

      // Salva os dados do usuário
      localStorage.setItem(
        "kpi_user",
        JSON.stringify(data.user)
      );

      console.log(
        "Usuário salvo no localStorage"
      );

      console.log(
        "Navegando para /dashboard..."
      );

      // Vai para o Dashboard
      navigate("/dashboard");

    } catch (error) {
      console.error(
        "ERRO AO CONECTAR COM O BACKEND:",
        error
      );

      alert(
        "Não foi possível conectar ao servidor."
      );
    }
  };

  return (
    <div className="login-page">

      {/* ========================================
          PAINEL ESQUERDO
          ======================================== */}

      <section className="login-brand">

        <div className="brand-content">

          <div className="brand-title">

            <div className="brand-icon">

              <svg
                viewBox="0 0 64 64"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >

                <path
                  d="M32 6L53 18V42L32 54L11 42V18L32 6Z"
                  stroke="currentColor"
                  strokeWidth="4"
                  strokeLinejoin="round"
                />

                <path
                  d="M11 18L32 30L53 18"
                  stroke="currentColor"
                  strokeWidth="4"
                  strokeLinejoin="round"
                />

                <path
                  d="M32 30V54"
                  stroke="currentColor"
                  strokeWidth="4"
                />

              </svg>

            </div>

            <h1>
              KPI Team Dashboard
            </h1>

          </div>

          <div className="brand-line" />

        </div>

        {/* MAPA / ROTA */}

        <div className="map-area">

          <div className="map-grid" />

          <svg
            className="route-svg"
            viewBox="0 0 700 300"
            preserveAspectRatio="none"
          >

            <path
              d="
                M80 220
                C170 220 150 190 250 190
                C350 190 330 150 420 150
                C500 150 480 110 590 110
              "
              fill="none"
              stroke="currentColor"
              strokeWidth="4"
            />

          </svg>

          <div className="route-point point-1">
            <span />
          </div>

          <div className="route-point point-2">
            <span />
          </div>

        </div>

      </section>

      {/* ========================================
          PAINEL DIREITO
          ======================================== */}

      <section className="login-area">

        <div className="login-card">

          {/* ÍCONE */}

          <div className="lock-container">

            <svg
              viewBox="0 0 64 64"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >

              <rect
                x="17"
                y="28"
                width="30"
                height="25"
                rx="3"
                stroke="currentColor"
                strokeWidth="4"
              />

              <path
                d="
                  M23 28V20
                  C23 15.0294 27.0294 11 32 11
                  C36.9706 11 41 15.0294 41 20
                  V28
                "
                stroke="currentColor"
                strokeWidth="4"
                strokeLinecap="round"
              />

            </svg>

          </div>

          <h2>
            Entrar
          </h2>

          <p className="login-description">
            Acesse sua conta para continuar
          </p>

          {/* ====================================
              GOOGLE LOGIN
              ==================================== */}

          <div className="google-login-wrapper">

            <button
              className="google-button"
              type="button"
            >

              <svg
                className="google-icon"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >

                <path
                  fill="#4285F4"
                  d="
                    M21.35 12.23
                    c0-.79-.07-1.55-.23-2.27H12
                    v4.3h5.24
                    a4.48 4.48 0 0 1-1.94 2.94
                    v2.45h3.14
                    c1.84-1.69 2.91-4.18 2.91-7.42Z
                  "
                />

                <path
                  fill="#34A853"
                  d="
                    M12 21.6
                    c2.63 0 4.84-.87 6.45-2.35
                    l-3.14-2.45
                    c-.87.58-1.98.92-3.31.92
                    -2.54 0-4.7-1.72-5.47-4.03
                    H3.28v2.53
                    A9.74 9.74 0 0 0 12 21.6Z
                  "
                />

                <path
                  fill="#FBBC05"
                  d="
                    M6.53 13.69
                    A5.85 5.85 0 0 1 6.22 12
                    c0-.59.1-1.16.31-1.69
                    V7.78H3.28
                    A9.72 9.72 0 0 0 2.25 12
                    c0 1.57.38 3.06 1.03 4.22
                    l3.25-2.53Z
                  "
                />

                <path
                  fill="#EA4335"
                  d="
                    M12 6.28
                    c1.43 0 2.72.49 3.74 1.45
                    l2.8-2.8
                    C16.84 3.35 14.63 2.4 12 2.4
                    a9.74 9.74 0 0 0-8.72 5.38
                    l3.25 2.53
                    C7.3 8 9.46 6.28 12 6.28Z
                  "
                />

              </svg>

              <span>
                Entrar com Google
              </span>

            </button>

            <div className="google-login-overlay">

              <GoogleLogin
                onSuccess={handleGoogleSuccess}
                onError={() => {
                  console.error(
                    "Erro ao realizar login com Google"
                  );
                }}
                useOneTap={false}
              />

            </div>

          </div>

          {/* ====================================
              RESTRIÇÃO DE CONTA
              ==================================== */}

          <div className="account-restriction">

            <div className="restriction-line" />

            <span>
              Apenas contas
            </span>

            <div className="restriction-line" />

          </div>

          <div className="company-domain">
            @shopee.com
          </div>

        </div>

        {/* FOOTER */}

        <footer>
          © 2026 Shopee. Todos os direitos reservados.
        </footer>

      </section>

    </div>
  );
}

export default Login;