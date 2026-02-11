import express from "express";
import { apiKeyAuth } from "./middleware/api-key";
import { requestLogger } from "./middleware/logger";
import healthRouter from "./routes/health";
import sanctionsRouter from "./routes/sanctions";
import kycRouter from "./routes/kyc";
import accreditedRouter from "./routes/accredited";
import jurisdictionRouter from "./routes/jurisdiction";
import fullCheckRouter from "./routes/full-check";

const app = express();
const PORT = process.env.PORT || 3001;

app.use(express.json());
app.use(apiKeyAuth);
app.use(requestLogger);

app.use("/api/v1", healthRouter);
app.use("/api/v1", sanctionsRouter);
app.use("/api/v1", kycRouter);
app.use("/api/v1", accreditedRouter);
app.use("/api/v1", jurisdictionRouter);
app.use("/api/v1", fullCheckRouter);

export { app };

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Compliance API server running on port ${PORT}`);
    console.log(`Health check: http://localhost:${PORT}/api/v1/health`);
  });
}
