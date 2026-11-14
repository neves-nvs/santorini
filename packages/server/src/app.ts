import "./auth/passport.ts";

import { morganBodyMiddleware, morganMiddleware, morganResBodyMiddleware } from "./middlewares/morganMiddleware.ts";

import { ALLOWED_ORIGINS } from "./configs/config.ts";
import authController from "./auth/authController.ts";
import cookieParser from "cookie-parser";
import cors from "cors";
import { db } from "./database.ts";
import errorHandler from "./middlewares/errorMiddleware.ts";
import express from "express";
import { gameRoutes } from "./composition-root.ts";
import passport from "passport";
import { rateLimitMiddleware } from "./middlewares/rateLimitMiddleware.ts";
import { sql } from "kysely";
import userController from "./users/userController.ts";

const CORS_CONFIG = {
  origin: ALLOWED_ORIGINS,
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "Accept"],
  optionsSuccessStatus: 200,
};

const app = express();

app.get("/healthz", (_req, res) => {
  res.sendStatus(200);
});

app.get("/readyz", async (_req, res) => {
  try {
    await sql`select 1`.execute(db);
    res.sendStatus(200);
  } catch {
    res.sendStatus(503);
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

app.use("/", authController);
app.use("/games", gameRoutes);
app.use("/users", userController);

app.use(errorHandler);

export { app };
