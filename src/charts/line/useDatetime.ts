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
  const dataY = data.map((obj) => obj.timestamp);
  const precalculated = precalculate(timeX, dataY);

  const timestamp = useDerivedValue(() => {
    if (typeof currentX.value === 'number' && isActive.value){
      const res = akimaCubicInterpolation(timeX, dataY, currentX.value, precalculated)
      if (typeof res === 'number') return res
    }
    return '';
  }, [currentIndex, currentX, data, precalculated, dataY, timeX]);

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
