import { NextFunction, Request, Response } from "express";

import logger from "../logger";

export function deprecate(req: Request, res: Response, next: NextFunction) {
    res.setHeader('Warning', '299 - "Deprecated API"');
    logger.warn(`Deprecated API ${req.method} ${req.originalUrl}`);
    next();
}

const UUID_REGEX = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;

export const validateUUID = (paramName: string) => {
    return (req: Request, res: Response, next: NextFunction) => {
        const value = req.params[paramName];
        if (!UUID_REGEX.test(value)) {
            return res.status(400).send("Invalid UUID");
        }
        next();
    };
};