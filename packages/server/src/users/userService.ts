import { Router } from "express";
import logger from "../logger";
import { userRepository } from "../users/userRepository";

const router = Router();

router.post("/", async (req, res) => {
    const { username, email, password } = req.body;
    if (!username) {
        logger.error("Username required");
        return res.status(400).send("All fields are required");
    }
    try {
        userRepository.createUser(username);
    } catch (e: any) {
        logger.error(e.message);
        return res.status(400).send(e.message);
    }
    res.status(201).send("User created successfully");
});

router.post("/login", async (req, res) => {
    const { username } = req.body;
    if (!username) {
        logger.error("Username required");
        return res.status(400).send("Username required");
    }

    const user = userRepository.getUser(username);
    if (!user) {
        logger.error("User not found");
        return res.status(400).send("User not found");
    }

    res.status(200).send("Login successful");
});

export default router;
