import crypto from "crypto";
import fs from "fs";
import path from "path";

// Sessão = token assinado (HMAC-SHA256), stateless, no mesmo formato do
// painel Live: `<payload base64url>.<assinatura base64url>`.

export interface SessionUser {
  email: string;
  name: string;
  iat: number;
}

const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 dias

const SECRET_DIR = path.resolve(__dirname, "../../.cache");
const SECRET_FILE = path.join(SECRET_DIR, "session_secret.txt");

// SESSION_SECRET do ambiente tem prioridade. Sem ele, gera uma vez e
// persiste em disco, para as sessões sobreviverem a um restart.
function getSessionSecret(): string {
  if (process.env.SESSION_SECRET) {
    return process.env.SESSION_SECRET;
  }

  try {
    const existing = fs.readFileSync(SECRET_FILE, "utf8").trim();
    if (existing) return existing;
  } catch {
    // ainda não existe — gera abaixo
  }

  const secret = crypto.randomBytes(32).toString("hex");

  try {
    fs.mkdirSync(SECRET_DIR, { recursive: true });
    fs.writeFileSync(SECRET_FILE, secret);
  } catch (error) {
    console.warn(
      "Falha ao persistir o segredo de sessão; as sessões não sobreviverão a um restart:",
      error
    );
  }

  return secret;
}

const SESSION_SECRET = getSessionSecret();

function sign(payload: string): string {
  return crypto
    .createHmac("sha256", SESSION_SECRET)
    .update(payload)
    .digest("base64url");
}

export function signSession(
  user: Omit<SessionUser, "iat">
): string {
  const payload = Buffer.from(
    JSON.stringify({ ...user, iat: Date.now() })
  ).toString("base64url");

  return `${payload}.${sign(payload)}`;
}

export function verifySession(
  token: string
): SessionUser | null {
  try {
    const [payload, signature] = token.split(".");

    if (!payload || !signature) return null;

    const expected = Buffer.from(sign(payload));
    const received = Buffer.from(signature);

    if (
      expected.length !== received.length ||
      !crypto.timingSafeEqual(expected, received)
    ) {
      return null;
    }

    const user: SessionUser = JSON.parse(
      Buffer.from(payload, "base64url").toString()
    );

    if (Date.now() - user.iat > SESSION_TTL_MS) return null;

    return user;
  } catch {
    return null;
  }
}
