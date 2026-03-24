import * as React from 'react';
import { scheduleOnRN } from 'react-native-worklets';

import Animated, {
  AnimatedProps,
  cancelAnimation,
  Easing,
  SharedValue,
  useAnimatedProps,
  useAnimatedReaction,
  useDerivedValue,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { Circle, CircleProps } from 'react-native-svg';

import { LineChartDimensionsContext, LineChartDataContext } from './Chart';
import { LineChartPathContext } from './LineChartPathContext';
import { getXPositionForCurve } from './utils/getXPositionForCurve';
import { getYForX } from 'react-native-redash';
import { useLineChart } from './useLineChart';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

export type LineChartDotProps = {
  dotProps?: AnimatedProps<CircleProps>;
  outerDotProps?: AnimatedProps<CircleProps>;
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
  const { update, isLiveData, width, parsedPathSV } = React.useContext(LineChartDimensionsContext);
  const { isOriginal } = React.useContext(LineChartDataContext);

  ////////////////////////////////////////////////////////////

  const { isInactive: _isInactive, animationDuration } = React.useContext(LineChartPathContext);
  const isInactive = showInactiveColor && _isInactive;
  const color = isInactive ? inactiveColor || defaultColor : defaultColor;
  const opacity = isInactive && !inactiveColor ? 0.5 : 1;
  const hasOuterDot = defaultHasOuterDot || hasPulse;

  ////////////////////////////////////////////////////////////

  const hasInitialPosition = useSharedValue(false);
  // When true the dot snaps (no withTiming) — mirrors path's allowMorph=false
  // window so they reach the new position in the same frame.
  const snapDot = useSharedValue(false);

  const enableDotAnim = () => {
    setTimeout(() => { snapDot.value = false; }, 1000);
  };

  // Reset on the UI thread the exact moment isActive changes, so the dot
  // snaps in the same frame the area snaps (allowMorph=false). A JS-thread
  // useEffect fires 2+ frames too late and causes the dot to trail behind.
  useAnimatedReaction(
    () => isActive.value,
    (current, previous) => {
      if (previous !== null && current !== previous) {
        hasInitialPosition.value = false;
        if (!current) {
          // Keep snapping for 1 second after release, matching the path's
          // allowMorph=false window so dot and path move in lockstep.
          snapDot.value = true;
          scheduleOnRN(enableDotAnim);
        }
      }
    },
    []
  );

  const x = useDerivedValue(() => {
    if (!parsedPathSV.value?.curves?.length) return -1;
    const target = Math.min(getXPositionForCurve(parsedPathSV.value, isOriginal ? at : sAt), width);
    if (!hasInitialPosition.value || snapDot.value) {
      hasInitialPosition.value = true;
      return target;
    }
    return withTiming(target, {duration: animationDuration});
  }, [at, sAt, parsedPathSV, isLiveData, isOriginal, update, width, animationDuration, forceUpdate, snapDot]);

  const y = useDerivedValue(
    () => {
      if (x.value < 0 || !parsedPathSV.value?.curves?.length) return -size;
      let val = getYForX(parsedPathSV.value, x.value);
      // getYForX returns null when x is outside the path range (e.g. during
      // withTiming animation or at the very end). Fall back to the rightmost
      // curve endpoint so the dot stays visible at the path tip instead of
      // disappearing or jumping to y=0.
      if (val === null) {
        const curves = parsedPathSV.value.curves;
        let maxPoint = curves[0].to;
        for (let i = 1; i < curves.length; i++) {
          if (curves[i].to.x > maxPoint.x) maxPoint = curves[i].to;
        }
        val = maxPoint.y;
      }
      return val;
    },
    [parsedPathSV, x, isLiveData, animationDuration, update, size, forceUpdate]
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

const useAnimatedDot = (x: Readonly<SharedValue<number>>, y: Readonly<SharedValue<number>>, hasPulse: boolean,
  isActive: SharedValue<boolean>, outerSize: number, pulseBehaviour: "always" | "while-inactive", pulseDurationMs: number) => {
    const animatedOpacity = useSharedValue(0);
    const scale = useSharedValue(0);
  
    React.useEffect(() => {
      const easing = Easing.out(Easing.ease);
      animatedOpacity.value = withRepeat(
        withSequence(
          withTiming(1),
          withTiming(0, {
            duration: pulseDurationMs,
            easing,
          }),
          withDelay(pulseDurationMs*2, withTiming(0))
        ),
        -1,
        false
      );
      scale.value = withRepeat(
        withSequence(
          withTiming(0),
          withTiming(outerSize, {
            duration: pulseDurationMs,
            easing,
          }),
          withDelay(pulseDurationMs*2, withTiming(outerSize))
        ),
        -1,
        false
      );

      return () => {
        // Cleanup function
        cancelAnimation(animatedOpacity)
        cancelAnimation(scale)
      }
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