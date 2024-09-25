import React from 'react';
import type { TextProps as RNTextProps } from 'react-native';

import { useCandlestickChartDatetime } from './useDatetime';
import type { TFormatterFn } from 'react-native-wagmi-charts';
import { AnimatedText } from '../../components/AnimatedText';
import { AnimatedProps } from 'react-native-reanimated';

type CandlestickChartPriceTextProps = {
  locale?: string;
  options?: { [key: string]: string };
  format?: TFormatterFn<number>;
  variant?: 'formatted' | 'value';
  style?: AnimatedProps<RNTextProps>['style'];
};

export function CandlestickChartDatetimeText({
  locale,
  options,
  format,
  variant = 'formatted',
  style,
}: CandlestickChartPriceTextProps) {
  const datetime = useCandlestickChartDatetime({ format, locale, options });
  return <AnimatedText text={datetime[variant]} style={style} />;
}
