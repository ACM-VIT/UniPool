export type ScheduledIdleTask = {
  cancel: () => void;
};

type RequestIdleCallback = (
  callback: () => void,
  options?: { timeout?: number },
) => number;

type CancelIdleCallback = (handle: number) => void;

export const scheduleIdleTask = (
  callback: () => void,
  timeout?: number,
): ScheduledIdleTask => {
  let cancelled = false;
  const run = () => {
    if (!cancelled) callback();
  };

  const idleGlobals = globalThis as typeof globalThis & {
    requestIdleCallback?: RequestIdleCallback;
    cancelIdleCallback?: CancelIdleCallback;
  };

  if (typeof idleGlobals.requestIdleCallback === "function") {
    const handle = idleGlobals.requestIdleCallback(
      run,
      timeout === undefined ? undefined : { timeout },
    );
    return {
      cancel: () => {
        cancelled = true;
        idleGlobals.cancelIdleCallback?.(handle);
      },
    };
  }

  const handle = setTimeout(run, 0);
  return {
    cancel: () => {
      cancelled = true;
      clearTimeout(handle);
    },
  };
};
