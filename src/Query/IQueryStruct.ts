import { IGlobalContext } from './IGlobalContext';

export type IQueryConvert =
  | IQueryConvertFunc
  | IQueryConvertObject
  | IqueryConvertString;

export type IQueryConvertFunc = (
  value: unknown,
  context: { globalContext: IGlobalContext }
) => void;

export interface IQueryConvertObject {
  property?: 'length';
  valueMethod?: 'shift';
  method?: 'shift';
  convert?: IQueryConvert;
  converts?: IQueryConvert[];
  internalProperties?: Record<string, IQueryConvert>;
  externalProperties?: Record<string, IQueryConvert>;
  enum?: unknown[];
  validation?: 'empty';
  not?: IQueryConvert;
  map?: IQueryConvert;
  filter?: IQueryConvert;
  match?: string | RegExp;
  test?: RegExp;
  replace?: { search: string | RegExp; replace: string };
  replaces?: [string | RegExp, string][];
  normalize?: string;
  parse?: string;
  split?: string;
  idx?: number;
}

export interface IQueryStruct {
  [x: string]:
    | IQueryStruct
    | string
    | undefined
    | IQueryConvert
    | boolean
    | number;

  itemList?: string;
  data?: IQueryStruct;
  attr?: string;
  convert?: IQueryConvert;
  how?: string;
  selector?: string | '&';
  required?: boolean;
  eq?: number;
}

export type IQueryFunc = (args: Record<string, unknown>) => Promise<unknown>;
export type IqueryConvertString =
  | 'int'
  | 'float'
  | 'json'
  | 'boolean'
  | 'relativeURL'
  | 'validUrl'
  | 'date'
  | 'trim'
  | 'lowercase'
  | 'uppercase'
  | 'shift'
  | 'string';
