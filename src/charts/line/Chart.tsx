import * as React from 'react';
// @ts-ignore
import * as d3Shape from 'd3-shape';

import { Dimensions, Platform, StyleSheet, View, ViewProps } from 'react-native';
import { LineChartIdProvider, useLineChartData } from './Data';
import { Path } from 'react-native-redash';

import { LineChartContext } from './Context';
import { runOnJS, useDerivedValue } from 'react-native-reanimated';
import { LineChartAreaBuffer, LineChartPathBuffer } from 'react-native-wagmi-charts/src/charts/line/types';
import useParsedPath from 'react-native-wagmi-charts/src/charts/line/useParsedPath';

export const LineChartDimensionsContext = React.createContext({
  width: 0,
  height: 0,
  pointWidth: 0,
  parsedPath: {} as Path,
  path: '',
  shape: d3Shape.curveBumpX,
  gutter: 0,
  pathWidth: 0,
  update: 0,
  isLiveData: false,
  updateContext: 0,
  pathBuffer: {} as React.RefObject<LineChartPathBuffer>,
  areaBuffer: {} as React.RefObject<LineChartAreaBuffer>,
  forcePathUpdate: 0,
  isOriginal: false
});


type LineChartProps = ViewProps & {
  children: React.ReactNode;
  yGutter?: number;
  width?: number;
  height?: number;
  shape?: unknown;
  /**
   * If your `LineChart.Provider` uses a dictionary with multiple IDs for multiple paths, then this field is required.
   */
  id?: string;
  absolute?: boolean;
  isLiveData?: boolean;
  forcePathUpdate?: boolean;
  isOriginal: boolean;
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

  const round = React.useRef(0);

  React.useEffect(() => {
    // On WEb force update
    Platform.OS === 'web' && setUpdate(Date.now())
  }, [height]);

  useDerivedValue(() => {
    let dum = 0
    if (isActive.value) dum = 1
    if (isLiveData) runOnJS(setUpdate)(Date.now())
    else runOnJS(setUpdateContext)(Date.now())
  }, []); // No need to pass dependencies

  React.useEffect(() => {
    round.current++
    if (round.current === 2) {
      setTimeout(() => {
        setUpdate(Date.now())
      }, 100)
    }
  });

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

  const { parsedPath, path, isOriginal } = useParsedPath({
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

  const contextValue = React.useMemo(
    () => ({
      gutter: yGutter,
      path,
      parsedPath,
      pointWidth,
      width,
      height,
      pathWidth,
      shape,
      update,
      isLiveData,
      updateContext,
      pathBuffer,
      areaBuffer,
      forcePathUpdate,
      isOriginal
    }),
    [
      yGutter,
      parsedPath,
      pointWidth,
      width,
      height,
      pathWidth,
      shape,
      update,
      isLiveData,
      updateContext,
      isOriginal
    ]
  );

  return (
    <LineChartIdProvider id={id}>
      <LineChartDimensionsContext.Provider value={contextValue}>
        <View {...props} style={[absolute && styles.absolute, props.style]}>
          {children}
        </View>
      </LineChartDimensionsContext.Provider>
    </LineChartIdProvider>
  );
}

const styles = StyleSheet.create({
  absolute: {
    position: 'absolute',
  },
});
