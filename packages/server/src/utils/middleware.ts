import { NextFunction, Request, Response } from "express";

import logger from "../logger";

export function deprecate(req: Request, res: Response, next: NextFunction) {
    res.setHeader('Warning', '299 - "Deprecated API"');
    logger.warn(`Deprecated API ${req.method} ${req.originalUrl}`);
    next();
}

