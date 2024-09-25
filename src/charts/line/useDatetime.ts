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
  const { currentIndex, data, currentX, isActive, xDomain } = useLineChart(id);
  const { height, pathWidth, width } = React.useContext(
    LineChartDimensionsContext
  );

  const timestamp = useDerivedValue(() => {
    if (currentIndex.value && data[Math.min(currentIndex.value, data.length - 1)]?.value === null) {
      return ''
    }
    if (typeof currentX.value === 'number' && isActive.value) {
      const timeX = Array(data.length)
      const total = xDomain ? xDomain[1] - xDomain[0] : timeX.length - 1
      for (let index = 0; index < timeX.length; index++) {
        if (xDomain) timeX[index] = width * ((data[index].timestamp / total))
        else timeX[index] = width * (index / (total))
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
        const dataY = data_.map((obj) => obj.timestamp);
        const precalculated = precalculate(timeX, dataY);
        const res = akimaCubicInterpolation(timeX, dataY, currentX.value, precalculated)
        if (typeof res === 'number') return res
      } else {
        const minIndex = data.findIndex((element: { value: null }) => element.value !== null);
        const maxIndex =
          minIndex !== 0 || data.findIndex((element: { value: null }) => element.value === null) === -1
            ? data.length - 1
            : data.findIndex((element: { value: null }) => element.value === null) - 1;
        if (data[maxIndex]?.timestamp) return data[maxIndex]?.timestamp
      }
    }
    return '';
  }, [currentIndex, currentX, data]);

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
