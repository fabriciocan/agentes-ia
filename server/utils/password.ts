import bcrypt from 'bcrypt'
import { createHash } from 'node:crypto'

const SALT_ROUNDS = 10

/**
 * Hash password using bcrypt
 *
 * @param password - Plain text password
 * @returns Promise with hashed password
 */
export async function hashAppPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS)
}

/**
 * Verify password against hash
 * Supports both bcrypt (new) and SHA256 (legacy) hashes
 *
 * @param password - Plain text password
 * @param hash - Stored password hash
 * @returns Promise with true if password matches
 */
export async function verifyAppPassword(password: string, hash: string): Promise<boolean> {
  // Check if hash is bcrypt format (starts with $2a$, $2b$, or $2y$)
  if (hash.startsWith('$2a$') || hash.startsWith('$2b$') || hash.startsWith('$2y$')) {
    return bcrypt.compare(password, hash)
  }

  // Legacy SHA256 support
  const sha256Hash = createHash('sha256').update(password).digest('hex')
  return sha256Hash === hash
}
