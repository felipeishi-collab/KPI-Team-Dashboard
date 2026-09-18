import {
  Search,
  Bell,
  ChevronDown,
  GitCommit,
} from "lucide-react";

import {
  useEffect,
  useRef,
  useState,
} from "react";

import "./Topbar.css";

interface TopbarProps {
  userName: string;
  userEmail: string;
}

interface CommitInfo {
  hash: string;
  author: string;
  date: string;
  message: string;
}

const LAST_SEEN_COMMIT_KEY =
  "kpi_last_seen_commit";

// ============================================================
// FORMATAÇÃO DE DATA RELATIVA
// ============================================================

function formatRelativeTime(
  dateString: string
) {
  const date = new Date(dateString);
  const diffMs =
    Date.now() - date.getTime();

  const diffMinutes = Math.floor(
    diffMs / 60000
  );

  if (diffMinutes < 1) {
    return "agora mesmo";
  }

  if (diffMinutes < 60) {
    return `há ${diffMinutes} min`;
  }

  const diffHours = Math.floor(
    diffMinutes / 60
  );

  if (diffHours < 24) {
    return `há ${diffHours}h`;
  }

  const diffDays = Math.floor(
    diffHours / 24
  );

  if (diffDays < 30) {
    return `há ${diffDays}d`;
  }

  return date.toLocaleDateString("pt-BR");
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

  // ============================================================
  // NOTIFICAÇÕES (ÚLTIMOS COMMITS DO GIT)
  // ============================================================

  const [
    isNotificationsOpen,
    setIsNotificationsOpen,
  ] = useState(false);

  const [commits, setCommits] = useState<
    CommitInfo[]
  >([]);

  const [loadingCommits, setLoadingCommits] =
    useState(false);

  const [hasUnread, setHasUnread] =
    useState(false);

  const notificationsRef =
    useRef<HTMLDivElement>(null);

  useEffect(() => {
    async function fetchCommits() {
      try {
        setLoadingCommits(true);

        const response = await fetch(
          "http://localhost:3001/api/updates?limit=8"
        );

        if (!response.ok) {
          return;
        }

        const result: {
          data: CommitInfo[];
        } = await response.json();

        const data = result.data || [];

        setCommits(data);

        const lastSeen =
          localStorage.getItem(
            LAST_SEEN_COMMIT_KEY
          );

        setHasUnread(
          data.length > 0 &&
            data[0].hash !== lastSeen
        );
      } catch (err) {
        console.error(
          "Erro ao buscar atualizações:",
          err
        );
      } finally {
        setLoadingCommits(false);
      }
    }

    fetchCommits();
  }, []);

  useEffect(() => {
    function handleClickOutside(
      event: MouseEvent
    ) {
      if (
        notificationsRef.current &&
        !notificationsRef.current.contains(
          event.target as Node
        )
      ) {
        setIsNotificationsOpen(false);
      }
    }

    document.addEventListener(
      "mousedown",
      handleClickOutside
    );

    return () =>
      document.removeEventListener(
        "mousedown",
        handleClickOutside
      );
  }, []);

  const toggleNotifications = () => {
    setIsNotificationsOpen(
      (current) => !current
    );

    if (
      !isNotificationsOpen &&
      commits.length > 0
    ) {
      localStorage.setItem(
        LAST_SEEN_COMMIT_KEY,
        commits[0].hash
      );

      setHasUnread(false);
    }
  };

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

        {/* NOTIFICAÇÕES */}

        <div
          className="notification-wrapper"
          ref={notificationsRef}
        >

          <button
            className="notification-button"
            onClick={toggleNotifications}
          >

            <Bell size={20} />

            {hasUnread && <span />}

          </button>

          {isNotificationsOpen && (

            <div className="notification-dropdown">

              <div className="notification-dropdown-header">
                <span>
                  Atualizações do app
                </span>
              </div>

              <div className="notification-list">

                {loadingCommits && (
                  <div className="notification-empty">
                    Carregando...
                  </div>
                )}

                {!loadingCommits &&
                  commits.length === 0 && (
                    <div className="notification-empty">
                      Nenhuma atualização
                      encontrada.
                    </div>
                  )}

                {!loadingCommits &&
                  commits.map(
                    (commit) => (
                      <div
                        className="notification-item"
                        key={commit.hash}
                      >

                        <div className="notification-item-icon">
                          <GitCommit
                            size={14}
                          />
                        </div>

                        <div className="notification-item-content">

                          <span className="notification-item-message">
                            {
                              commit.message
                            }
                          </span>

                          <span className="notification-item-meta">
                            {commit.author} ·{" "}
                            {formatRelativeTime(
                              commit.date
                            )}
                          </span>

                        </div>

                      </div>
                    )
                  )}

              </div>

            </div>

          )}

        </div>

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
