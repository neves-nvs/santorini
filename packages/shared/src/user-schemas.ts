import { z } from 'zod'

export const MIN_PASSWORD_LENGTH = 8

export const USERNAME_RULE = 'Username must be 3 to 32 characters: letters, digits, - and _'

const USERNAME_PATTERN = /^[a-z0-9_-]{3,32}$/

const required = (what: string) => ({ error: `${what} is required` })

/** A username is stored trimmed and in lowercase, so `Alice` and `alice` are the same account. */
export const usernameSchema = z
  .string(required('Username'))
  .trim()
  .toLowerCase()
  .regex(USERNAME_PATTERN, USERNAME_RULE)

export const usernameParamsSchema = z.object({ username: usernameSchema })

export const loginRequestSchema = z.object({
  username: usernameSchema,
  password: z.string(required('Password')).min(1, 'Password is required'),
})

export const createUserRequestSchema = z.object({
  username: usernameSchema,
  password: z
    .string(required('Password'))
    .min(MIN_PASSWORD_LENGTH, `Password must be at least ${MIN_PASSWORD_LENGTH} characters`),
})

export type LoginRequest = z.input<typeof loginRequestSchema>
export type CreateUserRequest = z.input<typeof createUserRequestSchema>
