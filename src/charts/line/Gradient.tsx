import * as React from 'react';
import Animated from 'react-native-reanimated';
import { Defs, LinearGradient, Stop, Path, PathProps } from 'react-native-svg';

import { LineChartPathContext } from './LineChartPathContext';
import useAnimatedArea from './useAnimatedArea';
import { useLineChart } from "./useLineChart";


const AnimatedPath = Animated.createAnimatedComponent(Path);

export type LineChartGradientProps = Animated.AnimateProps<PathProps> & {
  color?: string;
  from?: number;
  to?: number;
  sFrom?: number;
  sTo?: number;
  opacityValues?: Array<number>;
  children?: React.ReactNode;
};

let id = 0;

LineChartGradient.displayName = 'LineChartGradient';

export function LineChartGradient({
  color: overrideColor = undefined,
  from,
  to,
  sFrom,
  sTo,
  opacityValues,
  children,

  ...props
}: LineChartGradientProps) {

  const { color: contextColor, isTransitionEnabled } =
    React.useContext(LineChartPathContext);
  const { isActive } = useLineChart();

  const color = overrideColor || contextColor;

  const o1 = opacityValues && opacityValues[0]
  const o2 = opacityValues && opacityValues[1]
  const o3 = opacityValues && opacityValues[2]
  const o4 = opacityValues && opacityValues[3]

  ////////////////////////////////////////////////

  const { animatedProps } = useAnimatedArea({
    enabled: isTransitionEnabled,
    from,
    to,
    sFrom,
    sTo,
    isActive,
  });

  ////////////////////////////////////////////////

  const localId = React.useRef(++id);

  ////////////////////////////////////////////////

  return (
    <>
      {children ? (
        <Defs>
          <LinearGradient
            id={`${localId.current}`}
            x1="0"
            x2="0"
            y1="0"
            y2="100%"
          >
            {/*@ts-ignore*/}
            {children}
          </LinearGradient>
        </Defs>
      ) : (
        <Defs>
          <LinearGradient
            id={`${localId.current}`}
            x1="0"
            x2="0"
            y1="0"
            y2="100%"
          >
            <Stop offset="40%" stopColor={color} stopOpacity={o1 || 0.15} />
            <Stop offset="60%" stopColor={color} stopOpacity={o2 || 0.10} />
            <Stop offset="80%" stopColor={color} stopOpacity={o3 || 0.05} />
            <Stop offset="100%" stopColor={color} stopOpacity={o4 || 0.01} />
          </LinearGradient>
        </Defs>
      )}
      <AnimatedPath
        animatedProps={animatedProps}
        fill={`url(#${localId.current})`}
        {...props}
      />
    </>
  );
}
