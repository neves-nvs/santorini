import { asGameId, asPlayerId } from "@santorini/engine";
import { z } from "zod";

const positiveInteger = z.number().int().positive();

export const gameIdSchema = positiveInteger.transform(asGameId);
export const playerIdSchema = positiveInteger.transform(asPlayerId);
