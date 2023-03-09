export interface IGlobalContext {
  commandStruct?: Record<string, unknown>;
  helper?: (
    command: unknown,
    value: unknown,
    globalContext: IGlobalContext
  ) => unknown;
  context: Record<string, unknown>;
  baseUrl: string;
  url: string;
  [x: string]: unknown;
}

export interface IGlobalContextStruct {
  commandStruct: Record<string, unknown>;
  helper: (
    command: unknown,
    value: unknown,
    globalContext: IGlobalContext
  ) => unknown;
  context: Record<string, unknown>;
  baseUrl: string;
  url: string;
  [x: string]: unknown;
}
