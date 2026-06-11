import { env } from "./config/env.js";
import { connectDatabase } from "./config/db.js";
import { app } from "./app.js";
import { ensureDefaultAdmin } from "./services/admin-bootstrap.service.js";
import { ensureMutableContractorIndexes } from "./services/index-maintenance.service.js";

const start = async () => {
  await connectDatabase();
  await ensureMutableContractorIndexes();
  await ensureDefaultAdmin();
  app.listen(env.PORT, () => {
    console.log(`API listening on port ${env.PORT}`);
  });
};

start().catch((error) => {
  console.error("Failed to start API");
  console.error(error);
  process.exit(1);
});
