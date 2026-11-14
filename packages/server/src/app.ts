import "./auth/passport.ts";
import { morganBodyMiddleware, morganMiddleware, morganResBodyMiddleware } from "./middlewares/morganMiddleware.ts";
import authController from "./auth/authController.ts";
import { config } from "./configs/config.ts";
import cookieParser from "cookie-parser";
import cors from "cors";
import errorHandler from "./middlewares/errorMiddleware.ts";
import express from "express";
import { gameRoutes } from "./composition-root.ts";
import passport from "passport";
import { rateLimitMiddleware } from "./middlewares/rateLimitMiddleware.ts";
import userController from "./users/userController.ts";

const CORS_CONFIG = {
  origin: config.allowedOrigins,
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "Accept"],
  optionsSuccessStatus: 200,
};

const app = express();

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
