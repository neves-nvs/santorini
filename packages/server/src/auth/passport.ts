import { ExtractJwt, Strategy as JwtStrategy, VerifiedCallback } from "passport-jwt";
import jwt, { JwtPayload } from "jsonwebtoken";

const { JsonWebTokenError, NotBeforeError, TokenExpiredError } = jwt;

import { JWT_SECRET } from "../configs/config.ts";
import express from "express";
import { findUserByUsername } from "../users/userRepository.ts";
import logger from "../logger.ts";
import passport from "passport";

function extractJwtFromCookies(req: express.Request): string | null {
  // TODO: debug-only, this logs secrets; never run with LOG_LEVEL=debug in production
  logger.debug("Extracting JWT from cookies", req.cookies);
  return req.cookies.token;
}

passport.use(
  new JwtStrategy(
    {
      jwtFromRequest: ExtractJwt.fromExtractors([extractJwtFromCookies]),
      secretOrKey: JWT_SECRET,
    },
    async (jwtPayload: JwtPayload, done: VerifiedCallback) => {
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
