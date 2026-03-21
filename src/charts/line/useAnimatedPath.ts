import * as React from 'react';
import { scheduleOnRN } from 'react-native-worklets';
import {
  useAnimatedProps,
  useAnimatedReaction,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { SharedValue } from "react-native-reanimated/lib/types/lib";
import { addPath, findPath, findPathIndex, getPath, interpolatePath } from './utils';
import { LineChartDimensionsContext } from './Chart';
import { useLineChart } from './useLineChart';
import { LineChartPathContext } from './LineChartPathContext';

function excludeSegment(a: {x: number}, b: {x: number}) {
  'worklet';
  return a.x === b.x;
}

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
  const { animationDuration } = React.useContext(LineChartPathContext);

  const smoothData = React.useMemo(() => (sData || data), [sData, data]);

  if (sTo < 0) sTo = smoothData.length - 1
  if (to < 0) to = data.length - 1

  const smoothedPath = React.useMemo(() => {
    try {
      if (smoothData && smoothData.length > 1 && sTo > 0 && sTo < smoothData.length && typeof smoothData[sFrom] !== undefined && typeof smoothData[sTo].smoothedValue !== undefined) {
        const bPathIndex = findPathIndex({
          from: sFrom, to: sTo, fromData: smoothData[sFrom].smoothedValue, toData: smoothData[sTo].smoothedValue, totalLength: smoothData.length, data: '',
          meta: {
            pathWidth: pathWidth,
            height: height,
            gutter: gutter,
            yDomain,
            xDomain
          }
        }, pathBuffer.current)

        if (bPathIndex > -1) {
          const res = pathBuffer.current[bPathIndex].data
          return res
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
    }
    // Catch block to handle errors thrown in the try block
    catch (error) {
      // Check if the error is an instance of TypeError
      if (error instanceof TypeError) {
        // Property access to undefined object in smoothedPath
      }
      // If the error is not a TypeError, rethrow the error
      else {
        throw error; // Rethrow the error if it's not a TypeError
      }
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

  // Mirror smoothedPath as a SharedValue so useAnimatedReaction below only
  // re-subscribes when the actual path string changes, not on every React
  // re-render. A plain JS string in the deps array causes the worklet to be
  // recreated each render, firing the reaction continuously at ~60fps.
  const smoothedPathSV = useSharedValue(smoothedPath);
  React.useEffect(() => {
    if (smoothedPath) {
      smoothedPathSV.value = smoothedPath;
    }
    // When not active / initial state, update path immediately on JS thread
    if (!isLiveData) {
      if (smoothedPath) path.value = smoothedPath;
    } else if (!isActive.value) {
      if (smoothedPath) path.value = smoothedPath;
    }
  }, [smoothedPath, isLiveData]);

  const allowMorph = useSharedValue(true);

  const enableMorph = () => {
    setTimeout(() => allowMorph.value = true, 1000)
  }

  const setPath = () => {
    if (data && data.length > 0) {
      const p = getPath({
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
      path.value = p;
    } else {
      path.value = '';
    }
  }

  const setPathRef = React.useRef(setPath);
  React.useEffect(() => {
    setPathRef.current = setPath;
  });

  const setPathLatest = React.useCallback(() => {
    setPathRef.current();
  }, []);

  React.useEffect(() => {
    if (update !== 0 && !isLiveData) {
      setPathLatest()
    }
  }, [height, gutter, shape, update, isLiveData]);

  useAnimatedReaction(
    () => isActive.value,
    (result, previous) => {
      // For live data: when active, switch to real path; when inactive, use smoothed
      if (isLiveData) {
        if (!result) {
          path.value = smoothedPathSV.value;
        }
      }
      if (!!previous !== result) {
        allowMorph.value = false
        !result && scheduleOnRN(enableMorph)
      }
      if (result && isLiveData) {
        scheduleOnRN(setPathLatest)
      }
    },
    [isActive, smoothedPathSV]
  );

  useAnimatedReaction(
    () => path.value,
    (current, previous) => {
      if (current !== previous && current) {
        previousPath.value = currentPath.value;
        currentPath.value = current;
        transition.value = 0;
        transition.value = withTiming(1, {duration: animationDuration});
      }
    },
    [animationDuration]
  );

  const animatedProps = useAnimatedProps(() => {
    let d = currentPath.value || '';
    if (previousPath.value && enabled && allowMorph.value && !isActive.value) {
      const pathInterpolator = interpolatePath(previousPath.value, currentPath.value, excludeSegment);
      d = pathInterpolator(transition.value);
    }
    return {
      d,
    };
  });

  return { animatedProps };
}
