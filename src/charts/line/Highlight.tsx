import * as React from 'react';
import Animated, { runOnJS, useDerivedValue } from 'react-native-reanimated';
import { Path, PathProps } from 'react-native-svg';

import { LineChartDimensionsContext } from './Chart';
import { LineChartPathContext } from './LineChartPathContext';
import useAnimatedPath from './useAnimatedPath';
import { useLineChart } from './useLineChart';
import { addPath, findPath, getPath, smoothData_ } from './utils';

const AnimatedPath = Animated.createAnimatedComponent(Path);

export type LineChartColorProps = Animated.AnimateProps<PathProps> & {
  color?: string;
  from: number;
  to: number;
  sFrom?: number;
  sTo?: number;
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
  sFrom = from,
  sTo = to,
  width: strokeWidth = 3,
  ...props
}: LineChartColorProps) {
  const { data, sData, yDomain, xDomain } = useLineChart();
  const { pathWidth, height, gutter, shape, smoothDataRadius, update, isLiveData, pathBuffer, forcePathUpdate } = React.useContext(
    LineChartDimensionsContext
  );
  const { isTransitionEnabled, isInactive: _isInactive } =
    React.useContext(LineChartPathContext);
  const isInactive = showInactiveColor && _isInactive;

  const { isActive } = useLineChart();

  const smoothData = React.useMemo(() => (sData || data), [sData, data]);
  
  ////////////////////////////////////////////////

  const smoothedPath = React.useMemo(() => {
    if (smoothData && smoothData.length > 0 && sTo < smoothData.length) {
      const bPath = findPath({
        from: sFrom, to: sTo, fromData: smoothData[sFrom].smoothedValue, toData: smoothData[sTo].smoothedValue, totalLength: smoothData.length, data: '',
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
        return bPath.data
      }
      const result = getPath({
        data: smoothData, // smoothData_(smoothData),
        from: sFrom,
        to: sTo,
        width: pathWidth,
        height,
        gutter,
        shape,
        yDomain,
        xDomain,
        isOriginalData: false,
      });
      addPath({
        from: sFrom, to: sTo, fromData: smoothData[sFrom].smoothedValue, toData: smoothData[sTo].smoothedValue, totalLength: smoothData.length, data: result,
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
    smoothData,
    smoothDataRadius,
    sFrom,
    sTo,
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
  }, [height, gutter, shape, update, forcePathUpdate]);

  const { animatedProps } = useAnimatedPath({
    enabled: isTransitionEnabled,
    path: path,
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
