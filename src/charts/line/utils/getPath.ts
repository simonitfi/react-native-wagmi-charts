// @ts-ignore
import * as shape from 'd3-shape';
// @ts-ignore
import { scaleLinear } from 'd3-scale';

import type { TLineChartData, YDomain } from '../types';

export function getPath({
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

  try {
    const path = shape
      .line()
      .defined((d: { timestamp: number }) =>
        from || to
          ? data
            .slice(from, to ? to + 1 : undefined)
            .find((item) => item.timestamp === d.timestamp)
          : true
      )
      .x((_: unknown, i: number) => scaleX(xDomain ? timestamps[i] : i))
      .y((d: { value: number, smoothedValue: number }) => scaleY(isOriginalData ? d.value : d.smoothedValue))
      .curve(_shape)(data);
    return path;
  }
  // Catch block to handle errors thrown in the try block
  catch (error) {
    // Check if the error is an instance of TypeError
    if (error instanceof TypeError) {
      // Log an error message indicating property access to an undefined object
      console.error('Error: Property access to undefined object, getPath', error);
    }
    // If the error is not a TypeError, rethrow the error
    else {
      throw error; // Rethrow the error if it's not a TypeError
    }
  }
  return '';

}
