import {
  Search,
  Bell,
  ChevronDown,
} from "lucide-react";

import "./Topbar.css";

interface TopbarProps {
  userName: string;
  userEmail: string;
}

function Topbar({
  userName,
  userEmail,
}: TopbarProps) {

  const initials = userName
    .split(" ")
    .map((name) => name[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <header className="topbar">

      {/* BUSCA */}

      <div className="topbar-search">

        <Search size={19} />

        <input
          type="text"
          placeholder="Buscar KPI, relatório, métrica..."
        />

      </div>

      {/* AÇÕES */}

      <div className="topbar-actions">

        <button className="notification-button">

          <Bell size={20} />

          <span />

        </button>

        {/* USUÁRIO */}

        <div className="user-profile">

          <div className="user-avatar">
            {initials}
          </div>

          <div className="user-info">

            <strong>
              {userName}
            </strong>

            <small>
              {userEmail}
            </small>

          </div>

          <ChevronDown size={17} />

        </div>

      </div>

    </header>
  );
}

export default Topbar;