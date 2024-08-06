import { NextFunction, Request, Response, Router } from "express";
import logger from "../logger";
import { findUserByUsername } from "../users/userRepository";
import passport from "passport";
import { User } from "../model";
import jwt from "jsonwebtoken";
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

    // Set the token in an HTTP-only cookie
    res.cookie("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
    });
    res.redirect("/"); // Redirect or send a response
  },
);

function verifyJWT(req: Request, res: Response, next: NextFunction) {
  const token = req.cookies.token;
  if (!token) {
    return res.status(401).send("Unauthorized");
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).send("Forbidden");
    }

    req.user = user;
    next();
  });
}

export default router;
