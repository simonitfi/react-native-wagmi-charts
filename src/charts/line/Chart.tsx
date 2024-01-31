import * as React from 'react';
// @ts-ignore
import * as d3Shape from 'd3-shape';

import { Dimensions, StyleSheet, View, ViewProps } from 'react-native';
import { LineChartIdProvider, useLineChartData } from './Data';
import { Path, parse } from 'react-native-redash';
import { addPath, findPath, getPath, smoothData_ } from './utils';

import { LineChartContext } from './Context';
import { runOnJS, useAnimatedReaction, useDerivedValue } from 'react-native-reanimated';
import { LineChartAreaBuffer, LineChartPathBuffer } from 'react-native-wagmi-charts/src/charts/line/types';

export const LineChartDimensionsContext = React.createContext({
  width: 0,
  height: 0,
  pointWidth: 0,
  parsedPath: {} as Path,
  path: '',
  smoothedParsedPath: {} as Path,
  smoothedPath: '',
  shape: d3Shape.curveBumpX,
  gutter: 0,
  pathWidth: 0,
  smoothDataRadius: 0.5,
  update: 0,
  isLiveData: false,
  updateContext: 0,
  pathBuffer: {} as React.RefObject<LineChartPathBuffer>,
  areaBuffer: {} as React.RefObject<LineChartAreaBuffer>,
  forcePathUpdate: 0
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
  smoothDataRadius?: number;
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
  smoothDataRadius,
  isLiveData = false,
  forcePathUpdate,
  ...props
}: LineChartProps) {
  const { yDomain, xLength, xDomain, isActive } = React.useContext(LineChartContext);
  const { data, sData } = useLineChartData({
    id,
  });

  const [update, setUpdate] = React.useState(0);
  const [updateContext, setUpdateContext] = React.useState(0);
  const pathBuffer = React.useRef([]);
  const areaBuffer = React.useRef([]);

  const round = React.useRef(0);

  const smoothData = React.useMemo(() => (sData || data), [sData, data]);

  useDerivedValue(() => {
    let dum = 0
    if (isActive.value)  dum = 1
    if (isLiveData) runOnJS(setUpdate)(Date.now())
    else runOnJS(setUpdateContext)(Date.now())
  }, []); // No need to pass dependencies

  React.useEffect(() => {
    round.current++
  }, []);

  React.useEffect(() => {
    round.current++
    if (round.current === 2){
      const timeout = setTimeout(() => {
        setUpdate(Date.now())
      }, 100)
    }
  });

  const pathWidth = React.useMemo(() => {
    let allowedWidth = width;
    if (xLength > data.length) {
      allowedWidth = (width * data.length) / xLength;
    }
    return allowedWidth;
  }, [data.length, width, xLength]);

  const smoothedPath = React.useMemo(() => {
    if (smoothData && smoothData.length > 0) {
      const bPath = findPath({
        from: 0, to: smoothData.length - 1, fromData: smoothData[0].smoothedValue, toData: smoothData[smoothData.length - 1].smoothedValue,
        fromTime: smoothData[0].timestamp, toTime: smoothData[smoothData.length - 1].timestamp,
        totalLength: smoothData.length, data: '',
        index: 0,
        meta: {
          pathWidth: pathWidth,
          height: height,
          gutter: yGutter,
          yDomain,
          xDomain
        }
      }, pathBuffer.current)
      if (bPath) {
        return bPath.data
      }
      const result = getPath({
        data: smoothData,//smoothData_(smoothData),
        width: pathWidth,
        height,
        gutter: yGutter,
        shape,
        yDomain,
        xDomain,
        isOriginalData: false,
      });
      if (typeof smoothData[smoothData.length - 1].smoothedValue === 'number' && typeof smoothData[0].smoothedValue === 'number')
        addPath({
          from: 0, to: smoothData.length - 1, fromData: smoothData[0].smoothedValue, toData: smoothData[smoothData.length - 1].smoothedValue,
          fromTime: smoothData[0].timestamp, toTime: smoothData[smoothData.length - 1].timestamp,
          totalLength: smoothData.length, data: result,
          index: 0,
          meta: {
            pathWidth: pathWidth,
            height: height,
            gutter: yGutter,
            yDomain,
            xDomain
          }
        }, pathBuffer.current)
      return result
    }
    return '';
  }, [
    smoothData,
    smoothDataRadius,
    pathWidth,
    height,
    yGutter,
    shape,
    yDomain,
    xDomain,
  ]);

  const path = React.useMemo(() => {
    if (update === 0 || (!isActive.value && isLiveData)) {
      return smoothedPath
    }
    if (data && data.length > 0) {
      return getPath({
        data,
        width: pathWidth,
        height,
        gutter: yGutter,
        shape,
        yDomain,
        xDomain,
        isOriginalData: true,
      });
    }
    return '';
  }, [height, yGutter, shape, update, forcePathUpdate]);

  const dataLength = data.length;
  const smoothedParsedPath = React.useMemo(() => {
    return parse(smoothedPath)
  }, [smoothedPath]);
  const parsedPath = React.useMemo(() => parse(path), [update]);

  const pointWidth = React.useMemo(
    () => width / (dataLength - 1),
    [dataLength, width]
  );

  const contextValue = React.useMemo(
    () => ({
      gutter: yGutter,
      parsedPath: (update === 0 || (!isActive.value && isLiveData)) ? smoothedParsedPath : parsedPath,
      smoothedParsedPath,
      pointWidth,
      path: (update === 0 || (!isActive.value && isLiveData)) ? smoothedPath : path,
      smoothedPath,
      width,
      height,
      pathWidth,
      shape,
      smoothDataRadius,
      update,
      isLiveData,
      updateContext,
      pathBuffer,
      areaBuffer,
      forcePathUpdate
    }),
    [
      yGutter,
      parsedPath,
      smoothedParsedPath,
      pointWidth,
      path,
      smoothedPath,
      width,
      height,
      pathWidth,
      shape,
      smoothDataRadius,
      update,
      isLiveData,
      updateContext
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
