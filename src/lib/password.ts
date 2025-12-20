import bcrypt from "bcryptjs";

const SALT_ROUNDS = 12;

/**
 * Hash a password using bcrypt
 */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

/**
 * Verify a password against a hash
 */
export async function verifyPassword(
  password: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

/**
 * Validate password strength
 * Returns null if valid, error message if invalid
 */
export function validatePassword(password: string): string | null {
  if (password.length < 8) {
    return "La contraseña debe tener al menos 8 caracteres";
  }
  if (!/[A-Z]/.test(password)) {
    return "La contraseña debe contener al menos una mayúscula";
  }
  if (!/[a-z]/.test(password)) {
    return "La contraseña debe contener al menos una minúscula";
  }
  if (!/[0-9]/.test(password)) {
    return "La contraseña debe contener al menos un número";
  }
  return null;
}

/**
 * Generate a secure random token for password reset
 */
export function generateResetToken(): string {
  return crypto.randomUUID() + "-" + crypto.randomUUID();
}
