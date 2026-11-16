import { z } from 'zod'

const BOARD_SIZE = 5

export const MIN_PLAYERS = 2
export const MAX_PLAYERS = 4

export const gameIdSchema = z.number().int().positive()

const coordinateSchema = z.number().int().min(0).max(BOARD_SIZE - 1)
const positionSchema = z.object({ x: coordinateSchema, y: coordinateSchema })

export const moveCommandSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('place_worker'), position: positionSchema, workerId: z.number().int().optional() }),
  z.object({
    type: z.literal('move_worker'),
    position: positionSchema,
    fromPosition: positionSchema,
    workerId: z.number().int().optional(),
  }),
  z.object({
    type: z.enum(['build_block', 'build_dome']),
    position: positionSchema,
    buildingLevel: z.number().int().optional(),
  }),
])

export const createGamePayloadSchema = z
  .object({ maxPlayers: z.number().int().min(MIN_PLAYERS).max(MAX_PLAYERS).default(MIN_PLAYERS) })
  .prefault({})

const gameRefSchema = z.object({ gameId: gameIdSchema })

export const clientMessageSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('create_game'), payload: createGamePayloadSchema }),
  z.object({ type: z.literal('join_game'), payload: gameRefSchema }),
  z.object({ type: z.literal('list_games'), payload: z.unknown() }),
  z.object({ type: z.literal('leave_game'), payload: gameRefSchema }),
  z.object({ type: z.literal('subscribe_game'), payload: gameRefSchema }),
  z.object({ type: z.literal('set_ready'), payload: gameRefSchema.extend({ isReady: z.boolean() }) }),
  z.object({ type: z.literal('make_move'), payload: gameRefSchema.extend({ move: moveCommandSchema }) }),
])

export const CLIENT_MESSAGE_TYPES: readonly string[] = clientMessageSchema.options.map((option) => option.shape.type.value)

export type ParsedClientMessage = z.infer<typeof clientMessageSchema>
