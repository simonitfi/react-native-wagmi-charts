import * as React from 'react';
import { runOnJS, SharedValue, useDerivedValue } from 'react-native-reanimated';

import { formatPrice, akimaCubicInterpolation, precalculate } from '../../utils';
import type { TFormatterFn } from '../candle/types';
import { useLineChart } from './useLineChart';
import { LineChartDimensionsContext } from './Chart';

export function useLineChartPrice({
  format,
  precision = 2,
  index,
}: { format?: TFormatterFn<string>; precision?: number; index?: SharedValue<number | undefined> } = {}) {
  const { currentIndex, data, currentX, isActive, xDomain } = useLineChart();
  const { height, pathWidth, width } = React.useContext(
    LineChartDimensionsContext
  );

  const [update, setUpdate] = React.useState(0);

  const float = useDerivedValue(() => {
    if (typeof index?.value === 'number' && !isActive.value) {
      const res = data[Math.min(index?.value ?? currentIndex.value, data.length - 1)]?.value;
      if (typeof res === 'number') return res.toFixed(precision).toString();
    }
    if (typeof index?.value === 'number' && isActive.value) {
      const res = data[Math.min(index?.value, data.length - 1)]?.value;
      if (typeof res === 'number') return res.toFixed(precision).toString();
    }
    if (currentIndex.value && data[Math.min(currentIndex.value, data.length - 1)]?.value === null) {
      return ''
    }

    if (typeof currentX.value === 'number' && isActive.value) {
      const timeX = Array(data.length)

      const total = xDomain ? xDomain[1] - xDomain[0] : timeX.length - 1
      for (let index_ = 0; index_ < timeX.length; index_++) {
        if (xDomain) timeX[index_] = width * ((data[index_].timestamp / total))
        else timeX[index_] = width * (index_ / (total))
      }
      const dataStart = xDomain ? data.find((a) => a.value !== null)?.timestamp : data.findIndex((a) => a.value !== null)
      const dataEnd = xDomain ? data.findLast((a) => a.value !== null)?.timestamp : data.findLastIndex((a) => a.value !== null)

      if (typeof dataStart === 'number' && typeof dataEnd === 'number' && currentX.value <= width * ((dataEnd) / total) &&
        currentX.value >= width * ((dataStart) / total)) {

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
        const res = akimaCubicInterpolation(timeX, dataY, currentX.value, precalculated)
        if (typeof res === 'number') {
          return res.toFixed(precision).toString();
        }
      }
    }
    return ''
  }, [currentIndex, isActive, data, precision, index]);

  const formatted = useDerivedValue(() => {
    let value = float.value || '';
    const formattedPrice = value ? formatPrice({ value }) : '';
    // force render on change as without does show second last value
    if (formattedPrice && index?.value !== null && !isActive.value) runOnJS(setUpdate)(Date.now())
    return format
      ? format({ value, formatted: formattedPrice })
      : formattedPrice;
  }, [float, format]);

  return { value: float, formatted };
}
