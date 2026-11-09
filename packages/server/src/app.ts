import "./auth/passport";

import { morganBodyMiddleware, morganMiddleware, morganResBodyMiddleware } from "./middlewares/morganMiddleware";

import authController from "./auth/authController";
import cookieParser from "cookie-parser";
import cors from "cors";
import errorHandler from "./middlewares/errorMiddleware";
import express from "express";
import { gameRoutes } from "./composition-root";
import passport from "passport";
import userController from "./users/userController";

const CORS_CONFIG = {
  origin: true,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
  optionsSuccessStatus: 200
};

const app = express();

app.use(morganMiddleware);
app.use(morganBodyMiddleware);
app.use(morganResBodyMiddleware);

app.use(express.json());
app.use(cookieParser());
app.use(cors(CORS_CONFIG));

app.use(passport.initialize());

app.use("/", authController);
app.use("/games", gameRoutes);
app.use("/users", userController);

app.use(errorHandler);

export { app };
