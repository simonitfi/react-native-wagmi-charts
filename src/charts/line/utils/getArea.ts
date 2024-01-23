// @ts-ignore
import * as shape from 'd3-shape';

import type { TLineChartData, YDomain } from '../types';

// @ts-ignore
import { scaleLinear } from 'd3-scale';

export function getArea({
  data,
  width,
  height,
  gutter,
  shape: _shape,
  yDomain,
  xDomain,
  isOriginalData,
}: {
  data: TLineChartData;
  width: number;
  height: number;
  gutter: number;
  shape?: unknown;
  yDomain: YDomain;
  xDomain?: [number, number];
  isOriginalData: boolean;
}): string {
  const timestamps = data.map(({ timestamp }, i) => (xDomain ? timestamp : i));

  const scaleX = scaleLinear()
    .domain(xDomain ?? [Math.min(...timestamps), Math.max(...timestamps)])
    .range([0, width]);
  const scaleY = scaleLinear()
    .domain([yDomain.min, yDomain.max])
    .range([height - gutter, gutter]);
  const area = shape
    .area()
    .x((_: unknown, i: number) => scaleX(xDomain ? timestamps[i] : i))
    .y0((d: { value: number, smoothedValue: number }) => scaleY(isOriginalData ? d.value : d.smoothedValue))
    .y1(() => height)
    .curve(_shape)(data);
  return area;
}
