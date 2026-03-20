import * as React from 'react';
import { scheduleOnRN } from 'react-native-worklets';
import {
  useAnimatedReaction,
  useSharedValue,
} from 'react-native-reanimated';
import { SharedValue } from "react-native-reanimated/lib/types/lib";
import { addPath, findPath, findPathIndex, getPath } from './utils';
import { useLineChart } from 'react-native-wagmi-charts/src/charts/line/useLineChart';
import { parse, Path } from 'react-native-redash';
import { LineChartPathBuffer } from 'react-native-wagmi-charts/src/charts/line/types';

const EMPTY_PATH: Path = { curves: [], move: { x: 0, y: 0 }, close: false };


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

  const parsedPathSV = useSharedValue<Path>(EMPTY_PATH);

  const smoothData = React.useMemo(() => (sData || data), [sData, data]);

  const smoothedPath = React.useMemo(() => {
    try {
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
    }
    // Catch block to handle errors thrown in the try block
    catch (error) {
      // Check if the error is an instance of TypeError
      if (error instanceof TypeError) {
        // Log an error message indicating property access to an undefined object
      }
      // If the error is not a TypeError, rethrow the error
      else {
        throw error; // Rethrow the error if it's not a TypeError
      }
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
    if (!smoothedPath) return EMPTY_PATH;
    const result = parse(smoothedPath);
    return result ?? EMPTY_PATH;
  }, [smoothedPath]);

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

  const parsedPath = React.useMemo(() => {
    if (isOriginal) {
      const result = parse(path);
      return result ?? EMPTY_PATH;
    }
    return smoothedParsedPath
  }, [isOriginal, path]);

  React.useLayoutEffect(() => {
    parsedPathSV.value = parsedPath;
  }, [parsedPath]);

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
      if (result !== previous && previous !== null) {
        scheduleOnRN(setIsOriginal, result)
      }
    },
    [isActive]
  );

  return { parsedPathSV, path: path, isOriginal: isOriginal };
}