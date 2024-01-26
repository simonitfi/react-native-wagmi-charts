import * as React from 'react';
import Animated from 'react-native-reanimated';
import { Defs, LinearGradient, Stop, Path, PathProps } from 'react-native-svg';

import { LineChartDimensionsContext } from './Chart';
import { LineChartPathContext } from './LineChartPathContext';
import useAnimatedPath from './useAnimatedPath';
import { useLineChart } from "./useLineChart";
import { addPath, findPath, getArea, smoothData } from 'react-native-wagmi-charts/src/charts/line/utils';

const AnimatedPath = Animated.createAnimatedComponent(Path);

export type LineChartGradientProps = Animated.AnimateProps<PathProps> & {
  color?: string;
  from?: number;
  to?: number;
  opacityValues?: Array<number>;
  children?: React.ReactNode;
};

let id = 0;

LineChartGradient.displayName = 'LineChartGradient';

export function LineChartGradient({
  color: overrideColor = undefined,
  from = 0,
  to = -1,
  opacityValues,
  children,

  ...props
}: LineChartGradientProps) {

  const { color: contextColor, isTransitionEnabled } =
    React.useContext(LineChartPathContext);
  const { isActive } = useLineChart();

  const { data, yDomain, xDomain } = useLineChart();
  const { area: area_, smoothedArea: smoothedArea_, pathWidth, height, gutter, shape, smoothDataRadius, update, isLiveData, areaBuffer } = React.useContext(
    LineChartDimensionsContext
  );

  if (to < 0) to = data.length - 1

  const color = overrideColor || contextColor;

  const o1 = opacityValues && opacityValues[0]
  const o2 = opacityValues && opacityValues[1]
  const o3 = opacityValues && opacityValues[2]
  const o4 = opacityValues && opacityValues[3]

  const smoothedArea = React.useMemo(() => {
    if (from === 0 && to === data.length - 1) return smoothedArea_
    if (data && data.length > 0) {
      const radius = smoothDataRadius ? smoothDataRadius : 0.5;
      const bPath = findPath({
        from, to, fromData: data[from].smoothedValue, toData: data[to].smoothedValue, totalLength: data.length, data: '',
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
        console.log('AREA FOUND OLD ONE')
        return bPath.data
      }
      const result = getArea({
        data: smoothData(data, radius),
        from,
        to,
        width: pathWidth,
        height,
        gutter,
        shape,
        yDomain,
        xDomain,
        isOriginalData: false,
      });
      addPath({
        from, to, fromData: data[from].smoothedValue, toData: data[to].smoothedValue, totalLength: data.length, data: result,
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
    data,
    smoothDataRadius,
    pathWidth,
    height,
    gutter,
    shape,
    yDomain,
    xDomain,
  ]);

  const area = React.useMemo(() => {
    if (from === 0 && to === data.length - 1) return area_
    if (update === 0 || (!isActive.value && isLiveData)) return smoothedArea
    if (data && data.length > 0) {
      // console.log('getPath HIGHLIGHT',height, gutter, shape, yDomain, xDomain, update)
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
  }, [height, gutter, shape, update]);

  ////////////////////////////////////////////////

  const { animatedProps } = useAnimatedPath({
    enabled: isTransitionEnabled,
    path: (update === 0 || (!isActive.value)) ? (from === 0 && to === data.length - 1) ? smoothedArea_ : smoothedArea : (from === 0 && to === data.length - 1) ? area_ : area,
    smoothedPath: (from === 0 && to === data.length - 1) ? smoothedArea_ : smoothedArea,
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
