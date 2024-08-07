import { NextFunction, Request, Response, Router } from "express";
import logger from "../logger";
import { findUserByUsername } from "../users/userRepository";
import passport from "passport";
import { User } from "../model";
import jwt, { JwtPayload, VerifyErrors } from "jsonwebtoken";
import { JWT_SECRET } from "../config";

const router = Router();

router.post("/login", async (req, res) => {
  const { username } = req.body;
  if (!username) {
    logger.error("Username required");
    return res.status(400).send("Username required");
  }

  const user = findUserByUsername(username);
  if (!user) {
    logger.error("User not found");
    return res.status(400).send("User not found");
  }

  res.status(200).send("Login successful");
});

router.get(
  "/auth/google",
  passport.authenticate("google", { scope: ["profile"] }),
);

router.get(
  "/auth/google/callback",
  passport.authenticate("google", { session: false }),
  (req, res) => {
    // Successful authentication, generate a JWT
    const user = req.user as User;

    if (!JWT_SECRET) {
      logger.error("JWT secret not set");
      return res.status(500).send("JWT secret not set");
    }

    const token = jwt.sign({ sub: user.id }, JWT_SECRET, { expiresIn: "1h" });

    res.cookie("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
    });
    res.redirect("http://localhost:5173");
  },
);

export function verifyJWT(req: Request, res: Response, next: NextFunction) {
  const token = req.cookies.token;
  if (!token) {
    return res.status(401).send("Unauthorized");
  }

  if (!JWT_SECRET) {
    logger.error("JWT secret not set");
    return res.status(500).send("JWT secret not set");
  }

  jwt.verify(
    token,
    JWT_SECRET,
    (err: VerifyErrors | null, user: string | JwtPayload | undefined) => {
      if (err) {
        return res.status(403).send("Forbidden");
      }
      req.user = user;
      next();
    },
  );
}

export default router;
