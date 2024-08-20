import dotenv from "dotenv";
import WebSocket from "ws";
import cors from "cors";
import express from "express";
import { handleMessage } from "./webSockets";
import logger from "./logger";
import {
  morganBodyMiddleware,
  morganMiddleware,
  morganResBodyMiddleware,
} from "./morgan";
import passport from "passport";
import userController from "./users/userController";
import {
  Strategy as GoogleStrategy,
  Profile,
  VerifyCallback,
} from "passport-google-oauth20";
import {
  createUserWithGoogleProfile,
  findUserByGoogleId,
  findUserByUsername,
} from "./users/userRepository";
import authController from "./authentication/authController";
import { ExtractJwt, Strategy as JwtStrategy } from "passport-jwt";
import { JwtPayload } from "jsonwebtoken";
import gameController from "./game/gameController";
import { PORT } from "./config";

dotenv.config();

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;

if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
  logger.error("Google OAuth environment variables not set");
  process.exit(1);
}

passport.use(
  new GoogleStrategy(
    {
      clientID: GOOGLE_CLIENT_ID,
      clientSecret: GOOGLE_CLIENT_SECRET,
      callbackURL: "/auth/google/callback",
    },
    async (
      accessToken: string,
      refreshToken: string,
      profile: Profile,
      done: VerifyCallback,
    ) => {
      try {
        let user = await findUserByGoogleId(profile.id);

        if (!user) {
          user = await createUserWithGoogleProfile(profile);
        }

        return done(null, user);
      } catch (err) {
        return done(err);
      }
    },
  ),
);

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  logger.error("JWT secret not set");
  process.exit(1);
}

function extractJwtFromCookies(req: express.Request): string | null {
  const cookies = req.headers.cookie;
  if (cookies) {
    const match = cookies.match(/token=([^;]+)/);
    if (match) {
      return match[1];
    }
  }
  return null;
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
          return done(null, false);
        }

        return done(null, user);
      } catch (err) {
        return done(err);
      }
    },
  ),
);

const app = express();

app.use(morganMiddleware);
app.use(morganBodyMiddleware);
app.use(morganResBodyMiddleware);

app.use(express.json());
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
