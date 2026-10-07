export interface SessionUser {
  email: string;
  name: string;
  picture?: string;
}

const SESSION_KEY = "kpi_session";

interface StoredSession {
  token: string;
  user: SessionUser;
}

function readSession(): StoredSession | null {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);

    if (!raw) return null;

    const { token, user } = JSON.parse(raw);

    return token && user?.email ? { token, user } : null;
  } catch {
    sessionStorage.removeItem(SESSION_KEY);
    return null;
  }
}

export function saveSession(
  token: string,
  user: SessionUser
): void {
  sessionStorage.setItem(
    SESSION_KEY,
    JSON.stringify({ token, user })
  );
}

export function clearSession(): void {
  sessionStorage.removeItem(SESSION_KEY);
}

export function getCurrentUser(): SessionUser | null {
  return readSession()?.user ?? null;
}

// fetch que anexa o token de sessão. Se o servidor responder 401
// (sessão expirada/inválida), limpa a sessão e volta para o login.
export async function authFetch(
  input: string,
  init: RequestInit = {}
): Promise<Response> {
  const headers = new Headers(init.headers);

  headers.set(
    "x-session-token",
    readSession()?.token ?? ""
  );

  const response = await fetch(input, {
    ...init,
    headers,
  });

  if (response.status === 401) {
    clearSession();
    window.location.replace("/login");
  }

  return response;
}
