import React from 'react';
import type { TextProps as RNTextProps } from 'react-native';

import { useLineChartDatetime } from './useDatetime';
import type { TFormatterFn } from 'react-native-wagmi-charts';
import { AnimatedText } from '../../components/AnimatedText';
import { AnimatedProps } from 'react-native-reanimated';

type LineChartDatetimeProps = {
  locale?: string;
  options?: Intl.DateTimeFormatOptions;
  format?: TFormatterFn<number>;
  variant?: 'formatted' | 'value';
  style?: AnimatedProps<RNTextProps>['style'];
  id?:string
};

LineChartDatetimeText.displayName = 'LineChartDatetimeText';

export function LineChartDatetimeText({
  locale,
  options,
  format,
  variant = 'formatted',
  style,
  id
}: LineChartDatetimeProps) {
  const datetime = useLineChartDatetime({ format, locale, options, id });
  return <AnimatedText text={datetime[variant]} style={style} />;
}
