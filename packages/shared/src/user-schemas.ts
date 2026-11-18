import * as z from 'zod/mini'

export const MIN_PASSWORD_LENGTH = 8

/** bcrypt reads no more than this many bytes of a password, so the rest would be ignored without telling anyone. */
export const MAX_PASSWORD_BYTES = 72

export const USERNAME_RULE = 'Username must be 3 to 32 characters: letters, digits, - and _'

// Checked before lowercasing: a character that only lowercases into a letter (the Kelvin sign) must be refused too.
const USERNAME_PATTERN = /^[A-Za-z0-9_-]{3,32}$/

const required = (what: string) => ({ error: `${what} is required` })

const utf8Bytes = (text: string) => {
  let bytes = 0
  for (const character of text) {
    const codePoint = character.codePointAt(0) ?? 0
    bytes += codePoint < 0x80 ? 1 : codePoint < 0x800 ? 2 : codePoint < 0x10000 ? 3 : 4
  }
  return bytes
}

/** A username is stored trimmed and in lowercase, so `Alice` and `alice` are the same account. */
export const usernameSchema = z
  .string(required('Username'))
  .check(z.trim(), z.regex(USERNAME_PATTERN, USERNAME_RULE), z.toLowerCase())

export const usernameParamsSchema = z.object({ username: usernameSchema })

/** The same password can be typed with composed or decomposed accents, so it is normalised before it is hashed. */
export const loginRequestSchema = z.object({
  username: usernameSchema,
  password: z.string(required('Password')).check(z.normalize('NFKC'), z.minLength(1, 'Password is required')),
})

export const createUserRequestSchema = z.object({
  username: usernameSchema,
  password: z
    .string(required('Password'))
    .check(
      z.normalize('NFKC'),
      z.minLength(MIN_PASSWORD_LENGTH, `Password must be at least ${MIN_PASSWORD_LENGTH} characters`),
      z.refine((password) => utf8Bytes(password) <= MAX_PASSWORD_BYTES, `Password must be at most ${MAX_PASSWORD_BYTES} bytes`),
    ),
})

export type LoginRequest = z.input<typeof loginRequestSchema>
export type CreateUserRequest = z.input<typeof createUserRequestSchema>
