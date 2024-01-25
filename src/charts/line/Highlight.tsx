import * as React from 'react';
import Animated, { runOnJS, useDerivedValue } from 'react-native-reanimated';
import { Path, PathProps } from 'react-native-svg';

import { LineChartDimensionsContext } from './Chart';
import { LineChartPathContext } from './LineChartPathContext';
import useAnimatedPath from './useAnimatedPath';
import { useLineChart } from './useLineChart';
import { getPath, smoothData } from './utils';

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
  const { data, yDomain, xDomain, lastPath } = useLineChart();
  const { pathWidth, height, gutter, shape, smoothDataRadius, update, isLiveData } = React.useContext(
    LineChartDimensionsContext
  );
  const { isTransitionEnabled, isInactive: _isInactive } =
    React.useContext(LineChartPathContext);
  const isInactive = showInactiveColor && _isInactive;

  const { isActive } = useLineChart();

  //console.log('xxx',lastPath.current)

  ////////////////////////////////////////////////

  const smoothedPath = React.useMemo(() => {
    if (data && data.length > 0) {
      const radius = smoothDataRadius ? smoothDataRadius : 0.5;
      if (lastPath.current.from === from && lastPath.current.to === to) return lastPath.current.data
      console.log('getPath',from, to)
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
      lastPath.current.from = from
      lastPath.current.to = to
      lastPath.current.data = result
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
      console.log('getPath HIGHLIGHT',height, gutter, shape, yDomain, xDomain, update)
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
