import cookieParser from "cookie-parser";
import dotenv from "dotenv";
import WebSocket from "ws";
import cors from "cors";
import express, { Request } from "express";
import { handleMessage } from "./webSockets";
import logger from "./logger";
import { morganBodyMiddleware, morganMiddleware, morganResBodyMiddleware } from "./morgan";
import passport from "passport";
import userController from "./users/userController";
import authController from "./auth/authController";
import { ExtractJwt, Strategy as JwtStrategy } from "passport-jwt";
import { JsonWebTokenError, JwtPayload, NotBeforeError, TokenExpiredError, VerifyCallback } from "jsonwebtoken";
import gameController from "./game/gameController";
import { PORT } from "./config";
import { findUserByUsername } from "./users/userRepository";

dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  logger.error("JWT secret not set");
  process.exit(1);
}

function extractJwtFromCookies(req: express.Request): string | null {
  logger.info("Extracting JWT from cookies", req.cookies);
  return req.cookies.token;
}

passport.use(
  new JwtStrategy(
    {
      jwtFromRequest: ExtractJwt.fromExtractors([extractJwtFromCookies]),
      secretOrKey: JWT_SECRET,
    },
    async (jwtPayload: JwtPayload, done: VerifyCallback) => {
      try {
        logger.info("JWT payload", jwtPayload);
        const user = await findUserByUsername(jwtPayload.username);

        if (!user) {
          return done(null, undefined);
        }

        return done(null, user);
      } catch (error: unknown) {
        if (
          error instanceof JsonWebTokenError ||
          error instanceof NotBeforeError ||
          error instanceof TokenExpiredError
        ) {
          logger.error("Unexpected Error", error);
          return done(error, undefined);
        } else if (error instanceof Error) {
          logger.error("Unexpected Error", error);
          return done(null, undefined);
          // throw error;
        } else {
          return done(null, undefined);
          // throw new Error("Unexpected error");
        }
      }
    },
  ),
);

const app = express();

app.use(morganMiddleware);
app.use(morganBodyMiddleware);
app.use(morganResBodyMiddleware);

app.use(express.json());
app.use(cookieParser());
app.use(passport.initialize());

const CORS_CONFIG = {
  origin: "http://localhost:5173",
  credentials: true,
};
app.use(cors(CORS_CONFIG));

app.use("/", authController);
app.use("/games", gameController);
app.use("/users", userController);

const server = app.listen(PORT, () => {
  logger.info(`Server running on port ${PORT}`);
});

const wss = new WebSocket.Server({ server });

wss.on("listening", () => {
  logger.info("WebSocket server listening");
});

wss.on("connection", (ws: WebSocket) => {
  logger.info("WebSocket connection");

  ws.on("open", () => {
    logger.info("WebSocket open");
  });

  ws.on("error", (error: Error) => {
    logger.error("WebSocket error", error);
  });

  ws.on("message", (message: string) => {
    logger.info("WebSocket message", message);
    handleMessage(ws, message);
  });

  ws.on("close", (code, reason) => {
    logger.info("WebSocket connection closed", code, reason);
  });
});

export { app, server };
