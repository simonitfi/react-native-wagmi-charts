import * as React from 'react';
import Animated, { runOnJS, useDerivedValue } from 'react-native-reanimated';
import { Path, PathProps } from 'react-native-svg';

import { LineChartDimensionsContext } from './Chart';
import { LineChartPathContext } from './LineChartPathContext';
import useAnimatedPath from './useAnimatedPath';
import { useLineChart } from './useLineChart';
import { addPath, findPath, getPath, smoothData } from './utils';

const AnimatedPath = Animated.createAnimatedComponent(Path);

export type LineChartColorProps = Animated.AnimateProps<PathProps> & {
  color?: string;
  from: number;
  to: number;
  showInactiveColor?: boolean;
  inactiveColor?: string;
  width?: number;
};

LineChartHighlight.displayName = 'LineChartHighlight';

export function LineChartHighlight({
  color = 'black',
  inactiveColor,
  showInactiveColor = true,
  from,
  to,
  width: strokeWidth = 3,
  ...props
}: LineChartColorProps) {
  const { data, yDomain, xDomain } = useLineChart();
  const { pathWidth, height, gutter, shape, smoothDataRadius, update, isLiveData, pathBuffer } = React.useContext(
    LineChartDimensionsContext
  );
  const { isTransitionEnabled, isInactive: _isInactive } =
    React.useContext(LineChartPathContext);
  const isInactive = showInactiveColor && _isInactive;

  const { isActive } = useLineChart();

  ////////////////////////////////////////////////

  const smoothedPath = React.useMemo(() => {
    if (data && data.length > 0) {
      const radius = smoothDataRadius ? smoothDataRadius : 0.5;
      const bPath = findPath({
        from, to, fromData: data[from].smoothedValue, toData: data[to].smoothedValue, totalLength: data.length, data: '',
        index: 0,
        meta: {
          pathWidth: pathWidth,
          height: height,
          gutter: gutter,
          yDomain,
          xDomain
        }
      }, pathBuffer.current)

      if (bPath) {
        console.log('FOUND OLD ONE')
        return bPath.data
      }
      const result = getPath({
        data: smoothData(data, radius),
        from,
        to,
        width: pathWidth,
        height,
        gutter,
        shape,
        yDomain,
        xDomain,
        isOriginalData: false,
      });
      addPath({
        from, to, fromData: data[from].smoothedValue, toData: data[to].smoothedValue, totalLength: data.length, data: result,
        index: 0,
        meta: {
          pathWidth: pathWidth,
          height: height,
          gutter: gutter,
          yDomain,
          xDomain
        }
      }, pathBuffer.current)
      return result
    }
    return '';
  }, [
    data,
    smoothDataRadius,
    pathWidth,
    height,
    gutter,
    shape,
    yDomain,
    xDomain,
  ]);

  const path = React.useMemo(() => {
    if (update === 0 || (!isActive.value && isLiveData)) return smoothedPath
    if (data && data.length > 0) {
      // console.log('getPath HIGHLIGHT',height, gutter, shape, yDomain, xDomain, update)
      return getPath({
        data,
        from,
        to,
        width: pathWidth,
        height,
        gutter,
        shape,
        yDomain,
        xDomain,
        isOriginalData: true,
      });
    }
    return '';
  }, [height, gutter, shape, update]);

  const { animatedProps } = useAnimatedPath({
    enabled: isTransitionEnabled,
    path: (update === 0 || (!isActive.value)) ? smoothedPath : path,
    smoothedPath: smoothedPath,
    isActive,
  });
  ////////////////////////////////////////////////

  return (
    <>
      <AnimatedPath
        animatedProps={animatedProps}
        fill="transparent"
        stroke={isInactive ? inactiveColor || color : color}
        strokeWidth={strokeWidth}
        strokeOpacity={isInactive && !inactiveColor ? 0.5 : 1}
        {...props}
      />
    </>
  );
}
