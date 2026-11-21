import { asGameId, asSeat } from "@santorini/engine";
import { z } from "zod";

const positiveInteger = z.number().int().positive();

export const gameIdSchema = positiveInteger.transform(asGameId);
export const seatSchema = z.number().int().min(0).transform(asSeat);
