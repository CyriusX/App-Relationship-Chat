/**
 * Async utility types
 */

/**
 * Makes all properties of T non-nullable
 */
export type NonNullableProps<T> = {
  [P in keyof T]: NonNullable<T[P]>;
};

/**
 * Promisable type - can be T or Promise<T>
 */
export type Promisable<T> = T | Promise<T>;

/**
 * Async function type
 */
export type AsyncFunction<T = void, Args extends unknown[] = []> = (...args: Args) => Promise<T>;

/**
 * Extract the resolved type of a Promise
 */
export type Awaited<T> = T extends Promise<infer U> ? U : T;

/**
 * Deep Partial type
 */
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

/**
 * Required keys only
 */
export type RequiredKeys<T, K extends keyof T> = T & Required<Pick<T, K>>;

/**
 * Optional keys only
 */
export type OptionalKeys<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;
