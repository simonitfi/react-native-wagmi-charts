import * as React from 'react';
import Animated, { runOnJS, useDerivedValue } from 'react-native-reanimated';
import { Path, PathProps } from 'react-native-svg';

import { LineChartPathContext } from './LineChartPathContext';
import useAnimatedPath from './useAnimatedPath';
import { useLineChart } from './useLineChart';

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

  const { isTransitionEnabled, isInactive: _isInactive } =
    React.useContext(LineChartPathContext);
  const isInactive = showInactiveColor && _isInactive;

  const { isActive } = useLineChart();

  const { animatedProps } = useAnimatedPath({
    enabled: isTransitionEnabled,
    from,
    to,
    sFrom,
    sTo,
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
