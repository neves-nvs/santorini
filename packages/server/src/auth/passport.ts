import { ExtractJwt, Strategy as JwtStrategy } from "passport-jwt";
import { JsonWebTokenError, JwtPayload, NotBeforeError, TokenExpiredError } from "jsonwebtoken";

import { JWT_SECRET } from "../configs/config";
import express from "express";
import { findUserByUsername } from "../users/userRepository";
import logger from "../logger";
import passport from "passport";

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
    async (jwtPayload: JwtPayload, done) => {
      try {
        const user = await findUserByUsername(jwtPayload.username);
        if (!user) return done(null, false);
        return done(null, user);
      } catch (error) {
        if (
          error instanceof JsonWebTokenError ||
          error instanceof NotBeforeError ||
          error instanceof TokenExpiredError
        ) {
          logger.error("JWT Error", error);
          return done(error);
        } else {
          logger.error("Unknown Error", error);
          return done(null, false);
        }
      }
    },
  ),
);
