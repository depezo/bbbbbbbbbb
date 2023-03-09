/* eslint-disable @typescript-eslint/no-explicit-any */
import { IGlobalContextStruct } from './IGlobalContext';

export interface IStruct {
  [x: string]: IStruct | IStructFunc;
}

export type IStructFunc = (
  value: any,
  context: {
    globalContext: IGlobalContextStruct;
    property?: any;
  }
) => unknown;
