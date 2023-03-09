export interface IReloadInterval {
  callback?: () => Promise<void>;
  nextTime: number;
  intervalTime: number;
}
