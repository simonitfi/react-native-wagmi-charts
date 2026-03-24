import * as React from 'react';
import { scheduleOnRN } from 'react-native-worklets';
import {
  useAnimatedProps,
  useAnimatedReaction,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { SharedValue } from "react-native-reanimated/lib/types/lib";
import { getArea, interpolatePath } from './utils';
import { LineChartDimensionsContext } from './Chart';
import { useLineChart } from './useLineChart';
import { LineChartPathContext } from './LineChartPathContext';

function excludeSegment(a: {x: number}, b: {x: number}) {
  'worklet';
  return a.x === b.x;
}

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
  const { pathWidth, height, gutter, shape, isLiveData, update, performanceConfig } = React.useContext(
    LineChartDimensionsContext
  );
  const { animationDuration } = React.useContext(LineChartPathContext);

  const smoothData = React.useMemo(() => (sData || data), [sData, data]);

  if (sTo < 0) sTo = smoothData.length - 1
  if (to < 0) to = data.length - 1

  const smoothedArea = React.useMemo(() => {
    try {
      if (smoothData && smoothData.length > 1 && sTo > 0 && sTo < smoothData.length && typeof smoothData[sFrom] !== undefined && typeof smoothData[sTo].smoothedValue !== undefined) {
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
        return result;
      }
    }
    catch (error) {
      if (error instanceof TypeError) {
        console.log('Error: Property access to undefined object, smoothedArea', error);
      } else {
        throw error;
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
  const allowMorph = useSharedValue(true);

  const currentArea = useSharedValue(smoothedArea);
  const previousArea = useSharedValue(smoothedArea);

  const area = useSharedValue('');

  // Mirror smoothedArea as a SharedValue so the isActive reaction on the UI
  // thread always has the freshest value when the finger lifts — same pattern
  // as smoothedPathSV in useAnimatedPath.
  const smoothedAreaSV = useSharedValue(smoothedArea);

  const enableMorph = () => {
    setTimeout(() => allowMorph.value = true, 1000)
  }

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
    } else {
      area.value = '';
    }
  }

  // Keep a stable ref to setArea so worklets always call the latest closure
  // (same pattern as setPathRef/setPathLatest in useAnimatedPath).
  const setAreaRef = React.useRef(setArea);
  React.useEffect(() => {
    setAreaRef.current = setArea;
  });
  const setAreaLatest = React.useCallback(() => {
    setAreaRef.current();
  }, []);

  React.useEffect(() => {
    if (smoothedArea) {
      smoothedAreaSV.value = smoothedArea;
    }
    // When not active / initial state, update area immediately on JS thread
    if (!isLiveData) {
      if (smoothedArea) area.value = smoothedArea;
    } else if (!isActive.value) {
      if (smoothedArea) area.value = smoothedArea;
    }
  }, [smoothedArea, isLiveData]);

  React.useEffect(() => {
    if (update !== 0 && !isLiveData) {
      setAreaLatest();
    }
  }, [height, gutter, shape, update, isLiveData]);

  useAnimatedReaction(
    () => isActive.value,
    (result, previous) => {
      if (!result) {
        // Always restore smooth area on release — for both live and non-live.
        // For non-live charts the setArea/setPath path is never called so the
        // area stays correct, but for live charts the active state shows the
        // original-data area which must revert.
        area.value = smoothedAreaSV.value;
      }
      if (!!previous !== result) {
        allowMorph.value = false;
        !result && scheduleOnRN(enableMorph);
      }
      if (result && isLiveData) {
        scheduleOnRN(setAreaLatest);
      }
    },
    [isActive, smoothedAreaSV]
  );

  useAnimatedReaction(
    () => area.value,
    (current, previous) => {
      if (current !== previous && current) {
        previousArea.value = currentArea.value;
        currentArea.value = current;
        transition.value = 0;
        transition.value = withTiming(1, { duration: animationDuration });
      }
    },
    [animationDuration]
  );

  const animatedProps = useAnimatedProps(() => {
    let d = currentArea.value || '';

    // guardTransitionEnd: skip interpolation when morph is finished
    if (performanceConfig.guardTransitionEnd && transition.value === 1) {
      return { d };
    }
    // skipMorphOnLiveData: never morph on live charts
    const shouldMorph = !(performanceConfig.skipMorphOnLiveData && isLiveData);
    if (previousArea.value && enabled && shouldMorph && allowMorph.value && !isActive.value) {
      const pathInterpolator = interpolatePath(previousArea.value, currentArea.value, excludeSegment);
      d = pathInterpolator(transition.value);
    }
    return {
      d,
    };
  });

  return { animatedProps };
}
