import * as React from 'react';

import Animated, {
  Easing,
  useAnimatedProps,
  useDerivedValue,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { Circle, CircleProps } from 'react-native-svg';

import { LineChartDimensionsContext } from './Chart';
import { LineChartPathContext } from './LineChartPathContext';
import { getXPositionForCurve } from './utils/getXPositionForCurve';
import { getYForX } from 'react-native-redash';
import { useLineChart } from './useLineChart';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

export type LineChartDotProps = {
  dotProps?: Animated.AnimateProps<CircleProps>;
  outerDotProps?: Animated.AnimateProps<CircleProps>;
  color?: string;
  inactiveColor?: string;
  showInactiveColor?: boolean;
  at: number;
  sAt?: number;
  size?: number;
  hasPulse?: boolean;
  hasOuterDot?: boolean;
  /**
   * If `always`, the outer dot will still animate when interaction is active.
   *
   * If `while-inactive`, the outer dot will animate only when the interaction is inactive.
   *
   * Default: `while-inactive`
   */
  pulseBehaviour?: 'always' | 'while-inactive';
  /**
   * Defaults to `size * 4`
   */
  outerSize?: number;
  pulseDurationMs?: number;
  forceUpdate?: number;
};

LineChartDot.displayName = 'LineChartDot';

export function LineChartDot({
  at,
  sAt = at,
  color: defaultColor = 'black',
  dotProps,
  hasOuterDot: defaultHasOuterDot = false,
  hasPulse = false,
  inactiveColor,
  outerDotProps,
  pulseBehaviour = 'while-inactive',
  pulseDurationMs = 1200,
  showInactiveColor = true,
  size = 4,
  outerSize = size * 4,
  forceUpdate,
}: LineChartDotProps) {
  const { isActive } = useLineChart();
  const { parsedPath, isOriginal, update, isLiveData, width } = React.useContext(LineChartDimensionsContext);

  ////////////////////////////////////////////////////////////

  const { isInactive: _isInactive } = React.useContext(LineChartPathContext);
  const isInactive = showInactiveColor && _isInactive;
  const color = isInactive ? inactiveColor || defaultColor : defaultColor;
  const opacity = isInactive && !inactiveColor ? 0.5 : 1;
  const hasOuterDot = defaultHasOuterDot || hasPulse;

  ////////////////////////////////////////////////////////////

  const x = useDerivedValue(() => {
    return withTiming(Math.min(getXPositionForCurve(parsedPath, isOriginal ? at : sAt), width));
  }, [at, sAt, parsedPath.curves, isLiveData, isOriginal, update, width]);

  const y = useDerivedValue(
    () => {
      if (update === 0) return getYForX(parsedPath!, x.value) || 0
      let val = getYForX(parsedPath!, x.value)
      if (val === null) {
        let maxPoint = parsedPath.curves.reduce((max, curve) => curve.to.x > max.x ? curve.to : max, parsedPath.curves[0].to);
        val = maxPoint.y;
      }
      return withTiming(val || 0)
    }
    ,
    [parsedPath.curves, x, isLiveData]
  );

  ////////////////////////////////////////////////////////////
  /*
    const animatedDotProps = useAnimatedProps(
      () => ({
        cx: x.value,
        cy: y.value,
      }),
      [x, y]
    );
  
    const animatedOuterDotProps = useAnimatedProps(() => {
      let defaultProps = {
        cx: x.value,
        cy: y.value,
        opacity: 0.1,
        r: outerSize,
      };
  
      if (!hasPulse) {
        return defaultProps;
      }
  
      if (isActive.value && pulseBehaviour === 'while-inactive') {
        return {
          ...defaultProps,
          r: 0,
        };
      }
  
      const easing = Easing.out(Easing.sin);
      const animatedOpacity = withRepeat(
        withSequence(
          withTiming(0.8),
          withTiming(0, {
            duration: pulseDurationMs,
            easing,
          })
        ),
        -1,
        false
      );
      const scale = withRepeat(
        withSequence(
          withTiming(0),
          withTiming(outerSize, {
            duration: pulseDurationMs,
            easing,
          })
        ),
        -1,
        false
      );
  
      if (pulseBehaviour === 'while-inactive') {
        return {
          ...defaultProps,
          opacity: isActive.value ? withTiming(0) : animatedOpacity,
          r: isActive.value ? withTiming(0) : scale,
        };
      }
      return {
        ...defaultProps,
        opacity: animatedOpacity,
        r: scale,
      };
    }, [hasPulse, isActive, outerSize, pulseBehaviour, pulseDurationMs, x, y]);*/

  ////////////////////////////////////////////////////////////

  // Inside your component
  const { animatedDotProps, animatedOuterDotProps } = useAnimatedDot(x, y, hasPulse, isActive, outerSize, pulseBehaviour, pulseDurationMs);

  return (
    <>
      <AnimatedCircle
        animatedProps={animatedDotProps}
        r={size}
        fill={color}
        opacity={opacity}
        {...dotProps}
      />
      {hasOuterDot && (
        <AnimatedCircle
          animatedProps={animatedOuterDotProps}
          fill={color}
          {...outerDotProps}
        />
      )}
    </>
  );
}

const useAnimatedDot = (x: Readonly<Animated.SharedValue<number>>, y: Readonly<Animated.SharedValue<number>>, hasPulse: boolean,
  isActive: Animated.SharedValue<boolean>, outerSize: number, pulseBehaviour: "always" | "while-inactive", pulseDurationMs: number) => {
    const animatedOpacity = useSharedValue(0.1);
    const scale = useSharedValue(outerSize);
  
    React.useEffect(() => {
      const easing = Easing.out(Easing.sin);
      animatedOpacity.value = withRepeat(
        withSequence(
          withTiming(0),
          withTiming(0.8),
          withTiming(0, {
            duration: pulseDurationMs,
            easing,
          })
        ),
        -1,
        false
      );
      scale.value = withRepeat(
        withSequence(
          withTiming(0),
          withTiming(0),
          withTiming(outerSize, {
            duration: pulseDurationMs,
            easing,
          })
        ),
        -1,
        false
      );
    }, []);
  
    const animatedDotProps = useAnimatedProps(
      () => ({
        cx: x.value,
        cy: y.value,
      }),
      [x, y]
    );
  
    const animatedOuterDotProps = useAnimatedProps(() => {
      let defaultProps = {
        cx: x.value,
        cy: y.value,
        opacity: animatedOpacity.value,
        r: scale.value,
      };
  
      if (!hasPulse) {
        return defaultProps;
      }
  
      if (pulseBehaviour === 'while-inactive') {
        return {
          ...defaultProps,
          opacity: isActive.value ? withTiming(0) : animatedOpacity.value,
          r: isActive.value ? withTiming(0) : scale.value,
        };
      }
      return {
        ...defaultProps,
      };
    }, [hasPulse, isActive, outerSize, pulseBehaviour, pulseDurationMs, x, y, animatedOpacity, scale]);
  
    return { animatedDotProps, animatedOuterDotProps };
  };
