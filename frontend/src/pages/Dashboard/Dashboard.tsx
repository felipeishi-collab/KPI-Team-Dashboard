import {
  Truck,
  MapPin,
  Warehouse,
  DollarSign,
  ArrowRight,
  Star,
} from "lucide-react";

import { useNavigate } from "react-router-dom";

import Sidebar from "../../components/layout/Sidebar";
import Topbar from "../../components/layout/Topbar";

import "./Dashboard.css";

const areas = [
  {
    title: "BAU",
    description:
      "Visão geral da operação, volumes, SLAs e performance.",
    icon: Truck,
    path: "/bau",
  },
];

function Dashboard() {
  const navigate = useNavigate();

  const storedUser = localStorage.getItem("kpi_user");

  const user = storedUser
    ? JSON.parse(storedUser)
    : null;

  const userName = user?.name || "Usuário";
  const userEmail = user?.email || "";

  return (
    <div className="dashboard-layout">

      <Sidebar />

      <Topbar
        userName={userName}
        userEmail={userEmail}
      />

      <main className="dashboard-content">

        {/* ==================================================
            HERO
            ================================================== */}

        <section className="dashboard-hero">

          <div className="hero-text">

            <span className="hero-welcome">
              KPI Team Dashboard
            </span>

            <h1>
              Olá, {userName}! 👋
            </h1>

            <p>
              Acesse nossos dashboards e acompanhe
              os principais indicadores da operação.
            </p>

          </div>

          <div className="dashboard-status">

            <div className="status-indicator" />

            <div>
              <strong>Dados atualizados</strong>
              <span>Em tempo real</span>
            </div>

          </div>

        </section>

        {/* ==================================================
            PRINCIPAIS ÁREAS
            ================================================== */}

        <section className="areas-section">

          <div className="section-header">

            <div>

              <h2>
                Principais Áreas
              </h2>

              <p>
                Selecione uma área para visualizar
                os dashboards e indicadores.
              </p>

            </div>

          </div>

          <div className="areas-grid">

            {areas.map((area) => {

              const Icon = area.icon;

              return (
                <button
                  key={area.title}
                  className="area-card"
                  onClick={() => navigate(area.path)}
                >

                  <div className="area-icon">
                    <Icon size={30} />
                  </div>

                  <div className="area-content">

                    <h3>
                      {area.title}
                    </h3>

                    <p>
                      {area.description}
                    </p>

                  </div>

                  <ArrowRight
                    className="area-arrow"
                    size={21}
                  />

                </button>
              );

            })}

          </div>

        </section>

        {/* ==================================================
            FAVORITOS
            ================================================== */}

        <section className="favorites-section">

          <div className="favorites-header">

            <div className="favorites-title">

              <Star size={23} />

              <div>

                <h2>
                  Favoritos
                </h2>

                <p>
                  Acesse rapidamente seus dashboards
                  mais utilizados.
                </p>

              </div>

            </div>

            <button>
              Ver todos
              <ArrowRight size={17} />
            </button>

          </div>

          <div className="favorites-list">

            <button>
              <MapPin size={17} />
              Last Mile - Entregas
            </button>

            <button>
              <Truck size={17} />
              Operacional - Visão Geral
            </button>

            <button>
              <DollarSign size={17} />
              Financeiro - Multas
            </button>

            <button>
              <Warehouse size={17} />
              Hub - Processamento
            </button>

          </div>

        </section>

      </main>

    </div>
  );
}

export default Dashboard;