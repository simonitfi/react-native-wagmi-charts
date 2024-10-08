import React from 'react';
import type { TextProps as RNTextProps } from 'react-native';

import { useLineChartPrice } from './usePrice';
import type { TFormatterFn } from '../candle/types';
import { AnimatedText } from '../../components/AnimatedText';
import { AnimatedProps, SharedValue } from 'react-native-reanimated';

export type LineChartPriceTextProps = {
  format?: TFormatterFn<string>;
  precision?: number;
  variant?: 'formatted' | 'value';
  style?: AnimatedProps<RNTextProps>['style'];
  /**
   * By default, it will use the current active index from the chart.
   * If this is set it will use the index provided.
   */
  index?: SharedValue<number | undefined>;
};

LineChartPriceText.displayName = 'LineChartPriceText';

export function LineChartPriceText({
  format,
  precision = 2,
  variant = 'formatted',
  style,
  index,
}: LineChartPriceTextProps) {
  const price = useLineChartPrice({ format, precision, index });
  return <AnimatedText text={price[variant]} style={style} />;
}
