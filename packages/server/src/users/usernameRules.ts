/** A username is stored trimmed and in lowercase, so `Alice` and `alice` are the same account. */
export const USERNAME_PATTERN = /^[a-z0-9_-]{3,32}$/;

export const USERNAME_RULE = "Username must be 3 to 32 characters: letters, digits, - and _";
