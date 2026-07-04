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
      constructorOpt?: (...args: any[]) => any
    ): void;
  }
}
