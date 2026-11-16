import * as OpenApiValidator from "express-openapi-validator";
import { app } from "../../../src/app.ts";
import express from "express";
import { fileURLToPath } from "node:url";

// The real app behind a validator that checks every request and response against packages/shared/api/openapi.yaml.
export const specApp = express();
specApp.use(
  OpenApiValidator.middleware({
    apiSpec: fileURLToPath(import.meta.resolve("@santorini/shared/openapi.yaml")),
    // Tests send invalid requests on purpose to reach the app's own validation, so only responses are checked
    validateRequests: false,
    validateResponses: true,
    validateSecurity: false,
  }),
);
specApp.use(app);
specApp.use(((error: { status?: number; message: string; errors?: unknown }, _req, res, _next) => {
  res.status(error.status ?? 500).json({ validator: error.message, errors: error.errors });
}) as express.ErrorRequestHandler);
