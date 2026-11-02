export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_MAX_LENGTH = 64;
export const NICKNAME_MIN_LENGTH = 2;
export const NICKNAME_MAX_LENGTH = 16;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const NICKNAME_PATTERN = /^[\p{L}\p{N}_-]+$/u;

export function isValidEmail(email: string): boolean {
  return EMAIL_PATTERN.test(email.trim());
}

export function isValidPassword(password: string): boolean {
  return (
    password.length >= PASSWORD_MIN_LENGTH &&
    password.length <= PASSWORD_MAX_LENGTH &&
    /[A-Za-z]/.test(password) &&
    /\d/.test(password)
  );
}

export function normalizeNickname(nickname: string): string {
  return nickname.trim();
}

export function isValidNickname(nickname: string): boolean {
  const value = normalizeNickname(nickname);
  const length = [...value].length;
  return length >= NICKNAME_MIN_LENGTH && length <= NICKNAME_MAX_LENGTH && NICKNAME_PATTERN.test(value);
}
