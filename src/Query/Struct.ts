/* eslint-disable import/prefer-default-export */
import { clone } from '../clone';
import { IStruct } from './IStruct';

export const QueryStruct: IStruct = {
  int: (value: string) => parseInt(value, 10),
  float: (value: string) => parseFloat(value),
  boolean: (value: string) => value === 'true',
  date: (value: string) => new Date(value),
  trim: (value: string) => value.trim(),
  lowercase: (value: string) => value.toLowerCase(),
  uppercase: (value: string) => value.toUpperCase(),
  relativeURL: (value: string, { globalContext }) => {
    return globalContext.baseUrl + value;
  },
  json: (value: string) => {
    try {
      return JSON.parse(value);
    } catch (e) {
      return value;
    }
  },
  validUrl: (value: string) => {
    let nValue =
      value[value.length - 1] === '/'
        ? value.substring(0, value.length - 1)
        : value;

    nValue =
      value[value.length - 1] === '/'
        ? value.substring(0, value.length - 1)
        : value;
    return nValue;
  },
  property: {
    length: (value: unknown[]) => value.length,
  },
  method: {
    shift: (value: unknown[]) => {
      value.shift();
      return value;
    },
  },
  valueMethod: {
    shift: (value: unknown[]) => value.shift(),
  },
  convert: {
    '#': (value: unknown, { property, globalContext }) => {
      return globalContext.helper(property, value, globalContext);
    },
  },
  converts: {
    '#': (value: unknown, { property, globalContext }) => {
      let newValue = value;

      (property as unknown[]).forEach((item) => {
        newValue = globalContext.helper(item, newValue, globalContext);
      });

      return newValue;
    },
  },
  internalProperties: {
    '#': (value: unknown, { property, globalContext }) => {
      const subContext: Record<string, unknown> = {};
      Object.keys(property).forEach((intervalProperty) => {
        subContext[intervalProperty] = globalContext.helper(
          property[intervalProperty],
          clone(value),
          globalContext
        );
      });

      return subContext;
    },
  },
  externalProperties: {
    '#': (value: unknown, { property, globalContext }) => {
      Object.keys(property).forEach((intervalProperty) => {
        globalContext.context[intervalProperty] = globalContext.helper(
          property[intervalProperty],
          clone(value),
          globalContext
        );
      });

      return value;
    },
  },
  emun: {
    '#': (value: unknown, { property }) => property.indexOf(value),
  },
  validation: {
    '#': (value: string, { property }) => {
      if (property === 'empty') {
        return (
          value === '' ||
          value === undefined ||
          value === null ||
          value.length === 0
        );
      }
      return false;
    },
  },
  filter: {
    '#': (value: unknown[], { property, globalContext }) => {
      return value.filter((item) =>
        globalContext.helper(property, item, globalContext)
      );
    },
  },

  map: {
    '#': (value: unknown[], { property, globalContext }) => {
      return value.map((item) =>
        globalContext.helper(property, item, globalContext)
      );
    },
  },
  idx: {
    '#': (value: unknown[], { property }) => value[property],
  },
  not: {
    '#': (value: string, { property, globalContext }) => {
      return !globalContext.helper(property, value, globalContext);
    },
  },
  match: {
    '#': (value: string, { property }) => {
      return value.match(property) ?? [];
    },
  },
  test: {
    '#': (value: string, { property }) => {
      return (property as RegExp).test(value);
    },
  },
  replace: {
    '#': (value: string, { property }) => {
      return value.replace(property.search, property.replace);
    },
  },
  replaces: {
    '#': (value: string, { property }) => {
      const newValue = value;
      property.forEach((item: string[]) => {
        newValue.replace(item[0], item[1]);
      });
      return newValue;
    },
  },
  normalize: {
    '#': (value: string, { property }) => {
      return value.normalize(property);
    },
  },
  parse: {
    '#': (value: string, { property, globalContext }) => {
      return property
        .replace('$baseUrl$', globalContext.baseUrl)
        .replace('$url$', globalContext.url)
        .replace('$value$', `${value as string}`);
    },
  },
  split: {
    '#': (value: string, { property }) => {
      return value.split(property);
    },
  },
};
