import * as React from 'react';
import {
  runOnJS,
  useAnimatedProps,
  useAnimatedReaction,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { SharedValue } from "react-native-reanimated/lib/types/lib";
import { addPath, findPath, getPath, interpolatePath } from './utils';
import { LineChartDimensionsContext } from 'react-native-wagmi-charts/src/charts/line/Chart';
import { useLineChart } from 'react-native-wagmi-charts/src/charts/line/useLineChart';

export default function useAnimatedPath({
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
  const { pathWidth, height, gutter, shape, isLiveData, update, pathBuffer } = React.useContext(
    LineChartDimensionsContext
  );
  
  const smoothData = React.useMemo(() => (sData || data), [sData, data]);

  if (sTo < 0) sTo = smoothData.length - 1
  if (to < 0) to = data.length - 1
 
  const smoothedPath = React.useMemo(() => {
    if (smoothData && smoothData.length > 0 && sTo < smoothData.length) {
      const bPath = findPath({
        from: sFrom, to: sTo, fromData: smoothData[sFrom].smoothedValue, toData: smoothData[sTo].smoothedValue, totalLength: smoothData.length, data: '',
        meta: {
          pathWidth: pathWidth,
          height: height,
          gutter: gutter,
          yDomain,
          xDomain
        }
      }, pathBuffer.current)

      if (bPath) {
        return bPath.data
      }
      const result = getPath({
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
      addPath({
        from: sFrom, to: sTo, fromData: smoothData[sFrom].smoothedValue, toData: smoothData[sTo].smoothedValue, totalLength: smoothData.length, data: result,
        meta: {
          pathWidth: pathWidth,
          height: height,
          gutter: gutter,
          yDomain,
          xDomain
        }
      }, pathBuffer.current)
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

  const currentPath = useSharedValue(smoothedPath);
  const previousPath = useSharedValue(smoothedPath);

  const path = useSharedValue('');

  const setPath = () => {
    if (data && data.length > 0) {
      path.value = getPath({
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
      path.value = '';
    }
  }

  React.useEffect(() => {
    if (update !== 0 && !isLiveData){
      setPath()
    }
  }, [height, gutter, shape, update, isLiveData]);

  useAnimatedReaction(
    () => {
      if (update === 0 || (!isActive.value && isLiveData)) {
        path.value = smoothedPath
      }
      return isActive.value
    },
    (result, previous) => {
      if (result && isLiveData) {
          runOnJS(setPath)()
      }
    },
    [isActive, smoothedPath]
  );

  useAnimatedReaction(
    () => {
      if (currentPath.value !== path.value){
        previousPath.value = currentPath.value
        currentPath.value = path.value
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
      const pathInterpolator = interpolatePath(previousPath.value, currentPath.value, null);
      d = pathInterpolator(transition.value);
    }
    return {
      d,
    };
  });

  return { animatedProps };
}