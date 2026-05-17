// src/core/timer.test.ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { ReadingTimer } from './timer'

describe('ReadingTimer', () => {
  beforeEach(() => { vi.useFakeTimers() })
  afterEach(() => { vi.useRealTimers() })

  it('increments elapsed every second while running', () => {
    const timer = new ReadingTimer(0)
    timer.start()
    vi.advanceTimersByTime(3000)
    expect(timer.elapsed).toBe(3)
  })

  it('does not increment when stopped', () => {
    const timer = new ReadingTimer(0)
    timer.start()
    vi.advanceTimersByTime(2000)
    timer.stop()
    vi.advanceTimersByTime(3000)
    expect(timer.elapsed).toBe(2)
  })

  it('starts from existing seconds', () => {
    const timer = new ReadingTimer(100)
    timer.start()
    vi.advanceTimersByTime(5000)
    expect(timer.elapsed).toBe(105)
  })

  it('formats elapsed time correctly', () => {
    expect(ReadingTimer.format(23 * 60)).toBe('23分钟')
    expect(ReadingTimer.format(75 * 60)).toBe('1小时15分钟')
    expect(ReadingTimer.format(59)).toBe('1分钟')
    expect(ReadingTimer.format(3600)).toBe('1小时0分钟')
  })
})
