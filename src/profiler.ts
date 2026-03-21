import type { ProfilerOnRenderCallback } from 'react';

// ─── tunables ─────────────────────────────────────────────────────────────────
/** Renders that take longer than this (ms) are printed as warnings. */
const SLOW_MS = 8;

// ─── external callback registry ───────────────────────────────────────────────
let _externalCb: ProfilerOnRenderCallback | null = null;

/**
 * Forward all internal React.Profiler events to the app-level profiler so
 * they appear in ProfilerPanel alongside the outer CurveLive / WagmiChart entries.
 *
 * Call once at app startup (e.g. in App.tsx):
 *
 *   import { registerWagmiProfilerCallback } from '@simonitfi/react-native-wagmi-charts'
 *   import { onProfilerRender } from '@/utils/profiler'
 *   registerWagmiProfilerCallback(onProfilerRender)
 *
 * Pass `null` to unregister.
 */
export function registerWagmiProfilerCallback(
  cb: ProfilerOnRenderCallback | null,
) {
  _externalCb = cb;
}

/**
 * Drop this as the `onRender` prop on every internal <React.Profiler>.
 * - Warns in Metro console when a render exceeds SLOW_MS.
 * - Forwards every event to the callback registered via registerWagmiProfilerCallback().
 * - In production React strips all Profiler trees → zero overhead.
 */
export const onInternalProfilerRender: ProfilerOnRenderCallback = (
  id,
  phase,
  actualDuration,
  baseDuration,
  startTime,
  commitTime,
) => {
  if (__DEV__ && actualDuration >= SLOW_MS) {
    console.warn(
      `[WagmiChart] SLOW "${id}" [${phase}]  actual=${actualDuration.toFixed(1)}ms  base=${baseDuration.toFixed(1)}ms`,
    );
  }
  _externalCb?.(id, phase, actualDuration, baseDuration, startTime, commitTime);
};
