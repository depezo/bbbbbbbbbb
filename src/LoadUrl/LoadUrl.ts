import puppeteer from 'puppeteer-extra';
import { Browser, executablePath, Page } from 'puppeteer';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import AdblockerPlugin from 'puppeteer-extra-plugin-adblocker';
import SmartInterval from '../SmartInterval';
import { ICache } from './ICache';
import { IReloadInterval } from './IReloadInterval';
import { IDeleteInterval } from './IDeleteInterval';

export default class LoadUrl {
  static Cache: Record<string, ICache> = {};

  static BrowserData?: { browser: Browser; page: Page };

  static ReloadIntevals: Record<string, IReloadInterval> = {};

  static DeleteIntervals: Record<string, IDeleteInterval> = {};

  static Events: Record<string, (() => void)[]> = {};

  static isLoopRunning = false;

  static async LoadUrl(url: string, useCache = false): Promise<ICache> {
    if (!this.isValidUrl(url)) {
      throw new Error('The url is invalid');
    }

    const newUrl = this.processUrl(url);

    if (useCache && this.Cache[newUrl] !== undefined) {
      return this.Cache[newUrl];
    }

    const response = await this.getResponse(newUrl);
    const { baseUrl, subRoute } = this.parseUrl(newUrl);

    if (useCache && this.Cache[newUrl] !== undefined) {
      this.Cache[newUrl] = {
        response,
        url: newUrl,
        baseUrl,
        subRoute,
      };
    }

    return {
      response,
      url: newUrl,
      baseUrl,
      subRoute,

    };
  }

  static async onReload(url: string, callback: () => void) {
    this.Events[url].push(callback);
  }

  static async ReloadUrl(url: string): Promise<void> {
    if (!this.isValidUrl(url)) {
      return;
    }

    const newUrl = this.processUrl(url);

    if (this.Cache[newUrl] !== undefined) {
      delete LoadUrl.Cache[newUrl];
    }

    await this.LoadUrl(newUrl);
  }

  static async addReloadInterval(
    url: string,
    intervalTime: number,
    callback?: () => Promise<void>
  ) {
    const now = Date.now();
    this.ReloadIntevals[url] ??= {
      callback,
      nextTime: now + intervalTime,
      intervalTime,
    };
  }

  static async addDeleteInterval(
    url: string,
    intervalTime: number,
    callback?: () => Promise<void>
  ) {
    const now = Date.now();
    this.DeleteIntervals[url] ??= {
      callback,
      nextTime: now + intervalTime,
    };
  }

  static async initializeBroswer() {
    if (this.BrowserData === undefined) {
      puppeteer.use(StealthPlugin());
      puppeteer.use(AdblockerPlugin({ blockTrackers: true }));
      const browser = await puppeteer.launch({
        headless: true,
        executablePath: executablePath(),
      });
      const page = await browser.newPage();
      this.BrowserData = { browser, page };
    }
  }

  static async closeBrowser() {
    if (this.BrowserData !== undefined) {
      await this.BrowserData.browser.close();
      this.BrowserData = undefined;
    }
  }

  static startLoop() {
    if (!LoadUrl.isLoopRunning) {
      new SmartInterval('LoadUrlLoop', this.loop, 100).start();
      LoadUrl.isLoopRunning = true;
    }
  }

  private static async getResponse(url: string) {
    await this.initializeBroswer();
    if (this.BrowserData === undefined) {
      return '';
    }
    const response = await this.BrowserData.page.goto(url);
    if (response != null) {
      const body = await response.text();
      return body;
    }
    return '';
  }

  private static async loop() {
    this.isLoopRunning = true;
    const reloadIntervals = { ...this.ReloadIntevals };
    const deleteIntervals = { ...this.DeleteIntervals };

    const now = Date.now();

    await Promise.all(
      Object.keys(reloadIntervals).map(async (url) => {
        const updateInterval = reloadIntervals[url] as IReloadInterval;
        if (updateInterval.nextTime < now) {
          await this.ReloadUrl(url);

          if (updateInterval.callback) {
            await updateInterval.callback();
          }
          this.Events[url].forEach((item) => item());
        }
        updateInterval.nextTime += updateInterval.nextTime;
      })
    );

    await Promise.all(
      Object.keys(deleteIntervals).map(async (url) => {
        const deleteInterval = this.DeleteIntervals[url];
        if (deleteInterval.nextTime < now) {
          if (deleteInterval.callback) {
            await deleteInterval.callback();
          }
          delete this.Cache[url];
          delete this.DeleteIntervals[url];
        }
      })
    );
  }

  static isValidUrl(url: string) {
    return /(http(s)?:\/\/.)?(www\.)?[-a-zA-Z0-9@:%._+~#=]{2,256}\.[a-z]{2,6}\b([-a-zA-Z0-9@:%_+.~#?&//=]*)/.test(
      url
    );
  }

  static processUrl(url: string) {
    return url
      .trim()
      .replace(/\b(\/\/+)/gim, '/')
      .replace(/\b(\/+)?$/gim, '');
  }

  static parseUrl(url: string) {
    const baseUrl = (url.match(/^.+?[^/:](?=[?/]|$)/) as RegExpMatchArray)[0];
    const subRoute = url.replace(baseUrl, '');
    return { baseUrl, subRoute };
  }
}
