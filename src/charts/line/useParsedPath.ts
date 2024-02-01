import * as React from 'react';
import {
  runOnJS,
  useAnimatedProps,
  useAnimatedReaction,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { SharedValue } from "react-native-reanimated/lib/types/lib";
import { addPath, findPath, findPathIndex, getPath, interpolatePath } from './utils';
import { LineChartDimensionsContext } from 'react-native-wagmi-charts/src/charts/line/Chart';
import { useLineChart } from 'react-native-wagmi-charts/src/charts/line/useLineChart';
import { Path, parse } from 'react-native-redash';
import { LineChartPathBuffer } from 'react-native-wagmi-charts/src/charts/line/types';


export default function useParsedPath({
  yGutter = 8,
  id,
  isActive,
  pathWidth,
  height,
  shape,
  isLiveData,
  update,
  pathBuffer
}: {
  yGutter?: number;
  id: string | undefined;
  isActive: SharedValue<boolean>;
  width: number;
  height: number;
  shape?: unknown;
  update?: number;
  pathWidth: number;
  pathBuffer: React.RefObject<LineChartPathBuffer>;
  /**
   * If your `LineChart.Provider` uses a dictionary with multiple IDs for multiple paths, then this field is required.
   */
  absolute?: boolean;
  isLiveData?: boolean;
}) {

  const { data, sData, yDomain, xDomain } = useLineChart(id);
  const [u, setU] = React.useState(0);

  const smoothData = React.useMemo(() => (sData || data), [sData, data]);

  const smoothedPath = React.useMemo(() => {
    if (smoothData && smoothData.length > 0) {
      const bPathIndex = findPathIndex({
        from: 0, to: smoothData.length - 1, fromData: smoothData[0].smoothedValue, toData: smoothData[smoothData.length - 1].smoothedValue,
        fromTime: smoothData[0].timestamp, toTime: smoothData[smoothData.length - 1].timestamp, timeTolerance: 0,
        totalLength: smoothData.length, data: '',
        meta: {
          pathWidth: pathWidth,
          height: height,
          gutter: yGutter,
          yDomain,
          xDomain
        }
      }, pathBuffer.current)
      if (bPathIndex > -1) {
        // const res = pathBuffer.current[bPathIndex].data
        // pathBuffer.current.splice(bPathIndex, 1);
        // return res
      }
      const result = getPath({
        data: smoothData,//smoothData_(smoothData),
        width: pathWidth,
        height,
        gutter: yGutter,
        shape,
        yDomain,
        xDomain,
        isOriginalData: false,
      });
      if (typeof smoothData[smoothData.length - 1].smoothedValue === 'number' && typeof smoothData[0].smoothedValue === 'number')
        /*console.log('smoothedPath ADD', {
          from: 0, to: smoothData.length - 1, fromData: smoothData[0].smoothedValue, toData: smoothData[smoothData.length - 1].smoothedValue,
          fromTime: smoothData[0].timestamp, toTime: smoothData[smoothData.length - 1].timestamp, timeTolerance: 0,
          totalLength: smoothData.length, data: ''
        })*/
        addPath({
          from: 0, to: smoothData.length - 1, fromData: smoothData[0].smoothedValue, toData: smoothData[smoothData.length - 1].smoothedValue,
          fromTime: smoothData[0].timestamp, toTime: smoothData[smoothData.length - 1].timestamp, timeTolerance: 0,
          totalLength: smoothData.length, data: result,
          meta: {
            pathWidth: pathWidth,
            height: height,
            gutter: yGutter,
            yDomain,
            xDomain
          }
        }, pathBuffer.current)
      return result
    }
    return '';
  }, [
    smoothData,
    pathWidth,
    height,
    yGutter,
    shape,
    yDomain,
    xDomain,
  ]);

  const smoothedParsedPath = React.useMemo(() => {
    return parse(smoothedPath)
  }, [smoothedPath]);

  const path = useSharedValue(smoothedPath);
  const parsedPath = useSharedValue<Path>(smoothedParsedPath);

  const isOriginal = useSharedValue<boolean>(false);

  const setPath = () => {
    console.log('setPath parse')
    if (data && data.length > 0) {
      const p = getPath({
        data,
        width: pathWidth,
        height,
        gutter: yGutter,
        shape,
        yDomain,
        xDomain,
        isOriginalData: true,
      })
      parsedPath.value = parse(p)
      path.value = p
    } else {
      parsedPath.value = null;
      path.value = '';
    }
    setU(Date.now())
  }

  React.useEffect(() => {
    if (update !== 0 && !isLiveData) {
      setPath()
    }
  }, [height, yGutter, shape, update, isLiveData]);

  useAnimatedReaction(
    () => {
      if (update === 0 || (!isActive.value && isLiveData)) {
        if (parsedPath.value !== smoothedParsedPath) parsedPath.value = smoothedParsedPath
        if (path.value !== smoothedPath) path.value = smoothedPath
        isOriginal.value = false
      } else {
        isOriginal.value = true
      }
      if (parsedPath.value === smoothedParsedPath || path.value === smoothedPath) {
        return isActive.value
      }
      return false
    },
    (result, previous) => {
      if (result && isLiveData) {
        runOnJS(setPath)()
      }else if (!result && isLiveData){
        // runOnJS(setU)(Date.now())
      }
    },
    [isActive, smoothedParsedPath]
  );

  return { parsedPath: parsedPath.value, path: path.value, isOriginal: isOriginal.value };
}