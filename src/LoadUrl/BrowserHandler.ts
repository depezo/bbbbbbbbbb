import puppeteer from 'puppeteer-extra';
import { Browser, executablePath, Page } from 'puppeteer';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import AdblockerPlugin from 'puppeteer-extra-plugin-adblocker';
import SmartInterval from '../SmartInterval';
import { IReloadInterval } from './IReloadInterval';
import { IDeleteInterval } from './IDeleteInterval';

interface ICache{
  url:string;
  baseUrl:string;
  subPath:string;
  page?:Page;
}

export default class BrowserHandler{
  static Browser?: Browser;
  static Page?:Page;
  static LoadedPages: Record<string,Page> = {};
  static ReloadIntevals: Record<string, IReloadInterval> = {};
  static DeleteIntervals: Record<string, IDeleteInterval> = {};
  static Events: Record<string, (() => void)[]> = {};

  static isLoopRunning = false;

  static async initializeBroswer() {
    if (this.Browser === undefined) {
      puppeteer.use(StealthPlugin());
      puppeteer.use(AdblockerPlugin({ blockTrackers: true }));
      const browser = await puppeteer.launch({
        headless: true,
        executablePath: executablePath(),
      });
      this.Browser = browser;
      this.Page = await browser.newPage();
    }
  }

  static async closeBrowser() {
    if (this.Browser !== undefined) {
      await this.Browser.close();
      this.Browser = undefined;
    }
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
    const subPath = url.replace(baseUrl, '');
    return { baseUrl,  subPath };
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

  static startLoop() {
    if (!this.isLoopRunning) {
      new SmartInterval('LoadUrlLoop', this.loop, 100).start();
      this.isLoopRunning = true;
    }
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
          //await this

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

}