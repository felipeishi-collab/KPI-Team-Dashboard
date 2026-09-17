import { OAuth2Client } from "google-auth-library";

const googleClient = new OAuth2Client(
  process.env.GOOGLE_CLIENT_ID
);

export interface AuthenticatedUser {
  email: string;
  name: string;
  picture?: string;
  sub: string;
}

export async function authenticateGoogle(
  credential: string
): Promise<AuthenticatedUser> {
  // Validação básica da configuração
  if (!process.env.GOOGLE_CLIENT_ID) {
    throw new Error(
      "GOOGLE_CLIENT_ID não configurado no backend."
    );
  }

  // Valida o token recebido do Google
  const ticket = await googleClient.verifyIdToken({
    idToken: credential,
    audience: process.env.GOOGLE_CLIENT_ID,
  });

  const payload = ticket.getPayload();

  if (!payload) {
    throw new Error("Token do Google inválido.");
  }

  // Dados retornados pelo Google
  const email = payload.email?.toLowerCase();
  const hostedDomain = payload.hd?.toLowerCase();

  if (!email) {
    throw new Error(
      "Google não retornou o e-mail do usuário."
    );
  }

  // Regra de acesso:
  // somente contas corporativas @shopee.com
  const isShopeeAccount =
    email.endsWith("@shopee.com");

  if (!isShopeeAccount) {
    throw new Error(
      "Acesso negado. Apenas contas corporativas @shopee.com são permitidas."
    );
  }

  // Se o Google informar o domínio corporativo,
  // ele também precisa ser shopee.com.
  if (
    hostedDomain &&
    hostedDomain !== "shopee.com"
  ) {
    throw new Error(
      "Acesso negado. O domínio da conta não é autorizado."
    );
  }

  // Retorna somente os dados necessários para o sistema
  return {
    email: email,
    name: payload.name ?? "",
    picture: payload.picture,
    sub: payload.sub ?? "",
  };
}