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
  }),
])

export const createGamePayloadSchema = z
  .object({ maxPlayers: z.number().int().min(MIN_PLAYERS).max(MAX_PLAYERS).default(MIN_PLAYERS) })
  .prefault({})

const gameRefSchema = z.object({ gameId: gameIdSchema })

export const requestIdSchema = z.string().min(1).max(64)

export const ERROR_CODES = [
  'invalid_message',
  'invalid_payload',
  'unknown_type',
  'game_not_found',
  'game_full',
  'already_in_game',
  'not_in_game',
  'invalid_game_state',
  'not_your_turn',
  'illegal_move',
  'validation_failed',
  'unauthorized',
  'forbidden',
  'user_exists',
  'user_not_found',
  'rate_limited',
  'internal',
] as const

export type ErrorCode = (typeof ERROR_CODES)[number]

const command = <Type extends string, Payload extends z.ZodType>(type: Type, payload: Payload) =>
  z.object({ type: z.literal(type), id: requestIdSchema.optional(), payload })

export const clientMessageSchema = z.discriminatedUnion('type', [
  command('join_game', gameRefSchema),
  command('leave_game', gameRefSchema),
  command('subscribe_game', gameRefSchema),
  command('set_ready', gameRefSchema.extend({ isReady: z.boolean() })),
  command('make_move', gameRefSchema.extend({ move: moveCommandSchema })),
])

export const CLIENT_MESSAGE_TYPES: readonly string[] = clientMessageSchema.options.map((option) => option.shape.type.value)

export type ParsedClientMessage = z.infer<typeof clientMessageSchema>
