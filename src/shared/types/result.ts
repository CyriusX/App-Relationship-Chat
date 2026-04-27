/**
 * Result type for functional error handling (Either pattern)
 * Success: { ok: true, value: T }
 * Failure: { ok: false, error: E }
 */

export type Success<T> = {
  ok: true;
  value: T;
};

export type Failure<E> = {
  ok: false;
  error: E;
};

export type Result<T, E = Error> = Success<T> | Failure<E>;

// Constructors
export const success = <T, E = Error>(value: T): Result<T, E> => ({
  ok: true,
  value,
});

export const failure = <T, E = Error>(error: E): Result<T, E> => ({
  ok: false,
  error,
});

// Type guards
export const isSuccess = <T, E>(result: Result<T, E>): result is Success<T> => {
  return result.ok === true;
};

export const isFailure = <T, E>(result: Result<T, E>): result is Failure<E> => {
  return result.ok === false;
};

// Utility functions
export const unwrap = <T, E>(result: Result<T, E>): T => {
  if (isSuccess(result)) {
    return result.value;
  }
  throw result.error;
};

export const unwrapOr = <T, E>(result: Result<T, E>, defaultValue: T): T => {
  if (isSuccess(result)) {
    return result.value;
  }
  return defaultValue;
};

export const map = <T, U, E>(result: Result<T, E>, fn: (value: T) => U): Result<U, E> => {
  if (isSuccess(result)) {
    return success(fn(result.value));
  }
  return result;
};

export const mapError = <T, E, F>(result: Result<T, E>, fn: (error: E) => F): Result<T, F> => {
  if (isFailure(result)) {
    return failure(fn(result.error));
  }
  return result as Result<T, F>;
};
