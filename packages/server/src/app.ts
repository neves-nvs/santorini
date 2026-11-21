import "./auth/passport.ts";

import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import helmet from "helmet";
import { StatusCodes } from "http-status-codes";
import { sql } from "kysely";
import passport from "passport";

import { router } from "./auth/authController.ts";
import { gameRoutes } from "./composition-root.ts";
import { config } from "./configs/config.ts";
import { db } from "./database.ts";
import errorHandler from "./middlewares/errorMiddleware.ts";
import { morganBodyMiddleware, morganMiddleware, morganResBodyMiddleware } from "./middlewares/morganMiddleware.ts";
import { rateLimitMiddleware } from "./middlewares/rateLimitMiddleware.ts";
import userController from "./users/userController.ts";

const CORS_CONFIG = {
  origin: config.allowedOrigins,
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "Accept"],
  optionsSuccessStatus: StatusCodes.OK,
};

const app = express();

app.set("trust proxy", config.trustProxy);

// HSTS is left to the proxy that terminates TLS
app.use(helmet({ strictTransportSecurity: false }));

app.get("/healthz", (_req, res) => {
  res.sendStatus(StatusCodes.OK);
});

app.get("/readyz", async (_req, res) => {
  try {
    await sql`select 1`.execute(db);
    res.sendStatus(StatusCodes.OK);
  } catch {
    res.sendStatus(StatusCodes.SERVICE_UNAVAILABLE);
  }
});

app.use(morganMiddleware);
app.use(morganBodyMiddleware);
app.use(morganResBodyMiddleware);

app.use(rateLimitMiddleware);

app.use(express.json());
app.use(cookieParser());
app.use(cors(CORS_CONFIG));

app.use(passport.initialize());

app.use("/", router);
app.use("/games", gameRoutes);
app.use("/users", userController);

app.use(errorHandler);

export { app };
