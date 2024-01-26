// @ts-ignore
import * as shape from 'd3-shape';

import type { TLineChartData, YDomain } from '../types';

// @ts-ignore
import { scaleLinear } from 'd3-scale';

export function getArea({
  data,
  from,
  to,
  width,
  height,
  gutter,
  shape: _shape,
  yDomain,
  xDomain,
  isOriginalData,
}: {
  data: TLineChartData;
  from?: number;
  to?: number;
  width: number;
  height: number;
  gutter: number;
  shape?: unknown;
  yDomain: YDomain;
  xDomain?: [number, number];
  isOriginalData: boolean;
}): string {
  // Set from and to depending on null values on data
  // Set from and to depending on null values on data
  const fromNull = data.findIndex((element) => element.value !== null);
  const toNull = fromNull !== 0 || data.findIndex((element) => element.value === null) === -1 ? data.length - 1 : data.findIndex((element) => element.value === null) - 1;

  from = from !== undefined && from > fromNull ? from : fromNull
  to = to !== undefined && to < toNull ? to : toNull

  const timestamps = new Array(data.length);
  for (let i = 0; i < data.length; ++i) {
    timestamps[i] = xDomain ? data[i].timestamp : i;
  }

  const scaleX = scaleLinear()
    .domain(xDomain ?? [Math.min(...timestamps), Math.max(...timestamps)])
    .range([0, width]);
  const scaleY = scaleLinear()
    .domain([yDomain.min, yDomain.max])
    .range([height - gutter, gutter]);
  const area = shape
    .area().defined((d: { timestamp: number }) =>
      from || to
        ? data
          .slice(from, to ? to + 1 : undefined)
          .find((item) => item.timestamp === d.timestamp)
        : true
    )
    .x((_: unknown, i: number) => scaleX(xDomain ? timestamps[i] : i))
    .y0((d: { value: number, smoothedValue: number }) => scaleY(isOriginalData ? d.value : d.smoothedValue))
    .y1(() => height)
    .curve(_shape)(data);
  return area;
}
