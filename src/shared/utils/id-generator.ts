import { v4 as uuidv4 } from 'uuid';

/**
 * Generates a new UUID v4
 */
export function generateId(): string {
  return uuidv4();
}

/**
 * Generates a prefixed ID (useful for debugging)
 * @example generatePrefixedId('msg') => 'msg_abc123...'
 */
export function generatePrefixedId(prefix: string): string {
  return `${prefix}_${generateId()}`;
}
