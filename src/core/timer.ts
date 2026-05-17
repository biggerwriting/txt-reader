// src/core/timer.ts

export class ReadingTimer {
  private _elapsed: number
  private intervalId: ReturnType<typeof setInterval> | null = null

  constructor(initialSeconds: number) {
    this._elapsed = initialSeconds
  }

  get elapsed(): number {
    return this._elapsed
  }

  start(): void {
    if (this.intervalId !== null) return
    this.intervalId = setInterval(() => {
      this._elapsed++
    }, 1000)
  }

  stop(): void {
    if (this.intervalId === null) return
    clearInterval(this.intervalId)
    this.intervalId = null
  }

  static format(seconds: number): string {
    const minutes = Math.ceil(seconds / 60)
    if (minutes < 60) return `${minutes}分钟`
    const h = Math.floor(minutes / 60)
    const m = minutes % 60
    return `${h}小时${m}分钟`
  }
}
