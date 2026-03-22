import { useContext } from 'react';
import { useDerivedValue } from 'react-native-reanimated';
import { getYForX } from 'react-native-redash';
import { LineChartContext } from './Context';
import { LineChartDimensionsContext } from './Chart';

export function useCurrentY() {
  const { parsedPathSV, pathWidth } = useContext(LineChartDimensionsContext);
  const { currentX } = useContext(LineChartContext);

  const currentY = useDerivedValue(() => {
    if (!parsedPathSV.value?.curves?.length) {
      return -1;
    }
    const boundedX = Math.min(pathWidth, currentX.value);
    const raw = getYForX(parsedPathSV.value, boundedX);
    return raw ?? -1;
  }, [parsedPathSV, pathWidth, currentX]);

  return currentY;
}
