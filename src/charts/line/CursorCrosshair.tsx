import * as React from 'react';
import { Platform, View, ViewProps } from 'react-native';
import Animated, {
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';

import { LineChartCursor, LineChartCursorProps } from './Cursor';
import { useLineChart } from './useLineChart';
import { LineChartDimensionsContext } from './Chart';

type LineChartCursorCrosshairProps = Omit<
  LineChartCursorProps,
  'children' | 'type'
> & {
  children?: React.ReactNode;
  color?: string;
  size?: number;
  outerSize?: number;
  crosshairWrapperProps?: Animated.AnimateProps<ViewProps>;
  crosshairProps?: ViewProps;
  crosshairOuterProps?: ViewProps;
};

LineChartCursorCrosshair.displayName = 'LineChartCursorCrosshair';

export function LineChartCursorCrosshair({
  children,
  color = 'black',
  size = 8,
  outerSize = 32,
  crosshairWrapperProps = {},
  crosshairProps = {},
  crosshairOuterProps = {},
  ...props
}: LineChartCursorCrosshairProps) {
  const { currentX, currentY, isActive, data, xDomain } = useLineChart();

  const { pathWidth: width } = React.useContext(
    LineChartDimensionsContext
  );

  // It seems that enabling spring animation on initial render on Android causes a crash.
  const [enableSpringAnimation, setEnableSpringAnimation] = React.useState(
    Platform.OS === 'ios'
  );
  React.useEffect(() => {
    setTimeout(() => {
      setEnableSpringAnimation(true);
    }, 100);
  }, []);

  const animatedCursorStyle = useAnimatedStyle(
    () => {
      // Hide cursor for null values
      const boundedX = Math.max(0, currentX.value <= width ? (currentX.value) : width);
      const minIndex = data.findIndex((element: { value: null; }) => element.value !== null);
      const maxIndex = minIndex !== 0 || data.findIndex((element: { value: null; }) => element.value === null) === -1 ? data.length - 1 : data.findIndex((element: { value: null; }) => element.value === null) - 1;

      const total = xDomain ? xDomain[1] - xDomain[0] : data.length - 1
      const minVal = xDomain ? data[minIndex].timestamp : minIndex
      const maxVal = xDomain ? data[maxIndex].timestamp : maxIndex

      let opacity: number

      if ((boundedX / width < (1 / (total)) * maxVal) && (boundedX / width > (1 / (total)) * minVal)) {
        opacity = 1
        console.log('visible', boundedX)
      } else {
        opacity = 0
      }
      return {
        transform: [
          { translateX: currentX.value - outerSize / 2 },
          { translateY: currentY.value - outerSize / 2 },
          {
            scale: enableSpringAnimation
              ? withSpring(isActive.value ? 1 : 0, {
                damping: 10,
              })
              : 0,
          },
        ],
        opacity
      }
    },
    [currentX, currentY, enableSpringAnimation, isActive, outerSize, data]
  );

  return (
    <LineChartCursor type="crosshair" {...props}>
      <Animated.View
        {...crosshairWrapperProps}
        style={[
          {
            width: outerSize,
            height: outerSize,
            alignItems: 'center',
            justifyContent: 'center',
          },
          animatedCursorStyle,
          crosshairWrapperProps.style,
        ]}
      >
        <View
          {...crosshairOuterProps}
          style={[
            {
              backgroundColor: color,
              width: outerSize,
              height: outerSize,
              borderRadius: outerSize,
              opacity: 0.1,
              position: 'absolute',
            },
            crosshairOuterProps.style,
          ]}
        />
        <View
          {...crosshairProps}
          style={[
            {
              backgroundColor: color,
              width: size,
              height: size,
              borderRadius: size,
            },
            crosshairProps.style,
          ]}
        />
      </Animated.View>
      {children}
    </LineChartCursor>
  );
}
