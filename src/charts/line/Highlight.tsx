import * as React from 'react';
import Animated from 'react-native-reanimated';
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
  const { data, yDomain, xDomain } = useLineChart();
  const { pathWidth, height, gutter, shape, smoothDataRadius } = React.useContext(
    LineChartDimensionsContext
  );
  const { isTransitionEnabled, isInactive: _isInactive } =
    React.useContext(LineChartPathContext);
  const isInactive = showInactiveColor && _isInactive;

  const { isActive } = useLineChart();

  ////////////////////////////////////////////////

  const path = React.useMemo(() => {
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
  }, [data, from, to, pathWidth, height, gutter, shape, yDomain, xDomain]);

  const smoothedPath = React.useMemo(() => {
    if (data && data.length > 0) {
      const radius = smoothDataRadius ? smoothDataRadius : 2;
      return getPath({
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
