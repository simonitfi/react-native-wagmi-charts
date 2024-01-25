import * as React from 'react';
// @ts-ignore
import * as d3Shape from 'd3-shape';

import { Dimensions, StyleSheet, View, ViewProps } from 'react-native';
import { LineChartIdProvider, useLineChartData } from './Data';
import { Path, parse } from 'react-native-redash';
import { getArea, getPath, smoothData } from './utils';

import { LineChartContext } from './Context';
import { runOnJS, useDerivedValue } from 'react-native-reanimated';

export const LineChartDimensionsContext = React.createContext({
  width: 0,
  height: 0,
  pointWidth: 0,
  parsedPath: {} as Path,
  path: '',
  smoothedParsedPath: {} as Path,
  smoothedPath: '',
  area: '',
  smoothedArea: '',
  shape: d3Shape.curveBumpX,
  gutter: 0,
  pathWidth: 0,
  smoothDataRadius: 0.5,
  update: 0,
  isLiveData: false,
  updateContext: 0
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
  ...props
}: LineChartProps) {
  const { yDomain, xLength, xDomain, isActive } = React.useContext(LineChartContext);
  const { data } = useLineChartData({
    id,
  });

  const [update, setUpdate] = React.useState(0);
  const [updateContext, setUpdateContext] = React.useState(0);

  useDerivedValue(() => {
    console.log(isLiveData, isActive.value);
    if (isLiveData) runOnJS(setUpdate)(Date.now())
    else runOnJS(setUpdateContext)(Date.now())
  }, []); // No need to pass dependencies

  console.log('RENDER', isLiveData, update, (update === 0 || (!isActive.value)), updateContext, data.length)

  React.useEffect(() => {
    const timeout = setTimeout(() => {
      setUpdate(Date.now())
    }, 1500)
  }, []);

  const pathWidth = React.useMemo(() => {
    let allowedWidth = width;
    if (xLength > data.length) {
      allowedWidth = (width * data.length) / xLength;
    }
    return allowedWidth;
  }, [data.length, width, xLength]);

  const smoothedPath = React.useMemo(() => {
    if (data && data.length > 0) {
      const radius = smoothDataRadius ? smoothDataRadius : 0.5;
      return getPath({
        data: smoothData(data, radius),
        width: pathWidth,
        height,
        gutter: yGutter,
        shape,
        yDomain,
        xDomain,
        isOriginalData: false,
      });
    }
    return '';
  }, [
    data,
    smoothDataRadius,
    pathWidth,
    height,
    yGutter,
    shape,
    yDomain,
    xDomain,
  ]);

  const path = React.useMemo(() => {
    if (update === 0 || (!isActive.value && isLiveData)){
      console.log('getPath !!', update, isActive.value)
      return smoothedPath
    } 
    if (data && data.length > 0) {
      console.log('getPath',height, yGutter, shape, yDomain, xDomain, update)
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
  }, [height, yGutter, shape, update]);

  const smoothedArea = React.useMemo(() => {
    if (data && data.length > 0) {
      const radius = smoothDataRadius ? smoothDataRadius : 0.5;
      return getArea({
        data: smoothData(data, radius),
        width: pathWidth,
        height,
        gutter: yGutter,
        shape,
        yDomain,
        isOriginalData: false,
      });
    }
    return '';
  }, [data, pathWidth, height, yGutter, shape, yDomain, smoothDataRadius]);

  const area = React.useMemo(() => {
    if (update === 0 || (!isActive.value && isLiveData)) return smoothedArea
    if (data && data.length > 0) {
      console.log('getArea',height, yGutter, shape, yDomain, xDomain, update)
      return getArea({
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
  }, [height, yGutter, shape, update]);

  const dataLength = data.length;
  const smoothedParsedPath = React.useMemo(() => parse(smoothedPath), [smoothedPath]);
  const parsedPath = React.useMemo(() => parse(path), [update]);

  const pointWidth = React.useMemo(
    () => width / (dataLength - 1),
    [dataLength, width]
  );

  const contextValue = React.useMemo(
    () => ({
      gutter: yGutter,
      parsedPath: (update === 0 || (!isActive.value)) ? smoothedParsedPath : parsedPath,
      smoothedParsedPath,
      pointWidth,
      area: (update === 0 || (!isActive.value)) ? smoothedArea : area,
      smoothedArea,
      path: (update === 0 || (!isActive.value)) ? smoothedPath : path,
      smoothedPath,
      width,
      height,
      pathWidth,
      shape,
      smoothDataRadius,
      update,
      isLiveData,
      updateContext
    }),
    [
      yGutter,
      parsedPath,
      smoothedParsedPath,
      pointWidth,
      area,
      smoothedArea,
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
