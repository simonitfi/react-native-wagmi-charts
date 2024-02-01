import * as React from 'react';
import Animated, {
  useAnimatedReaction,
  useSharedValue,
} from 'react-native-reanimated';
import { Path, PathProps } from 'react-native-svg';

import { LineChartDimensionsContext } from './Chart';
import { LineChartPathContext } from './LineChartPathContext';
import useAnimatedPath from './useAnimatedPath';
import { useLineChart } from './useLineChart';

const AnimatedPath = Animated.createAnimatedComponent(Path);

export type LineChartPathProps = Animated.AnimateProps<PathProps> & {
  color?: string;
  inactiveColor?: string;
  width?: number;
  isInactive?: boolean;
  /**
   * Default: `true`.
   *
   * If `false`, changes in the chart's path will not animate.
   *
   * While this use case is rare, it may be useful on web, where animations might not work as well.
   *
   * **Example**
   *
   * ```tsx
   * <LineChart.Path
   *   pathProps={{ isTransitionEnabled: Platform.OS !== 'web' }}
   * />
   * ```
   */
  isTransitionEnabled?: boolean;
};

LineChartPath.displayName = 'LineChartPath';

export function LineChartPath({
  color = 'black',
  inactiveColor,
  width: strokeWidth = 3,
  ...props
}: LineChartPathProps) {
  const { isTransitionEnabled, isInactive } =
    React.useContext(LineChartPathContext);
  const { isActive } = useLineChart();
  ////////////////////////////////////////////////

  const { animatedProps } = useAnimatedPath({
    enabled: isTransitionEnabled,
    isActive,
  });

  return (
    <>
      <AnimatedPath
        animatedProps={animatedProps}
        fill="transparent"
        stroke={isInactive ? inactiveColor || color : color}
        strokeOpacity={isInactive && !inactiveColor ? 0.2 : 1}
        strokeWidth={strokeWidth}
        {...props}
      />
    </>
  );
}
