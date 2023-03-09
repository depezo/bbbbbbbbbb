/* eslint-disable react-hooks/rules-of-hooks */
/* eslint-disable @typescript-eslint/no-explicit-any */
import cheerio from 'cheerio';
import LoadUrl from '../LoadUrl/LoadUrl';
import { IGlobalContext, IGlobalContextStruct } from './IGlobalContext';
import { IQuery } from './IQuery';
import { IQueryStruct, IQueryFunc } from './IQueryStruct';
import { IStruct, IStructFunc } from './IStruct';
import { QueryStruct } from './Struct';

type IPreviusElement = cheerio.Cheerio | undefined;

type Context = {
  insideContext: {
    error: boolean;
  };
  globalContext: IGlobalContext;
  $: cheerio.Root;
};

interface IQueryOptions {
  useCache?: boolean;
  args?: Record<string, unknown>;
  time?: number;
  method?: 'reload' | 'delete';
}

export default class Query {
  static Queries: Record<string, IQuery> = {};

  static Cache: Record<string, Record<string, unknown>> = {};

  private static processItemList(
    query: IQueryStruct,
    prevElement: IPreviusElement,
    context: Context
  ) {
    const { itemList, data, required, convert } = query;
    const { insideContext, globalContext, $ } = context;

    if (!itemList || !data) return null;

    const elements = prevElement
      ? $(itemList, prevElement as cheerio.Cheerio)
      : $(itemList);

    if ((required ?? false) && elements.length === 0) {
      insideContext.error = true;
      return null;
    }

    const result: unknown[] = [];
    elements.each((idx, el) => {
      const item = Query.processQueryStruct(data, context, $(el));
      result.push(item);
    });

    if (convert) {
      return Query.processCommand(convert, result, globalContext);
    }

    return result;
  }

  private static getElementBySelector(
    $: cheerio.Root,
    selector: string,
    prevElement?: cheerio.Cheerio
  ) {
    if (selector === '&') {
      return $(prevElement);
    }
    return $(selector, prevElement as cheerio.Cheerio);
  }

  private static processSelector(
    query: IQueryStruct,
    prevElement: IPreviusElement,
    context: Context
  ) {
    const { selector, required, eq, how, attr, convert } = query;
    const { $ } = context;
    if (!selector) return null;

    let element = Query.getElementBySelector($, selector, prevElement);

    if ((required ?? false) && element.length) {
      context.insideContext.error = true;
      return null;
    }

    if (eq !== undefined) {
      let newEq = eq;
      if (eq < 0) {
        newEq = element.length + eq;
      }
      element = element.eq(newEq);
    }

    let value: unknown = element.text();

    if (how) {
      if (how === 'text') {
        value = element.text();
      }
      if (how === 'html') {
        value = element.html();
      }
    }

    if (attr) {
      value = element.attr(attr);
    }

    if (convert) {
      value = this.processCommand(convert, value, context.globalContext);
    }

    return value;
  }

  private static processQueryStruct(
    query: IQueryStruct,
    context: Context,
    prevElement?: IPreviusElement
  ) {
    const resultItemList = this.processItemList(query, prevElement, context);
    if (resultItemList !== null) {
      return resultItemList;
    }

    const resultSelector = this.processSelector(query, prevElement, context);
    if (resultSelector !== null) {
      return resultSelector;
    }

    Object.keys(query).forEach((key) => {
      if (Query.excludeKeys(key)) {
        return;
      }

      if (typeof query[key] === 'object') {
        context.globalContext.context[key] = this.processQueryStruct(
          query[key] as IQueryStruct,
          context,
          prevElement
        );
      }

      if (typeof query[key] === 'string') {
        context.globalContext.context[key] = this.processQueryStruct(
          { selector: query[key] as string },
          context,
          prevElement
        );
      }
    });

    return { ...context.globalContext.context };
  }

  private static excludeKeys(key: string) {
    return (
      [
        'itemList',
        'data',
        'attr',
        'convert',
        'how',
        'eq',
        'selector',
        'required',
      ].indexOf(key) !== -1
    );
  }

  // Command

  private static processCommand(
    command: unknown,
    value: unknown,
    globalContext: IGlobalContext = {
      context: {},
      baseUrl: '',
      url: '',
    }
  ) {
    globalContext.commandStruct ??= QueryStruct;
    globalContext.helper ??= this.processCommand;

    if (typeof command === 'string') {
      return Query.stringCommand(command, value, globalContext);
    }

    if (typeof command === 'function') {
      return command(value, { globalContext });
    }

    if (typeof command === 'object') {
      return Query.objectCommand(value, command, globalContext);
    }

    return undefined;
  }

  private static stringCommand(
    command: string,
    value: unknown,
    globalContext: IGlobalContext
  ) {
    const subContext = (globalContext.commandStruct as Record<string, unknown>)[
      command
    ] as
      | ((value: unknown, context: unknown) => unknown)
      | Record<string, (value: unknown, context: unknown) => unknown>;

    if (typeof subContext === 'function') {
      return subContext(value, { globalContext });
    }
    if (typeof subContext === 'object') {
      if (subContext.$ !== undefined) {
        return subContext.$(value, { globalContext });
      }
    }
    return undefined;
  }

  private static objectCommand(
    value: unknown,
    command: object | null,
    globalContext: IGlobalContext
  ) {
    let newValue = value;
    Object.keys(command as Record<string, unknown>).forEach((key) => {
      const property = (command as Record<string, unknown>)[key];
      const subContext = (
        globalContext.commandStruct as Record<string, unknown>
      )[key] as IStruct;

      if (subContext === undefined) {
        return;
      }

      if (typeof subContext === 'object') {
        if (subContext[property as string] !== undefined) {
          newValue = this.processCommand(property, newValue, {
            ...globalContext,
            commandStruct: subContext,
          });
          return;
        }

        if (subContext['#'] !== undefined) {
          newValue = (subContext['#'] as IStructFunc)(newValue, {
            globalContext: globalContext as IGlobalContextStruct,
            property,
          });
        }
      }
    });

    return newValue;
  }

  private static processResponse(response: string) {
    return response
      .replace(/<script\b[^>]*><\/script>/gm, '')
      .replace(/<meta\b[^>]*>/gm, '')
      .replace(/(\r\n|\r|\n|\t)/gm, '');
  }

  static registerQuery(name: string, query: IQuery) {
    this.Queries[name] = query;
  }

  private static addIntervals(
    name: string,
    url: string,
    { time, method }: IQueryOptions
  ) {
    const newUrl = LoadUrl.processUrl(url);
    if (method !== undefined) {
      if (method === 'reload') {
        LoadUrl.addReloadInterval(newUrl, time as number, async () => {
          delete this.Cache[name][newUrl];
          this.useQuery(name, newUrl, { useCache: true });
        });
      }

      if (method === 'delete') {
        LoadUrl.addDeleteInterval(newUrl, time as number, async () => {
          delete this.Cache[name][newUrl];
        });
      }
    }
  }

  static async useQuery(
    name: string,
    url: string,
    options: IQueryOptions = {}
  ) {
    const { useCache, args, method } = options;
    const newUrl = LoadUrl.processUrl(url);

    this.Cache[name] ??= {};

    if (this.Cache[name][newUrl] !== undefined && (useCache ?? false)) {
      return this.Cache[name][newUrl];
    }

    const { baseUrl } = LoadUrl.parseUrl(newUrl);

    const query = this.Queries[name][baseUrl];

    if (this.isPromise(query as Record<string, unknown>)) {
      const newArgs = { ...args, url: newUrl };
      const result = await (query as IQueryFunc)(newArgs);
      return result;
    }

    const response = await LoadUrl.LoadUrl(newUrl, useCache);

    if (method !== undefined) {
      this.addIntervals(name, url, options);
    }

    const newResponse = this.processResponse(response.response);

    if (!/<\/?[a-z][\s\S]*>/i.test(newResponse)) {
      return undefined;
    }

    const insideContext = { error: false };

    const context = {
      globalContext: {
        context: {},
        baseUrl: response.baseUrl,
        url: response.url,
      },
      insideContext: {
        error: false,
      },
      $: cheerio.load(newResponse),
    };

    const queryData = this.processQueryStruct(query as IQueryStruct, context);

    if (insideContext.error) {
      return undefined;
    }

    if (useCache) {
      this.Cache[this.name][url] = queryData;
    }

    return queryData;
  }

  private static isPromise(p: Record<string, unknown>) {
    if (p.constructor.name === 'AsyncFunction') {
      return true;
    }

    return false;
  }
}
Query.registerQuery('AnimeDataFromPage', {
  'https://www3.animeflv.net': {
    imageSrc: {
      selector: '.AnimeCover > .Image > figure > img',
      attr: 'src',
      convert: 'relativeURL',
    },
    state: {
      selector: '.AnmStts > span',
      convert: {
        enum: ['En emision', 'Finalizado'],
      },
    },
    type: {
      selector: '.Container .Type',

      convert: {
        normalize: 'NFD',
        replace: {
          search: /[\u0300-\u036f]/g,
          replace: '',
        },
        enum: ['Anime', 'OVA', 'Pelicula', 'Especial'],
      },
      required: true,
    },
    name: {
      selector: '.Container > .Title',
      convert: {
        converts: ['trim', 'lowercase'],
      },
    },
    description: {
      selector: '.Description > p',
    },
    score: {
      selector: '.Votes > #votes_prmd',
      convert: 'float',
    },
    genres: {
      itemList: '.Nvgnrs > a',
      data: {
        selector: '&',
        convert: {
          converts: ['trim', 'lowercase'],
          normalize: 'NFD',
          replace: {
            search: /[\u0300-\u036f]/g,
            replace: '',
          },
        },
      },
    },
    votes: {
      selector: '#votes_nmbr',
      convert: 'int',
    },
    episodes: {
      selector: 'script',
      eq: -3,
      convert: {
        match: /\[\s*([^[\]]*?)\s*\]/g,
        map: 'json',
        externalProperties: {
          nextEpisode: {
            valueMethod: 'shift',
            idx: 3,
            convert: 'date',
          },
          episodeUrlParser: {
            valueMethod: 'shift',
            idx: 2,
            parse: '$baseUrl$/ver/$value$-$$',
          },
        },
        method: 'shift',
        property: 'length',
      },
    },
    relAnimes: {
      itemList: '.ListAnmRel > li > a',
      data: {
        selector: '&',
        attr: 'href',
        convert: {
          converts: ['relativeURL', 'validUrl'],
        },
      },
    },
    names: {
      itemList: '.Container > div > .TxtAlt',
      data: {
        selector: '&',
      },
      convert: {
        filter: {
          not: {
            validation: 'empty',
          },
        },
        map: {
          replaces: [
            ['OVA', ''],
            ['『氷結の絆』', ''],
            ['ParallelWorld', ''],
          ],
          converts: ['trim', 'lowercase'],
        },
      },
    },
    relAnime: {
      selector: '.ListAnmRel > li > a',
      attr: 'href',
      convert: {
        converts: ['relativeURL', 'validUrl'],
      },
    },
  },
});
