export default class SmartInterval {
  running: boolean;

  firstCycle: boolean;

  constructor(
    public name: string,
    public asyncFn: (smartInterval: SmartInterval) => Promise<void>,
    public delayMs: number
  ) {
    this.firstCycle = true;
    this.running = false;
  }

  async cycle(forced?: boolean) {
    if (this.firstCycle) {
      this.firstCycle = false;
    } else {
      await this.asyncFn(this);
    }
    await this.delay(this.delayMs);
    if (!forced && this.running) this.cycle();
  }

  start() {
    if (this.running) return;
    this.running = true;
    // console.log('The intreval' + this.name + 'is running');
    this.cycle();
  }

  stop() {
    if (this.running) this.running = false;
    // console.log('The intreval' + this.name + 'is complite');
  }

  forceExecution() {
    if (this.running) this.cycle(true);
  }

  // eslint-disable-next-line class-methods-use-this
  delay(ms: number) {
    // eslint-disable-next-line promise/param-names
    return new Promise((res) => setTimeout(() => res(1), ms));
  }
}
