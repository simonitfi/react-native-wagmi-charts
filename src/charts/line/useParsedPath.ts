import * as React from 'react';
import {
  runOnJS,
  useAnimatedReaction,
} from 'react-native-reanimated';
import { SharedValue } from "react-native-reanimated/lib/types/lib";
import { addPath, findPath, findPathIndex, getPath } from './utils';
import { useLineChart } from 'react-native-wagmi-charts/src/charts/line/useLineChart';
import { parse } from 'react-native-redash';
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

  const [isOriginal, setIsOriginal] = React.useState(false);

  const smoothData = React.useMemo(() => (sData || data), [sData, data]);

  const smoothedPath = React.useMemo(() => {
    if (smoothData && smoothData.length > 1 && typeof smoothData[0] !== undefined && typeof smoothData[smoothData.length - 1].smoothedValue !== undefined) {
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
        const res = pathBuffer.current[bPathIndex].data
        pathBuffer.current.splice(bPathIndex, 1);
        return res
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

  const smoothedParsedPath = React.useMemo(() => (parse(smoothedPath)), [smoothedPath]);

  const path = React.useMemo(() => {
    if (data && data.length > 0) {
      if (!isOriginal) return smoothedPath
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
      return p
    } else {
      return '';
    }
  }, [isOriginal, smoothedPath]);

  const parsedPath =  React.useMemo(() => {
    if (isOriginal) return parse(path)
   return smoothedParsedPath
  }, [isOriginal, path]);  

  React.useEffect(() => {
    if (update !== 0 && !isLiveData) {
      setIsOriginal(true)
    }
  }, [height, yGutter, shape, update, isLiveData]);

  useAnimatedReaction(
    () => {
      if (update === 0 || (!isActive.value && isLiveData)) {
        return false
      } else {
        return true
      }
    },
    (result, previous) => {
      if (result !== previous) {
        runOnJS(setIsOriginal)(result)
      }
    },
    [isActive]
  );

  return { parsedPath: parsedPath, path: path, isOriginal: isOriginal };
}