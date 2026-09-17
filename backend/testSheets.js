require("dotenv").config();

const { getSheetData } = require("./src/services/googleSheets");

async function test() {
  try {
    console.log("🔄 Testando conexão com Google Sheets...");
    const data = await getSheetData("Base!A1:G10");

    console.log("✅ Conexão com Google Sheets funcionando!");
    console.table(data);
  } catch (error) {
    console.error("❌ Erro ao acessar Google Sheets:");
    console.error(error.message);
  }
}

test();