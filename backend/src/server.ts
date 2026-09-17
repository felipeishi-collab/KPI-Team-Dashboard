import "dotenv/config";

import app from "./app";

const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
  console.log(
    `KPI Team Dashboard API rodando em http://localhost:${PORT}`
  );
});