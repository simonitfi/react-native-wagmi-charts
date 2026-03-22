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
  const { currentX, isActive } = useLineChart();

  const { pathWidth: width, parsedPathSV, dataInfoSV } = React.useContext(
    LineChartDimensionsContext
  );

  // Compute snap position and x/y bounds entirely on the UI thread from SharedValues.
  // This eliminates the JS-thread async timing race that caused the crosshair to
  // briefly appear at y=0 (top of chart) when parsedPathSV was updated before the
  // JS-thread recomputeSnap callback had a chance to run.
  const snapInfoDV = useDerivedValue(() => {
    const path = parsedPathSV.value;
    const info = dataInfoSV.value;

    if (!info.hasData || path.curves.length === 0) {
      return { snapX: 0, snapY: -1, minXBound: 0, maxXBound: width };
    }

    // Left bound from dataInfoSV (first non-null real data point).
    const minXBound = info.total > 0 ? (info.minVal - info.xDomainMin) / info.total * width : 0;

    // Scan ALL curves to find the actual rightmost rendered point.
    let snapX = 0;
    let snapY = -1;
    let rightmostX = -1;
    for (let i = 0; i < path.curves.length; i++) {
      const c = path.curves[i];
      if (c && c.to.x > rightmostX) {
        rightmostX = c.to.x;
        snapX = c.to.x;
        snapY = c.to.y;
      }
    }

    // Refine snapY with getYForX
    if (snapX > 0) {
      const refined = getYForX(path, snapX);
      if (refined !== null && refined >= 0) snapY = refined;
    }

    const maxXBound = snapX > 0 ? snapX : width;

    return { snapX, snapY, minXBound, maxXBound };
  }, [parsedPathSV, dataInfoSV, width]);

  // When the snap endpoint moves (path data changed), immediately update
  // currentX on the UI thread so there's no 1-frame glitch where the cursor
  // sits at the OLD currentX on the NEW path (which maps to a completely
  // different Y, e.g. near the top of the chart).
  const prevSnapXRef = useSharedValue(-1);
  useAnimatedReaction(
    () => snapInfoDV.value.snapX,
    (newSnapX) => {
      const prevSnap = prevSnapXRef.value;
      prevSnapXRef.value = newSnapX;
      // If the cursor was tracking the old snap endpoint, move it to the new one.
      // The threshold (5 px) is tight enough to avoid interfering with user drags.
      if (
        isActive.value &&
        prevSnap >= 0 &&
        newSnapX > 0 &&
        Math.abs(currentX.value - prevSnap) < 5
      ) {
        currentX.value = newSnapX;
      }
    },
    [snapInfoDV, isActive, currentX]
  );

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

  // Keep enableSpringAnimation in a SharedValue so the worklet below can read
  // it without capturing the JS value at worklet-creation time.
  const enableSpringAnimationSV = useSharedValue(enableSpringAnimation);
  React.useEffect(() => {
    enableSpringAnimationSV.value = enableSpringAnimation;
  }, [enableSpringAnimation]);

  // Drive scale from a plain SharedValue. withSpring() is set here, firing only
  // when isActive actually changes — not on every currentX/currentY update.
  // Calling withSpring() inside useAnimatedStyle causes it to re-run every frame
  // whenever any dependency (currentX, currentY) changes, creating a new spring
  // animation object each frame and hammering the UI thread at 60fps when idle.
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
      const { snapX, snapY, minXBound, maxXBound } = snapInfoDV.value;
      const path = parsedPathSV.value;

      const withinRange =
        currentX.value > minXBound && currentX.value < maxXBound;
      const x = withinRange ? currentX.value : snapX;

      // Compute Y directly from the current parsed path instead of relying on
      // the external currentY shared value, which may be stale for a frame
      // when the path changes before currentX is updated.
      let computedY = -1;
      if (withinRange && path.curves.length > 0) {
        computedY = getYForX(path, currentX.value) ?? -1;
      }
      const hasValidY = computedY >= 0 || snapY >= 0;
      const y = computedY >= 0 ? computedY : snapY;

      return {
        transform: [
          { translateX: x - outerSize / 2 },
          { translateY: y - outerSize / 2 },
          { scale: animatedScale.value },
        ],
        opacity: hasValidY ? 1 : 0,
      };
    },
    [currentX, animatedScale, outerSize, snapInfoDV, parsedPathSV]
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
