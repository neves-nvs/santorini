import "./auth/passport";

import { morganBodyMiddleware, morganMiddleware, morganResBodyMiddleware } from "./middlewares/morganMiddleware";

import authController from "./auth/authController";
import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import gameController from "./game/gameController";
import passport from "passport";
import userController from "./users/userController";

const CORS_CONFIG = {
  origin: "http://localhost:5173",
  credentials: true,
};

const app = express();

app.use(morganMiddleware);
app.use(morganBodyMiddleware);
app.use(morganResBodyMiddleware);

app.use(express.json());
app.use(cookieParser());
app.use(passport.initialize());
app.use(cors(CORS_CONFIG));

app.use("/", authController);
app.use("/games", gameController);
app.use("/users", userController);

export { app };
