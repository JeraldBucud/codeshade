export class DebouncedAction {
  private timer: ReturnType<typeof setTimeout> | undefined;

  constructor(
    private readonly delayMs: number,
    private readonly action: () => void
  ) {}

  schedule(): void {
    this.cancel();
    this.timer = setTimeout(() => {
      this.timer = undefined;
      this.action();
    }, this.delayMs);
  }

  cancel(): void {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = undefined;
    }
  }

  get pending(): boolean {
    return this.timer !== undefined;
  }
}
