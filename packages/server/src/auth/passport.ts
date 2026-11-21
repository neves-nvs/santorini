import jwt, { JwtPayload } from "jsonwebtoken";
import { ExtractJwt, Strategy as JwtStrategy, VerifiedCallback } from "passport-jwt";

const { JsonWebTokenError, NotBeforeError, TokenExpiredError } = jwt;

import express from "express";
import passport from "passport";

import { config } from "@/configs/config.ts";
import logger from "@/logger.ts";
import { findUserByUsername } from "@/users/userRepository.ts";

function extractJwtFromCookies(req: express.Request): string | null {
  return req.cookies.token;
}

passport.use(
  new JwtStrategy(
    {
      jwtFromRequest: ExtractJwt.fromExtractors([extractJwtFromCookies]),
      secretOrKey: config.jwtSecret,
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
