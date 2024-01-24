import * as React from 'react';
import { useDerivedValue } from 'react-native-reanimated';

import { formatDatetime, akimaCubicInterpolation, precalculate } from '../../utils';
import type { TFormatterFn } from '../candle/types';
import { useLineChart } from './useLineChart';
import { LineChartDimensionsContext } from 'react-native-wagmi-charts/src/charts/line/Chart';

export function useLineChartDatetime({
  format,
  locale,
  options,
  id
}: {
  format?: TFormatterFn<number>;
  locale?: string;
  options?: Intl.DateTimeFormatOptions;
  id?: string
} = {}) {
  const { currentIndex, data, currentX, isActive } = useLineChart(id);
  const { height, pathWidth, width } = React.useContext(
    LineChartDimensionsContext
  );
  const timeX = Array(data.length)
  for (let index = 0; index < timeX.length; index++) {
    timeX[index] = width * (index / timeX.length)
  }
  const dataStart = data.findIndex((a) => a.timestamp !== null)
  const dataEnd = data.findLastIndex((a) => a.timestamp !== null)

  const data_ = data.map((obj, index) => {
    let result = obj
    if (index < dataStart)
      result = data[dataStart]
    if (index > dataEnd)
      result = data[dataEnd]
    return result
  });

  const dataY = data_.map((obj) => obj.timestamp);
  const precalculated = precalculate(timeX, dataY);

  const timestamp = useDerivedValue(() => {
    if (currentIndex.value && data[Math.min(currentIndex.value, data.length - 1)]?.value === null) {
      return ''
    }
    if (typeof currentX.value === 'number' && isActive.value && currentX.value <= width * ((dataEnd + 0.5) / timeX.length) &&
      currentX.value >= width * ((dataStart - 0.5) / timeX.length)) {
      const res = akimaCubicInterpolation(timeX, dataY, currentX.value, precalculated)
      if (typeof res === 'number') return res
    }
    return '';
  }, [currentIndex, currentX, data, precalculated, dataY, timeX, dataStart, dataEnd]);

  const timestampString = useDerivedValue(() => {
    if (typeof timestamp?.value !== 'number') return '';
    return timestamp.value.toString();
  }, [timestamp]);

  const formatted = useDerivedValue(() => {
    const formattedDatetime = timestamp.value
      ? formatDatetime({
        value: timestamp.value,
        locale,
        options,
      })
      : '';
    return format
      ? format({ value: timestamp.value || -1, formatted: formattedDatetime })
      : formattedDatetime;
  }, [format, locale, options, timestamp]);

  return { value: timestampString, formatted };
}
