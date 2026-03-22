import * as React from 'react';
import { scheduleOnRN } from 'react-native-worklets';
import {
  useAnimatedReaction,
  useSharedValue,
} from 'react-native-reanimated';
import type { TLineChartDataProp } from './types';
import { LineChartDataProvider } from './Data';

import type { TLineChartContext, TLineChartDomain, YRangeProp } from './types';
import { getDomain, lineChartDataPropToArray } from './utils';
import { onInternalProfilerRender } from '../../profiler';

/**
 * Compute a stable xDomainQuantize value (in ms) for use with LineChartProvider.
 *
 * The quantize value determines how many milliseconds the x-axis end must move
 * before a path recalculation is triggered. By tying this to pixel density
 * rather than a fixed time unit, the same threshold works correctly whether
 * the chart shows 10 minutes or 10 hours.
 *
 * @param totalDurationMs  xDomain[1] - xDomain[0] — full visible duration in ms
 * @param chartWidthPx     Width of the chart canvas in pixels
 * @param pixelThreshold   How many pixels of x-movement count as a meaningful
 *                         change. Default 1.5 — sub-1.5px changes are invisible.
 *
 * @example
 * const quantize = computeXDomainQuantize(xDomain[1] - xDomain[0], chartWidth);
 * <LineChart.Provider xDomain={xDomain} xDomainQuantize={quantize} ...>
 */
export function computeXDomainQuantize(
  totalDurationMs: number,
  chartWidthPx: number,
  pixelThreshold: number = 1.5,
): number {
  if (chartWidthPx <= 0 || totalDurationMs <= 0) return 1000;
  const msPerPixel = totalDurationMs / chartWidthPx;
  return Math.max(1000, Math.ceil(msPerPixel * pixelThreshold));
}

export const LineChartContext = React.createContext<TLineChartContext>({
  currentX: { value: -1 } as TLineChartContext['currentX'],
  currentIndex: { value: -1 } as TLineChartContext['currentIndex'],
  domain: [0, 0],
  isActive: { value: false } as TLineChartContext['isActive'],
  yDomain: {
    min: 0,
    max: 0,
  },
  xDomain: undefined,
  xLength: 0
});

type LineChartProviderProps = {
  children: React.ReactNode;
  data: TLineChartDataProp;
  sData?: TLineChartDataProp;
  yRange?: YRangeProp;
  onCurrentIndexChange?: (x: number) => void;
  xLength?: number;
  xDomain?: [number, number];
  onActiveChange?: (isActive: boolean) => void;
  /**
   * Round xDomain[1] up to the nearest multiple of this value (milliseconds).
   * Prevents micro-updates to the total expected duration from triggering full
   * path recalculations on every live-data tick.
   * Example: xDomainQuantize={60000} → xDomain[1] only changes once per minute.
   */
  xDomainQuantize?: number;
};

LineChartProvider.displayName = 'LineChartProvider';

export function LineChartProvider({
  children,
  data = [],
  sData = [],
  yRange,
  onCurrentIndexChange,
  xLength,
  xDomain,
  onActiveChange,
  xDomainQuantize,
}: LineChartProviderProps) {
  const currentX = useSharedValue(-1);
  const currentIndex = useSharedValue(-1);
  const isActive = useSharedValue(false);

  const allRows = React.useMemo(() => lineChartDataPropToArray(data), [data]);

  const prevDomainRef = React.useRef<TLineChartDomain | null>(null);
  const domain = React.useMemo(() => {
    const d = getDomain(allRows);
    const prev = prevDomainRef.current;
    if (prev && prev[0] === d[0] && prev[1] === d[1]) return prev;
    prevDomainRef.current = d;
    return d;
  }, [allRows]);

  // Fast O(n) single-pass min/max — avoids creating an intermediate values[]
  // and avoids the variadic Math.min/max spread (stack-overflow risk on large
  // datasets). Short-circuits entirely when both bounds are caller-supplied.
  // Returns the same reference when min/max haven't changed, preventing
  // unnecessary downstream context/memo recalculations.
  const prevYDomainRef = React.useRef<{ min: number; max: number } | null>(null);
  const yDomain = React.useMemo(() => {
    let min: number, max: number;
    if (yRange?.min !== undefined && yRange?.max !== undefined) {
      min = yRange.min; max = yRange.max;
    } else {
      min = Infinity; max = -Infinity;
      for (const row of allRows) {
        const v = row.value;
        if (v !== null && v !== undefined) {
          if (v < min) min = v;
          if (v > max) max = v;
        }
      }
      min = yRange?.min ?? min;
      max = yRange?.max ?? max;
    }
    const prev = prevYDomainRef.current;
    if (prev && prev.min === min && prev.max === max) return prev;
    const result = { min, max };
    prevYDomainRef.current = result;
    return result;
  }, [allRows, yRange?.min, yRange?.max]);

  // Quantize xDomain[1] to reduce re-renders from small incremental changes.
  // With live data the total expected duration grows by ~1s per second;
  // rounding up to the nearest xDomainQuantize ms keeps the x-scale stable
  // between quantization boundaries, cutting path recalculations drastically.
  const quantizedXDomain = React.useMemo<[number, number] | undefined>(() => {
    if (!xDomain) return undefined;
    if (!xDomainQuantize || xDomainQuantize <= 0) return xDomain;
    const quantizedMax = Math.ceil(xDomain[1] / xDomainQuantize) * xDomainQuantize;
    return [xDomain[0], quantizedMax];
  }, [xDomain, xDomainQuantize]);

  // Stabilize xDomain reference — the caller may recreate the tuple literal
  // every render (e.g. xDomain={[0, 100]}). Return the same reference when
  // the values are identical to prevent downstream context re-renders.
  const prevXDomainRef = React.useRef(quantizedXDomain);
  const stableXDomain = React.useMemo(() => {
    const prev = prevXDomainRef.current;
    if (prev === quantizedXDomain) return prev;
    if (prev && quantizedXDomain && prev[0] === quantizedXDomain[0] && prev[1] === quantizedXDomain[1]) return prev;
    prevXDomainRef.current = quantizedXDomain;
    return quantizedXDomain;
  }, [quantizedXDomain]);

  // Cache the longest-dataset length independently so contextValue memo
  // doesn't need to re-run Object.values every time data changes.
  const datasetLength = React.useMemo(() => {
    if (xLength !== undefined) return xLength;
    if (Array.isArray(data)) return data.length;
    let longest = 0;
    for (const ds of Object.values(data)) {
      if (ds && ds.length > longest) longest = ds.length;
    }
    return longest;
  }, [data, xLength]);

  const contextValue = React.useMemo<TLineChartContext>(() => {
    return {
      currentX,
      currentIndex,
      isActive,
      domain,
      yDomain,
      xDomain: stableXDomain,
      xLength: datasetLength,
    };
  }, [
    currentIndex,
    currentX,
    domain,
    isActive,
    yDomain,
    stableXDomain,
    datasetLength,
  ]);

  useAnimatedReaction(
    () => isActive.value,
    (data: any, prevData: any) => {
      const prevData_ = !!prevData
      if (data !== prevData_ && onActiveChange) {
        scheduleOnRN(onActiveChange, isActive.value);
      }
    },
    [isActive, onActiveChange]
  );

  useAnimatedReaction(
    () => currentIndex.value,
    (x, prevX) => {
      if (x !== -1 && x !== prevX && onCurrentIndexChange) {
        scheduleOnRN(onCurrentIndexChange, x);
      }
    },
    [currentIndex, onCurrentIndexChange]
  );

  return (
    <React.Profiler id="LineChartProvider" onRender={onInternalProfilerRender}>
      <LineChartDataProvider data={data} sData={sData}>
        <LineChartContext.Provider value={contextValue}>
          {children}
        </LineChartContext.Provider>
      </LineChartDataProvider>
    </React.Profiler>
  );
}
