import * as React from 'react';
import { Platform, View, ViewProps, StyleSheet } from 'react-native';
import Animated, {
  AnimatedProps,
  useAnimatedReaction,
  useAnimatedStyle,
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
  const { currentX, currentY, isActive, data, xDomain } = useLineChart();

  const { pathWidth: width, parsedPathSV } = React.useContext(
    LineChartDimensionsContext
  );

  // Precomputed boundary scalars — updated on JS thread only when data changes,
  // so the worklet never iterates arrays on every frame.
  const snapX = useSharedValue(0);
  const snapY = useSharedValue(0);
  const minXBound = useSharedValue(0);
  const maxXBound = useSharedValue(width);

  React.useEffect(() => {
    const path = parsedPathSV.value;
    if (!path?.curves?.length || !data || data.length === 0) return;

    const minIndex = data.findIndex((el: { value: null }) => el.value !== null);
    const maxIndex =
      minIndex !== 0 || data.findIndex((el: { value: null }) => el.value === null) === -1
        ? data.length - 1
        : data.findIndex((el: { value: null }) => el.value === null) - 1;

    const total = xDomain ? xDomain[1] - xDomain[0] : data.length - 1;
    const minVal = xDomain ? data[minIndex].timestamp : minIndex;
    const maxVal = xDomain ? data[maxIndex].timestamp : maxIndex;

    minXBound.value = (1 / total) * minVal * width;
    maxXBound.value = (1 / total) * maxVal * width;

    const sx = path.curves[Math.min(maxIndex, path.curves.length) - 1]?.to.x ?? 0;
    let sy = getYForX(path, sx) || 0;
    if (!sy) {
      sy = path.curves.reduce(
        (max: { x: number; y: number }, curve: { to: { x: number; y: number } }) =>
          curve.to.x > max.x ? curve.to : max,
        path.curves[0].to
      ).y;
    }
    snapX.value = sx;
    snapY.value = sy;
  }, [data, xDomain, width]);

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
      const withinRange =
        currentX.value > minXBound.value && currentX.value < maxXBound.value;
      const x = withinRange ? currentX.value : snapX.value;

      // currentY returns -1 when getYForX fails (null path bounds) or when the
      // path has no curves yet.  snapY starts at 0 (top of chart) until its
      // useEffect fires.  Use a three-level fallback so the spring-in animation
      // never shows the crosshair at y=0:
      //   1. currentY when in range AND valid (> 0)
      //   2. snapY when valid (> 0)
      //   3. far offscreen (crosshair scale is growing 0→1; this frame is invisible)
      const currentYValid = withinRange && currentY.value > 0;
      const snapYValid = snapY.value > 0;
      const y = currentYValid ? currentY.value
               : snapYValid   ? snapY.value
               : -outerSize * 2;  // offscreen until a real y is available

      return {
        transform: [
          { translateX: x - outerSize / 2 },
          { translateY: y - outerSize / 2 },
          { scale: animatedScale.value },
        ],
        opacity: 1,
      };
    },
    [currentX, currentY, animatedScale, outerSize, snapX, snapY, minXBound, maxXBound]
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
