import Animated, {
  useAnimatedProps,
  useDerivedValue,
  withTiming,
} from 'react-native-reanimated';
import { LineProps, Line as SVGLine } from 'react-native-svg';

import { LineChartDimensionsContext } from './Chart';
import React from 'react';
import { getXPositionForCurve } from './utils/getXPositionForCurve';
import { getYForX } from 'react-native-redash';
import { useLineChart } from './useLineChart';
import { LineChartPathContext } from 'react-native-wagmi-charts/src/charts/line/LineChartPathContext';

const AnimatedLine = Animated.createAnimatedComponent(SVGLine);

type HorizontalLineProps = {
  color?: string;
  lineProps?: Partial<LineProps>;
  offsetY?: number;
  /**
   * (Optional) A pixel value to nudge the line up or down.
   *
   * This may be useful to customize the line's position based on the thickness of your cursor or chart path.
   *
   * ```tsx
   * <LineChart.HorizontalLine
   *   at={{ index: 3 }}
   * />
   *
   * // or
   *
   * <LineChart.HorizontalLine
   *   at={{ value: 320.32}}
   * />
   * ```
   */
  at?:
    | {
        index: number;
        value?: never;
      }
    | {
        index?: never;
        value: number;
      }
    | number;
};

LineChartHorizontalLine.displayName = 'LineChartHorizontalLine';

export function LineChartHorizontalLine({
  color = 'gray',
  lineProps = {},
  at = { index: 0 },
  offsetY = 0,
}: HorizontalLineProps) {
  const { width, parsedPath, height, gutter } = React.useContext(
    LineChartDimensionsContext
  );
  const { yDomain } = useLineChart();
  const { animationDuration } = React.useContext(LineChartPathContext);

  const y = useDerivedValue(() => {
    if (typeof at === 'number' || at.index != null) {
      const index = typeof at === 'number' ? at : at.index;
      const yForX =
        getYForX(parsedPath!, getXPositionForCurve(parsedPath, index)) || 0;
      return withTiming(yForX + offsetY, {duration: animationDuration});
    }
    /**
     * <gutter>
     * | ---------- | <- yDomain.max  |
     * |            |                 | offsetTop
     * |            | <- value        |
     * |            |
     * |            | <- yDomain.min
     * <gutter>
     */

    const offsetTop = yDomain.max - at.value;
    const percentageOffsetTop = offsetTop / (yDomain.max - yDomain.min);

    const heightBetweenGutters = height - gutter * 2;

    const offsetTopPixels = gutter + percentageOffsetTop * heightBetweenGutters;

    return withTiming(offsetTopPixels + offsetY, {duration: animationDuration});
  }, [at, gutter, height, offsetY, parsedPath, yDomain.max, yDomain.min, animationDuration]);

  const lineAnimatedProps = useAnimatedProps(
    () => ({
      x1: 0,
      x2: width,
      y1: y.value,
      y2: y.value,
    }),
    [width, y]
  );

  return (
    <AnimatedLine
      animatedProps={lineAnimatedProps}
      strokeWidth={2}
      stroke={color}
      strokeDasharray="3 3"
      {...lineProps}
    />
  );
}
