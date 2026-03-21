import * as React from 'react';
import { StyleSheet, View } from 'react-native';
import { Svg } from 'react-native-svg';
import Animated, {
  useAnimatedProps,
  useSharedValue,
  withTiming,
  WithTimingConfig,
} from 'react-native-reanimated';
import flattenChildren from 'react-keyed-flatten-children';

import { LineChartDimensionsContext } from './Chart';
import { LineChartPathContext } from './LineChartPathContext';
import { LineChartPath, LineChartPathProps } from './Path';
import { useLineChartShared } from './useLineChart';
import { onInternalProfilerRender } from '../../profiler';

const BACKGROUND_COMPONENTS = [
  'LineChartHighlight',
  'LineChartHorizontalLine',
  'LineChartGradient',
  'LineChartDot',
  'LineChartTooltip',
];
const FOREGROUND_COMPONENTS = ['LineChartHighlight', 'LineChartDot'];

const AnimatedSVG = Animated.createAnimatedComponent(Svg);

type LineChartPathWrapperProps = {
  animationDuration?: number;
  animationProps?: Omit<Partial<WithTimingConfig>, 'duration'>;
  children?: React.ReactNode;
  color?: string;
  inactiveColor?: string;
  width?: number;
  widthOffset?: number;
  pathProps?: Partial<LineChartPathProps>;
  showInactivePath?: boolean;
  animateOnMount?: 'foreground';
  mountAnimationDuration?: number;
  mountAnimationProps?: Partial<WithTimingConfig>;
};

LineChartPathWrapper.displayName = 'LineChartPathWrapper';

export function LineChartPathWrapper({
  animationDuration = 300,
  animationProps = {},
  children,
  color = 'black',
  inactiveColor,
  width: strokeWidth = 3,
  widthOffset = 20,
  pathProps = {},
  showInactivePath = true,
  animateOnMount,
  mountAnimationDuration = animationDuration,
  mountAnimationProps = animationProps,
}: LineChartPathWrapperProps) {
  const { height, pathWidth, width } = React.useContext(
    LineChartDimensionsContext
  );
  const { currentX, isActive } = useLineChartShared();
  const isMounted = useSharedValue(false);
  const hasMountedAnimation = useSharedValue(false);

  React.useEffect(() => {
    isMounted.value = true;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  ////////////////////////////////////////////////

  const svgProps = useAnimatedProps(() => {
    const shouldAnimateOnMount = animateOnMount === 'foreground';
    const inactiveWidth =
      !isMounted.value && shouldAnimateOnMount ? 0 : pathWidth;

    let duration =
      shouldAnimateOnMount && !hasMountedAnimation.value
        ? mountAnimationDuration
        : animationDuration;
    const props =
      shouldAnimateOnMount && !hasMountedAnimation.value
        ? mountAnimationProps
        : animationProps;

    if (isActive.value) {
      duration = 0;
    }

    return {
      width: withTiming(
        isActive.value
          ? // on Web, <svg /> elements don't support negative widths
            // https://github.com/coinjar/react-native-wagmi-charts/issues/24#issuecomment-955789904
            Math.max(currentX.value, 0)
          : inactiveWidth + widthOffset,
        Object.assign({ duration }, props),
        () => {
          hasMountedAnimation.value = true;
        }
      ),
    };
  }, [
    animateOnMount,
    animationDuration,
    animationProps,
    currentX,
    hasMountedAnimation,
    isActive,
    isMounted,
    mountAnimationDuration,
    mountAnimationProps,
    pathWidth,
    widthOffset,
  ]);

  const viewSize = React.useMemo(() => ({ width, height }), [width, height]);

  ////////////////////////////////////////////////

  // Memoize so flattenChildren + two filter passes don't re-run on every
  // re-render when children are structurally stable (the common case).
  const { backgroundChildren, foregroundChildren } = React.useMemo(() => {
    if (!children) return { backgroundChildren: undefined, foregroundChildren: undefined };
    const iterableChildren = flattenChildren(children);
    return {
      backgroundChildren: iterableChildren.filter((child) =>
        // @ts-ignore
        BACKGROUND_COMPONENTS.includes(child?.type?.displayName)
      ),
      foregroundChildren: iterableChildren.filter((child) =>
        // @ts-ignore
        FOREGROUND_COMPONENTS.includes(child?.type?.displayName)
      ),
    };
  }, [children]);

  ////////////////////////////////////////////////


  return (
    <React.Profiler id="LineChartPathWrapper" onRender={onInternalProfilerRender}>
    <>
      <LineChartPathContext.Provider
        value={React.useMemo(() => ({
          color,
          isInactive: showInactivePath,
          isTransitionEnabled: pathProps.isTransitionEnabled ?? true,
          animationDuration,
          isMounted: isMounted.value
        }), [color, showInactivePath, pathProps.isTransitionEnabled, animationDuration, isMounted.value])}
      >
        <View style={viewSize}>
          <Svg width={width} height={height}>
          {strokeWidth > 0 && <LineChartPath
              color={color}
              inactiveColor={inactiveColor}
              width={strokeWidth}
              {...pathProps}
            />}
          </Svg>
          <Svg style={StyleSheet.absoluteFill}>
            {backgroundChildren}
          </Svg>
        </View>
      </LineChartPathContext.Provider>
      <LineChartPathContext.Provider
        value={React.useMemo(() => ({
          color,
          isInactive: false,
          isTransitionEnabled: pathProps.isTransitionEnabled ?? true,
          animationDuration,
          isMounted: isMounted.value
        }), [color, pathProps.isTransitionEnabled, animationDuration, isMounted.value])}
      >
        <View style={StyleSheet.absoluteFill}>
          <AnimatedSVG animatedProps={svgProps} height={height}>
            {strokeWidth > 0 && <LineChartPath color={color} width={strokeWidth} {...pathProps} />}
          </AnimatedSVG>
          <AnimatedSVG animatedProps={svgProps} height={height} style={StyleSheet.absoluteFill}>
            {foregroundChildren}
          </AnimatedSVG>
        </View>
      </LineChartPathContext.Provider>
    </>
    </React.Profiler>
  );
}
