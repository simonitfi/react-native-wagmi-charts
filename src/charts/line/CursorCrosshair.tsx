import * as React from 'react';
import { Platform, View, ViewProps, StyleSheet } from 'react-native';
import Animated, {
  AnimatedProps,
  useAnimatedReaction,
  useAnimatedStyle,
  useDerivedValue,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';

import { LineChartCursor, LineChartCursorProps } from './Cursor';
import { useLineChart } from './useLineChart';
import { LineChartDimensionsContext } from './Chart';
import { getYForX } from 'react-native-redash';

const ANDROID_SPRING_ANIMATION_DELAY_MS = 100;

type LineChartCursorCrosshairProps = Omit<
  LineChartCursorProps,
  'children' | 'type'
> & {
  children?: React.ReactNode;
  color?: string;
  size?: number;
  outerSize?: number;
  crosshairWrapperProps?: AnimatedProps<ViewProps>;
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
  const { currentX, currentY, isActive } = useLineChart();

  const { pathWidth: width, parsedPathSV, dataInfoSV } = React.useContext(
    LineChartDimensionsContext
  );

  // Precomputed snap position and x/y bounds on the UI thread from SharedValues.
  // Replaces the old useEffect that iterated `data` on the JS thread.
  const snapInfoDV = useDerivedValue(() => {
    const path = parsedPathSV.value;
    const info = dataInfoSV.value;

    if (!info.hasData || path.curves.length === 0) {
      return { snapX: 0, snapY: 0, minXBound: 0, maxXBound: width };
    }

    const minXBound = info.total > 0 ? (info.minVal - info.xDomainMin) / info.total * width : 0;

    // Find the rightmost rendered point.
    let snapX = 0;
    let snapY = 0;
    let rightmostX = -1;
    for (let i = 0; i < path.curves.length; i++) {
      const c = path.curves[i];
      if (c && c.to.x > rightmostX) {
        rightmostX = c.to.x;
        snapX = c.to.x;
        snapY = c.to.y;
      }
    }

    if (snapX > 0) {
      const refined = getYForX(path, snapX);
      if (refined !== null && refined !== undefined) snapY = refined;
    }

    const maxXBound = snapX > 0 ? snapX : width;

    return { snapX, snapY, minXBound, maxXBound };
  }, [parsedPathSV, dataInfoSV, width]);

  // It seems that enabling spring animation on initial render on Android causes a crash.
  const [enableSpringAnimation, setEnableSpringAnimation] = React.useState(
    Platform.OS === 'ios'
  );
  React.useEffect(() => {
    const timer = setTimeout(() => {
      setEnableSpringAnimation(true);
    }, ANDROID_SPRING_ANIMATION_DELAY_MS);
    return () => clearTimeout(timer);
  }, []);

  const enableSpringAnimationSV = useSharedValue(enableSpringAnimation);
  React.useEffect(() => {
    enableSpringAnimationSV.value = enableSpringAnimation;
  }, [enableSpringAnimation]);

  // Drive scale from a plain SharedValue so withSpring only fires when
  // isActive changes, not on every currentX/currentY update.
  const animatedScale = useSharedValue(0);
  useAnimatedReaction(
    () => isActive.value,
    (active) => {
      animatedScale.value = enableSpringAnimationSV.value
        ? withSpring(active ? 1 : 0, { damping: 10, stiffness: 100, mass: 0.3 })
        : (active ? 1 : 0);
    },
    [isActive, enableSpringAnimationSV]
  );

  const animatedCursorStyle = useAnimatedStyle(
    () => {
      const withinRange =
        currentX.value > snapInfoDV.value.minXBound && currentX.value < snapInfoDV.value.maxXBound;
      const x = withinRange ? currentX.value : snapInfoDV.value.snapX;
      const y = withinRange ? currentY.value : snapInfoDV.value.snapY;

      return {
        transform: [
          { translateX: x - outerSize / 2 },
          { translateY: y - outerSize / 2 },
          { scale: animatedScale.value },
        ],
        opacity: 1,
      };
    },
    [currentX, currentY, animatedScale, outerSize, snapInfoDV]
  );

  return (
    <LineChartCursor type="crosshair" {...props}>
      <Animated.View
        {...crosshairWrapperProps}
        style={[
          styles.crosshairWrapper,
          {
            width: outerSize,
            height: outerSize,
          },
          animatedCursorStyle,
          crosshairWrapperProps.style,
        ]}
      >
        <View
          {...crosshairOuterProps}
          style={[
            styles.crosshairOuter,
            {
              backgroundColor: color,
              width: outerSize,
              height: outerSize,
              borderRadius: outerSize,
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

const styles = StyleSheet.create({
  crosshairWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  crosshairOuter: {
    opacity: 0.1,
    position: 'absolute',
  },
});
