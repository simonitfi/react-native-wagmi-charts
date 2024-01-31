import * as React from 'react';
import Animated from 'react-native-reanimated';
import { Defs, LinearGradient, Stop, Path, PathProps } from 'react-native-svg';

import { LineChartDimensionsContext } from './Chart';
import { LineChartPathContext } from './LineChartPathContext';
import useAnimatedPath from './useAnimatedPath';
import { useLineChart } from "./useLineChart";
import { addPath, findPath, getArea, smoothData_ } from 'react-native-wagmi-charts/src/charts/line/utils';

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
  from = 0,
  to = -1,
  sFrom = 0,
  sTo = -1,
  opacityValues,
  children,

  ...props
}: LineChartGradientProps) {

  const { color: contextColor, isTransitionEnabled } =
    React.useContext(LineChartPathContext);
  const { isActive } = useLineChart();

  const { data, sData, yDomain, xDomain } = useLineChart();
  const { pathWidth, height, gutter, shape, smoothDataRadius, update, forcePathUpdate, areaBuffer } = React.useContext(
    LineChartDimensionsContext
  );
  
  const smoothData = React.useMemo(() => (sData || data), [sData, data]);

  const color = overrideColor || contextColor;

  const o1 = opacityValues && opacityValues[0]
  const o2 = opacityValues && opacityValues[1]
  const o3 = opacityValues && opacityValues[2]
  const o4 = opacityValues && opacityValues[3]

  if (sTo < 0) sTo = smoothData.length - 1
  if (to < 0) to = data.length - 1

  const smoothedArea = React.useMemo(() => {
    if (smoothData && smoothData.length && sTo < smoothData.length) {
      const bPath = findPath({
        from: sFrom, to: sTo, fromData: smoothData[sFrom].smoothedValue, toData: smoothData[sTo].smoothedValue, totalLength: smoothData.length, data: '',
        index: 0,
        meta: {
          pathWidth: pathWidth,
          height: height,
          gutter: gutter,
          yDomain,
          xDomain
        }
      }, areaBuffer.current)

      if (bPath) {
        return bPath.data
      }
      const result = getArea({
        data: smoothData, // smoothData_(smoothData),
        from: sFrom,
        to: sTo,
        width: pathWidth,
        height,
        gutter,
        shape,
        yDomain,
        xDomain,
        isOriginalData: false,
      });
      addPath({
        from: sFrom, to: sTo, fromData: smoothData[sFrom].smoothedValue, toData: smoothData[sTo].smoothedValue, totalLength: smoothData.length, data: result,
        index: 0,
        meta: {
          pathWidth: pathWidth,
          height: height,
          gutter: gutter,
          yDomain,
          xDomain
        }
      }, areaBuffer.current)
      return result
    }
    return '';
  }, [
    smoothData,
    smoothDataRadius,
    sFrom,
    sTo,
    pathWidth,
    height,
    gutter,
    shape,
    yDomain,
    xDomain,
  ]);

  const area = React.useMemo(() => {
    if (update === 0) return smoothedArea
    if (data && data.length > 0) {
      return getArea({
        data,
        from,
        to,
        width: pathWidth,
        height,
        gutter,
        shape,
        yDomain,
        xDomain,
        isOriginalData: true,
      });
    }
    return '';
  }, [height, gutter, shape, update, forcePathUpdate]);

  ////////////////////////////////////////////////

  const { animatedProps } = useAnimatedPath({
    enabled: isTransitionEnabled,
    path: area,
    smoothedPath: smoothedArea,
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
