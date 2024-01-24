import * as React from 'react';
import { useDerivedValue } from 'react-native-reanimated';

import { formatPrice, akimaCubicInterpolation, precalculate } from '../../utils';
import type { TFormatterFn } from '../candle/types';
import { useLineChart } from './useLineChart';
import { LineChartDimensionsContext } from './Chart';
import { TLineChartPoint } from 'react-native-wagmi-charts/src/charts/line/types';

export function useLineChartPrice({
  format,
  precision = 2,
  index,
}: { format?: TFormatterFn<string>; precision?: number; index?: number } = {}) {
  const { currentIndex, data, currentX, isActive } = useLineChart();
  const { height, pathWidth, width } = React.useContext(
    LineChartDimensionsContext
  );
  const timeX = Array(data.length)
  for (let index = 0; index < timeX.length; index++) {
    timeX[index] = width * (index / timeX.length)
  }
  const dataStart = data.findIndex((a) => a.value !== null)
  const dataEnd = data.findLastIndex((a) => a.value !== null)

  const data_ = data.map((obj, index) => {
    let result = obj
    if (index < dataStart)
      result = data[dataStart]
    if (index > dataEnd)
      result = data[dataEnd]
    return result
  });
  const dataY = data_.map((obj) => obj.value);

  const precalculated = precalculate(timeX, dataY);

  const float = useDerivedValue(() => {
    if (index !== null && !isActive.value) {
      const res = data[Math.min(index ?? currentIndex.value, data.length - 1)]?.value;
      if (typeof res === 'number') return res.toFixed(precision).toString();
    }
    if (currentIndex.value && data[Math.min(currentIndex.value, data.length - 1)]?.value === null) {
      return ''
    }
    // console.log(currentX.value, width * (dataEnd / timeX.length))
    if (typeof currentX.value === 'number' && isActive.value && currentX.value <= width * ((dataEnd + 0.5) / timeX.length) &&
      currentX.value >= width * ((dataStart - 0.5) / timeX.length)) {
      const res = akimaCubicInterpolation(timeX, dataY, currentX.value, precalculated)
      if (typeof res === 'number') return res.toFixed(precision).toString();
    }
    return ''
  }, [currentIndex, isActive, data, precision, precalculated, dataY, timeX, dataStart, dataEnd]);
  const formatted = useDerivedValue(() => {
    let value = float.value || '';
    const formattedPrice = value ? formatPrice({ value }) : '';
    return format
      ? format({ value, formatted: formattedPrice })
      : formattedPrice;
  }, [float, format]);

  return { value: float, formatted };
}
