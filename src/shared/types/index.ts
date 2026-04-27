// Result/Either pattern
export {
  type Success,
  type Failure,
  type Result,
  success,
  failure,
  isSuccess,
  isFailure,
  unwrap,
  unwrapOr,
  map,
  mapError,
} from './result';

// Async types
export type {
  NonNullableProps,
  Promisable,
  AsyncFunction,
  Awaited,
  DeepPartial,
  RequiredKeys,
  OptionalKeys,
} from './async';
