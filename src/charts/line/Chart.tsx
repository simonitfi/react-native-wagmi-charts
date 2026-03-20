import * as React from 'react';
// @ts-ignore
import * as d3Shape from 'd3-shape';

import { Dimensions, Platform, StyleSheet, View, ViewProps } from 'react-native';
import { LineChartIdProvider, useLineChartData } from './Data';

import { LineChartContext } from './Context';
import { scheduleOnRN } from 'react-native-worklets';
import { useAnimatedReaction, useSharedValue } from 'react-native-reanimated';
import { Path } from 'react-native-redash';
import { LineChartAreaBuffer, LineChartPathBuffer } from 'react-native-wagmi-charts/src/charts/line/types';
import useParsedPath from 'react-native-wagmi-charts/src/charts/line/useParsedPath';

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
  forcePathUpdate: 0,
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
  ...props
}: LineChartProps) {
  const { xLength, isActive } = React.useContext(LineChartContext);
  const { data } = useLineChartData({
    id,
  });

  const [update, setUpdate] = React.useState(0);
  const [updateContext, setUpdateContext] = React.useState(0);
  const pathBuffer = React.useRef<LineChartPathBuffer>([]);
  const areaBuffer = React.useRef<LineChartAreaBuffer>([]);

  React.useEffect(() => {
    // On WEb force update
    Platform.OS === 'web' && setUpdate(Date.now())
  }, [height]);

  React.useEffect(() => {
    // Web-only: force an initial render so path dimensions are computed after layout.
    // Skipped on native to avoid extra renders on every mount.
    if (Platform.OS === 'web') {
      setTimeout(() => {
        setUpdate(Date.now());
      }, 100);
    }
  }, []);

  // Only call setUpdateContext once (Tooltip checks updateContext === 0 as
  // "cursor never used" sentinel). For live data, setUpdate is handled inside
  // useAnimatedPath's own isActive reaction — no need to fire every frame here.
  const updateContextSetRef = useSharedValue(false);
  useAnimatedReaction(
    () => isActive.value,
    (active, previous) => {
      if (active === previous || previous === null) return;
      if (isLiveData) {
        // Signal live-data path refresh only when gesture ends
        if (!active) scheduleOnRN(setUpdate, Date.now());
      } else {
        // Flip updateContext from 0 once so Tooltip knows cursor has been used
        if (!updateContextSetRef.value) {
          updateContextSetRef.value = true;
          scheduleOnRN(setUpdateContext, Date.now());
        }
      }
    },
    [isLiveData]
  );

  const pathWidth = React.useMemo(() => {
    let allowedWidth = width;
    if (data && xLength > data.length) {
      allowedWidth = (width * data.length) / xLength;
    }
    // On WEb force update
    Platform.OS === 'web' && setUpdate(Date.now())
    return allowedWidth;
  }, [data, width, xLength]);

  const pointWidth = React.useMemo(
    () => width / (data ? data.length - 1 : 1),
    [data, width]
  );

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
  })

  const stableContextValue = React.useMemo(
    () => ({
      gutter: yGutter,
      pointWidth,
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
    }),
    [yGutter, pointWidth, width, height, pathWidth, shape, update, isLiveData]
  );

  const dataContextValue = React.useMemo(
    () => ({ isOriginal, updateContext }),
    [isOriginal, updateContext]
  );

  return (
    <LineChartIdProvider id={id}>
      <LineChartDimensionsContext.Provider value={stableContextValue}>
        <LineChartDataContext.Provider value={dataContextValue}>
          <View {...props} style={[absolute && styles.absolute, props.style]}>
            {children}
          </View>
        </LineChartDataContext.Provider>
      </LineChartDimensionsContext.Provider>
    </LineChartIdProvider>
  );
}

const styles = StyleSheet.create({
  absolute: {
    position: 'absolute',
  },
});
