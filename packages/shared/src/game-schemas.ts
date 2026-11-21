import { GAME_PHASES, GAME_STATUSES } from '@santorini/engine'
import { z } from 'zod'

export const gameStatusSchema = z.enum(GAME_STATUSES)
export const gamePhaseSchema = z.enum(GAME_PHASES)
