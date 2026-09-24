require("dotenv").config();

const { getSheetData } = require("./src/services/googleSheets");

async function test() {
  // =========================
  // PLANILHA PRINCIPAL (ATs no piso)
  // =========================

  try {
    console.log(
      "🔄 Testando planilha principal (ATs no piso)..."
    );

    const data = await getSheetData("Base!A1:G10");

    console.log(
      "✅ Conexão com a planilha principal funcionando!"
    );
    console.table(data);
  } catch (error) {
    console.error(
      "❌ Erro ao acessar a planilha principal:"
    );
    console.error(error.message);
  }

  // =========================
  // PLANILHA DE DRIVERS
  // =========================

  const driversId =
    process.env.GOOGLE_SHEETS_DRIVERS_SPREADSHEET_ID ||
    process.env.GOOGLE_SHEETS_SPREADSHEET_ID;

  console.log("");
  console.log(
    "🔄 Testando planilha de drivers (gráfico de barras do BAU)..."
  );
  console.log(
    "   GOOGLE_SHEETS_DRIVERS_SPREADSHEET_ID = " +
      (process.env.GOOGLE_SHEETS_DRIVERS_SPREADSHEET_ID ||
        "(vazio — caindo na GOOGLE_SHEETS_SPREADSHEET_ID)")
  );
  console.log(
    "   Spreadsheet ID que será usado de fato = " +
      driversId
  );

  try {
    const driversData = await getSheetData(
      "Base!A1:U5",
      driversId
    );

    console.log(
      "✅ Conexão com a planilha de drivers funcionando!"
    );
    console.log(
      "   (linha 1 = cabeçalho, confira se a ordem das colunas bate)"
    );
    console.table(driversData);
  } catch (error) {
    console.error(
      "❌ Erro ao acessar a planilha de drivers:"
    );
    console.error(error.message);
  }
}

test();
