import { google } from "googleapis";
import path from "path";

const credentialsPath = path.resolve(
  process.env.GOOGLE_SHEETS_CREDENTIALS_PATH!
);

const auth = new google.auth.GoogleAuth({
  keyFile: credentialsPath,
  scopes: [
    "https://www.googleapis.com/auth/spreadsheets.readonly",
  ],
});

const sheets = google.sheets({
  version: "v4",
  auth,
});

// `unformatted: true` devolve os valores crus (números de verdade, datas
// como serial) em vez do texto formatado exibido na célula.
export async function getSheetData(
  range: string,
  spreadsheetIdOverride?: string,
  unformatted = false
): Promise<string[][]> {
  const spreadsheetId =
    spreadsheetIdOverride ||
    process.env.GOOGLE_SHEETS_SPREADSHEET_ID;

  if (!spreadsheetId) {
    throw new Error(
      "GOOGLE_SHEETS_SPREADSHEET_ID não configurado."
    );
  }

  const response = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range,
    ...(unformatted
      ? { valueRenderOption: "UNFORMATTED_VALUE" }
      : {}),
  });

  return (response.data.values || []) as string[][];
}