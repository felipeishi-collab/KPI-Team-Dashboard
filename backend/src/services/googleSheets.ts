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

export async function getSheetData(
  range: string
): Promise<string[][]> {
  const spreadsheetId =
    process.env.GOOGLE_SHEETS_SPREADSHEET_ID;

  if (!spreadsheetId) {
    throw new Error(
      "GOOGLE_SHEETS_SPREADSHEET_ID não configurado."
    );
  }

  const response = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range,
  });

  return (response.data.values || []) as string[][];
}