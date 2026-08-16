/**
 * ----------------------------------------
 * Module: Global Error Extensions
 * ----------------------------------------
 *
 * Declares structured VeloDom metadata attached to Error instances across
 * adapters, middleware, requests, and runtime diagnostics.
 * ----------------------------------------
 */

export {};

declare global {
  interface Error {
    code?: string;
    __vdHint?: string;
    __vdMiddleware?: string;
    __vdStage?: string;
    __vdSynthetic?: boolean;
  }

  interface ErrorConstructor {
    captureStackTrace?(
      targetObject: object,
      constructorOpt?: (...args: unknown[]) => unknown
    ): void;
  }
}
