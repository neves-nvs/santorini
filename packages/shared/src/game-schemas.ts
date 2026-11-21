import { GAME_PHASES } from '@santorini/engine'
import { z } from 'zod'

import { GAME_STATUSES } from './game-types.ts'

export const gameStatusSchema = z.enum(GAME_STATUSES)
export const gamePhaseSchema = z.enum(GAME_PHASES)
