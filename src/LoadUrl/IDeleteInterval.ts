export interface IDeleteInterval {
  callback?: () => Promise<void>;
  nextTime: number;
}
