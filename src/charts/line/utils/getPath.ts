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
  const firstNullAfter = fromNull !== 0 ? -1 : data.findIndex((element) => element.value === null);
  const toNull = firstNullAfter === -1 ? data.length - 1 : firstNullAfter - 1;

  from = from !== undefined && from > fromNull ? from : fromNull
  to = to !== undefined && to < toNull ? to : toNull

  const timestamps = xDomain ? data.map((d) => d.timestamp) : null;
  const scaleX = scaleLinear()
    .domain(xDomain ?? [0, data.length - 1])
    .range([0, width]);
  const scaleY = scaleLinear()
    .domain([yDomain.min, yDomain.max])
    .range([height - gutter, gutter]);

  try {
    const _t0 = __DEV__ ? Date.now() : 0;
    const path = shape
      .line()
      .defined((_: unknown, i: number) => (from || to) ? (i >= (from as number) && i <= (to as number)) : true)
      .x((_: unknown, i: number) => scaleX(xDomain ? (timestamps as number[])[i] : i))
      .y((d: { value: number, smoothedValue: number }) => scaleY(isOriginalData ? d.value : d.smoothedValue))
      .curve(_shape)(data);
    if (__DEV__) { const ms = Date.now() - _t0; if (ms > 2) console.log(`[WagmiChart] getPath pts=${data.length} orig=${isOriginalData} ${ms}ms`); }
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

/**
 * Incrementally extends an existing curveBumpX SVG path with exactly one new
 * data point appended at the end, without recomputing the whole path.
 *
 * curveBumpX control-point formula for segment (x0,y0)→(x1,y1):
 *   bezierCurveTo( (x0+x1)/2, y0,  (x0+x1)/2, y1,  x1, y1 )
 *
 * Each segment depends ONLY on its own two endpoints, so adding a point at
 * the tail leaves every previous segment unchanged.  This makes the operation
 * O(1) instead of O(n).
 *
 * Returns both the extended path string AND a pre-built curve object that can
 * be directly pushed onto a react-native-redpath `Path.curves` array, avoiding
 * an expensive `parse()` call.
 *
 * Prerequisites (caller must verify before using):
 *  - shape === d3Shape.curveBumpX
 *  - xDomain is provided (so the x-scale domain is fixed)
 *  - yDomain is unchanged from the previous render (same min/max)
 *  - exactly one point was appended (newIndex === prevIndex + 1)
 */
export function appendCurveBumpXSegment({
  basePath,
  prevIndex,
  newIndex,
  data,
  width,
  height,
  gutter,
  yDomain,
  xDomain,
  isOriginalData,
}: {
  basePath: string;
  prevIndex: number;
  newIndex: number;
  data: TLineChartData;
  width: number;
  height: number;
  gutter: number;
  yDomain: YDomain;
  xDomain?: [number, number];
  isOriginalData: boolean;
}): {
  path: string;
  newCurve: {
    from: { x: number; y: number };
    to: { x: number; y: number };
    c1: { x: number; y: number };
    c2: { x: number; y: number };
  };
} {
  const scaleX = scaleLinear()
    .domain(xDomain ?? [0, data.length - 1])
    .range([0, width]);
  const scaleY = scaleLinear()
    .domain([yDomain.min, yDomain.max])
    .range([height - gutter, gutter]);

  const prevPoint = data[prevIndex];
  const newPoint = data[newIndex];

  const prevX = scaleX(xDomain ? prevPoint.timestamp : prevIndex);
  const prevY = scaleY(
    isOriginalData
      ? prevPoint.value
      : (prevPoint.smoothedValue ?? prevPoint.value)
  );
  const newX = scaleX(xDomain ? newPoint.timestamp : newIndex);
  const newY = scaleY(
    isOriginalData ? newPoint.value : (newPoint.smoothedValue ?? newPoint.value)
  );
  const midX = (prevX + newX) / 2;

  return {
    path: `${basePath}C${midX},${prevY} ${midX},${newY} ${newX},${newY}`,
    newCurve: {
      from: { x: prevX, y: prevY },
      to: { x: newX, y: newY },
      c1: { x: midX, y: prevY },
      c2: { x: midX, y: newY },
    },
  };
}
