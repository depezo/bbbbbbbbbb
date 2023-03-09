import { IQueryFunc, IQueryStruct } from './IQueryStruct';

// eslint-disable-next-line @typescript-eslint/no-unused-vars

export type IQuery = Record<string, IQueryStruct | IQueryFunc>;
