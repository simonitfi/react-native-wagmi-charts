import * as React from 'react';
// @ts-ignore
import * as d3Shape from 'd3-shape';

import { Dimensions, Platform, StyleSheet, View, ViewProps } from 'react-native';
import { LineChartIdProvider, useLineChartData } from './Data';

import { LineChartContext } from './Context';
import { scheduleOnRN } from 'react-native-worklets';
import { useAnimatedReaction, useSharedValue } from 'react-native-reanimated';
import { Path } from 'react-native-redash';
import { LineChartAreaBuffer, LineChartPathBuffer } from './types';
import useParsedPath from './useParsedPath';
import { onInternalProfilerRender } from '../../profiler';

export type DataInfoSV = {
  hasData: boolean;
  total: number;
  minVal: number;
  maxVal: number;
  maxIndex: number;
  hasXDomain: boolean;
};

/**
 * Performance tuning knobs for LineChart.
 * All flags default to `false` (original behaviour) so existing code is unaffected.
 *
 * Pass via `<LineChart performanceConfig={{ skipMorphOnLiveData: true, ... }}>`
 */
export type LineChartPerformanceConfig = {
  /**
   * When `true`, path/area morph animations are skipped on live-data charts.
   * The chart snaps instantly to the new path instead of interpolating at 60 fps.
   * Eliminates the most expensive per-frame worklet (`interpolatePath`).
   * @default false
   */
  skipMorphOnLiveData?: boolean;
  /**
   * When `true`, the `useAnimatedProps` worklet for path/area short-circuits
   * once the morph transition finishes (`transition === 1`).
   * Prevents the worklet from re-evaluating every frame while idle.
   * @default false
   */
  guardTransitionEnd?: boolean;
  /**
   * When `true`, the tooltip `useAnimatedStyle` worklet returns early
   * when no cursor is active and no static `at` index is set.
   * Avoids ~190 lines of per-frame math when the tooltip is invisible.
   * @default false
   */
  guardTooltipIdle?: boolean;
  /**
   * When `true`, the chart path always fills the full container width
   * regardless of whether `dataLength < xLength`.
   * Prevents the ~10% right-side gap that appears when the Provider's
   * `xLength` is larger than the current number of data points.
   * @default false
   */
  fillWidth?: boolean;
};

const DEFAULT_PERF_CONFIG: LineChartPerformanceConfig = {};

export const LineChartDimensionsContext = React.createContext({
  width: 0,
  height: 0,
  pointWidth: 0,
  shape: d3Shape.curveBumpX,
  gutter: 0,
  pathWidth: 0,
  update: 0,
  isLiveData: false,
  parsedPathSV: { value: { curves: [], move: { x: 0, y: 0 }, close: false } as Path } as { value: Path },
  pathBuffer: {} as React.RefObject<LineChartPathBuffer>,
  areaBuffer: {} as React.RefObject<LineChartAreaBuffer>,
  forcePathUpdate: undefined as boolean | undefined,
  dataInfoSV: { value: { hasData: false, total: 0, minVal: 0, maxVal: 0, maxIndex: 0, hasXDomain: false } as DataInfoSV } as { value: DataInfoSV },
  performanceConfig: {} as LineChartPerformanceConfig,
});

export const LineChartDataContext = React.createContext({
  isOriginal: false,
  updateContext: 0,
});

export type LineChartProps = ViewProps & {
  children: React.ReactNode;
  yGutter?: number;
  width?: number;
  height?: number;
  shape?: d3Shape.CurveFactory;
  /**
   * If your `LineChart.Provider` uses a dictionary with multiple IDs for multiple paths, then this field is required.
   */
  id?: string;
  absolute?: boolean;
  isLiveData?: boolean;
  forcePathUpdate?: boolean;
  performanceConfig?: LineChartPerformanceConfig;
};

const { width: screenWidth } = Dimensions.get('window');

LineChart.displayName = 'LineChart';

export function LineChart({
  children,
  yGutter = 16,
  width = screenWidth,
  height = screenWidth,
  shape = d3Shape.curveBumpX,
  id,
  absolute,
  isLiveData = false,
  forcePathUpdate,
  performanceConfig = DEFAULT_PERF_CONFIG,
  ...props
}: LineChartProps) {
  const { xLength, isActive, xDomain } = React.useContext(LineChartContext);
  const { data } = useLineChartData({
    id,
  });

  const [update, setUpdate] = React.useState(0);
  const [updateContext, setUpdateContext] = React.useState(0);
  const pathBuffer = React.useRef<LineChartPathBuffer>([]);
  const areaBuffer = React.useRef<LineChartAreaBuffer>([]);

  React.useEffect(() => {
    // On Web force update
    Platform.OS === 'web' && setUpdate(Date.now())
  }, [height]);

  React.useEffect(() => {
    if (Platform.OS === 'web') {
      setTimeout(() => {
        setUpdate(Date.now());
      }, 100);
    }
  }, []);

  const updateContextSetRef = useSharedValue(false);
  useAnimatedReaction(
    () => isActive.value,
    (active, previous) => {
      if (active === previous || previous === null) return;
      if (isLiveData) {
        if (!active) scheduleOnRN(setUpdate, Date.now());
      } else {
        if (!updateContextSetRef.value) {
          updateContextSetRef.value = true;
          scheduleOnRN(setUpdateContext, Date.now());
        }
      }
    },
    [isLiveData]
  );

  const dataLength = data ? data.length : 0;

  // Stabilize pathWidth: round to integer so ±1 data length fluctuations
  // don't cause a different value every tick.
  const prevPathWidthRef = React.useRef(width);
  const pathWidth = React.useMemo(() => {
    if (performanceConfig.fillWidth) return width;
    let allowedWidth = width;
    if (dataLength > 0 && xLength > dataLength) {
      allowedWidth = Math.round(width * dataLength / xLength);
    }
    if (Math.abs(allowedWidth - prevPathWidthRef.current) < 2) {
      return prevPathWidthRef.current;
    }
    prevPathWidthRef.current = allowedWidth;
    return allowedWidth;
  }, [dataLength, width, xLength]);

  React.useEffect(() => {
    Platform.OS === 'web' && setUpdate(Date.now());
  }, [pathWidth]);

  // Compute data-derived values ONCE here (not per-tooltip).
  // Stored as a SharedValue so Tooltip worklets auto-track changes
  // without requiring React re-renders.
  const dataInfoSV = useSharedValue<DataInfoSV>({
    hasData: false, total: 0, minVal: 0, maxVal: 0, maxIndex: 0, hasXDomain: false,
  });
  React.useEffect(() => {
    if (!data || data.length === 0) {
      dataInfoSV.value = { hasData: false, total: 0, minVal: 0, maxVal: 0, maxIndex: 0, hasXDomain: false };
      return;
    }
    let minIdx = 0, maxIdx = data.length - 1;
    if (data[0]?.value === null || data[data.length - 1]?.value === null) {
      minIdx = data.findIndex((e) => e.value !== null);
      maxIdx = minIdx !== 0 || data.findIndex((e) => e.value === null) === -1
        ? data.length - 1
        : data.findIndex((e) => e.value === null) - 1;
    }
    dataInfoSV.value = {
      hasData: true,
      total: xDomain ? xDomain[1] - xDomain[0] : data.length - 1,
      minVal: xDomain ? (data[minIdx]?.timestamp ?? 0) : minIdx,
      maxVal: xDomain ? (data[maxIdx]?.timestamp ?? 0) : maxIdx,
      maxIndex: maxIdx,
      hasXDomain: !!xDomain,
    };
  }, [data, xDomain]);

  const { parsedPathSV, isOriginal } = useParsedPath({
    yGutter,
    id,
    isActive,
    pathWidth,
    height,
    width,
    shape,
    isLiveData,
    update,
    pathBuffer
  });

  const stableContextValue = React.useMemo(
    () => ({
      gutter: yGutter,
      pointWidth: width / (dataLength > 1 ? dataLength - 1 : 1),
      width,
      height,
      pathWidth,
      shape,
      update,
      isLiveData,
      parsedPathSV,
      pathBuffer,
      areaBuffer,
      forcePathUpdate,
      dataInfoSV,
      performanceConfig,
    }),
    // pointWidth computed inline. parsedPathSV/dataInfoSV are stable SharedValue refs.
    [yGutter, width, height, pathWidth, shape, update, isLiveData, performanceConfig]
  );

  const dataContextValue = React.useMemo(
    () => ({ isOriginal, updateContext }),
    [isOriginal, updateContext]
  );

  return (
    <React.Profiler id={`LineChart-${id ?? 'default'}`} onRender={onInternalProfilerRender}>
      <LineChartIdProvider id={id}>
        <LineChartDimensionsContext.Provider value={stableContextValue}>
          <LineChartDataContext.Provider value={dataContextValue}>
            <View {...props} style={[absolute && styles.absolute, props.style]}>
              {children}
            </View>
          </LineChartDataContext.Provider>
        </LineChartDimensionsContext.Provider>
      </LineChartIdProvider>
    </React.Profiler>
  );
}

const styles = StyleSheet.create({
  absolute: {
    position: 'absolute',
  },
});
