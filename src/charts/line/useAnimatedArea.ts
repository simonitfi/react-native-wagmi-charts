import * as React from 'react';
import {
  runOnJS,
  useAnimatedProps,
  useAnimatedReaction,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { SharedValue } from "react-native-reanimated/lib/types/lib";
import { interpolatePath } from './utils';

import { useLineChart } from './useLineChart';

import { LineChartDimensionsContext } from './Chart';
import { addPath, findPath, getArea } from './utils';

export default function useAnimatedArea({
  enabled = true,
  from = 0,
  to = -1,
  sFrom = 0,
  sTo = -1,
  isActive
}: {
  enabled?: boolean;
  from?: number;
  to?: number;
  sFrom?: number;
  sTo?: number;
  isActive: SharedValue<boolean>;
}) {

  const { data, sData, yDomain, xDomain } = useLineChart();
  const { pathWidth, height, gutter, shape, isLiveData, update, areaBuffer } = React.useContext(
    LineChartDimensionsContext
  );
  
  const smoothData = React.useMemo(() => (sData || data), [sData, data]);

  if (sTo < 0) sTo = smoothData.length - 1
  if (to < 0) to = data.length - 1
 
  const smoothedArea = React.useMemo(() => {
    if (smoothData && smoothData.length && sTo < smoothData.length) {
      const bPath = findPath({
        from: sFrom, to: sTo, fromData: smoothData[sFrom].smoothedValue, toData: smoothData[sTo].smoothedValue, totalLength: smoothData.length, data: '',
        meta: {
          pathWidth: pathWidth,
          height: height,
          gutter: gutter,
          yDomain,
          xDomain
        }
      }, areaBuffer.current)

      if (bPath) {
        console.log('FOUND AREA')
        return bPath.data
      }
      const result = getArea({
        data: smoothData,
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
      console.log('ADD AREA')
      addPath({
        from: sFrom, to: sTo, fromData: smoothData[sFrom].smoothedValue, toData: smoothData[sTo].smoothedValue, totalLength: smoothData.length, data: result,
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
    sFrom,
    sTo,
    pathWidth,
    height,
    gutter,
    shape,
    yDomain,
    xDomain,
  ]);

  const transition = useSharedValue(0);

  const currentPath = useSharedValue(smoothedArea);
  const previousPath = useSharedValue(smoothedArea);

  const area = useSharedValue('');

  const setArea = () => {
    if (data && data.length > 0) {
      area.value = getArea({
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
    }else{
      area.value = '';
    }
  }

  React.useEffect(() => {
    if (update !== 0 && !isLiveData){
      setArea()
    }
  }, [height, gutter, shape, update, isLiveData]);

  useAnimatedReaction(
    () => {
      if (update === 0 || (!isActive.value && isLiveData)) {
        area.value = smoothedArea
      }
      return isActive.value
    },
    (result, previous) => {
      if (result && isLiveData) {
          runOnJS(setArea)()
      }
    },
    [isActive, smoothedArea]
  );

  useAnimatedReaction(
    () => {
      if (currentPath.value !== area.value){
        previousPath.value = currentPath.value
        currentPath.value = area.value
        return currentPath.value;
      }
      return false
    },
    (result, previous) => {
      if (result && result !== previous) {
        transition.value = 0;
        transition.value = withTiming(1);
        //transition.value = withTiming(1,{duration:800});
      }
    },
    []
  );

  const animatedProps = useAnimatedProps(() => {
    let d = currentPath.value || '';
    if (previousPath.value && enabled) {
      // console.log('###',currentPath.value === previousPath.value)
      const pathInterpolator = interpolatePath(previousPath.value, currentPath.value, null);
      d = pathInterpolator(transition.value);
    }
    return {
      d,
    };
  });

  return { animatedProps };
}
