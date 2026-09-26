import { describe, expect, it, vi } from "vitest";

import { DebouncedAction } from "../src/utils/debouncedAction";

describe("debounced action", () => {
  it("coalesces repeated document-change analysis requests", () => {
    vi.useFakeTimers();
    const action = vi.fn();
    const debounced = new DebouncedAction(350, action);

    debounced.schedule();
    debounced.schedule();
    debounced.schedule();
    expect(action).not.toHaveBeenCalled();

    vi.advanceTimersByTime(349);
    expect(action).not.toHaveBeenCalled();

    vi.advanceTimersByTime(1);
    expect(action).toHaveBeenCalledTimes(1);
    expect(debounced.pending).toBe(false);

    vi.useRealTimers();
  });

  it("cancels pending analysis when a save or forced refresh takes over", () => {
    vi.useFakeTimers();
    const action = vi.fn();
    const debounced = new DebouncedAction(350, action);

    debounced.schedule();
    expect(debounced.pending).toBe(true);
    debounced.cancel();
    vi.advanceTimersByTime(350);

    expect(action).not.toHaveBeenCalled();
    expect(debounced.pending).toBe(false);
    vi.useRealTimers();
  });
});
