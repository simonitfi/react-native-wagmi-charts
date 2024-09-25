import React from 'react';
import type { TextProps as RNTextProps } from 'react-native';

import type { TFormatterFn, TPriceType } from './types';
import { useCandlestickChartPrice } from './usePrice';
import { AnimatedText } from '../../components/AnimatedText';
import { AnimatedProps } from 'react-native-reanimated';

export type CandlestickChartPriceTextProps = {
  format?: TFormatterFn<string>;
  precision?: number;
  variant?: 'formatted' | 'value';
  type?: TPriceType;
  style?: AnimatedProps<RNTextProps>['style'];
};

export function CandlestickChartPriceText({
  format,
  precision = 2,
  variant = 'formatted',
  type = 'crosshair',
  style,
}: CandlestickChartPriceTextProps) {
  const price = useCandlestickChartPrice({ format, precision, type });
  return <AnimatedText text={price[variant]} style={style} />;
}
