import { useContext, useMemo } from 'react';
import { useDerivedValue } from 'react-native-reanimated';
import { getYForX } from 'react-native-redash';
import { LineChartContext } from './Context';
import { LineChartDimensionsContext } from './Chart';

export function useCurrentY() {
  const { parsedPathSV, width } = useContext(LineChartDimensionsContext);
  const { currentX } = useContext(LineChartContext);

  const currentY = useDerivedValue(() => {
    if (!parsedPathSV.value?.curves?.length) {
      return -1;
    }
    const boundedX = Math.min(width, currentX.value);
    // Use null-coalescing (??) not logical-OR (||) so that a legitimate y=0
    // (data at the very top of the canvas) is preserved, while null/undefined
    // (getYForX outside path bounds) becomes -1 — a sentinel the Crosshair
    // style worklet can detect and treat as "invalid".
    return getYForX(parsedPathSV.value, boundedX) ?? -1;
  }, [parsedPathSV, width, currentX]);

  return currentY;
}
