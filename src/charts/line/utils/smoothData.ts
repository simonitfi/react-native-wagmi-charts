// @ts-ignore
import smoothish from 'smoothish';
import type { LineChartArea, LineChartAreaBuffer, LineChartPath, LineChartPathBuffer, TLineChartData, TLineChartPoint } from '../types';

export const smoothData_ = (data: TLineChartData) => {
  //let values = data.map((item: TLineChartPoint) => item.value);
  // const smoothed = smoothish(values, { radius: 2 });
  data.forEach(function (item: TLineChartPoint, i: number) {
    if (item) item.smoothedValue = item.value
  });
  return data;
};

// Pre-stringify meta once per call to avoid repeated JSON.stringify in
// every findIndex/find iteration.  Also pre-round fromData/toData so the
// rounding isn't re-computed for every buffer entry comparison.
function prepareLookup(data: LineChartPath | LineChartArea) {
  const meta = typeof data.meta === 'string' ? data.meta : JSON.stringify(data.meta);
  const fromR = Number(data.fromData.toFixed(1));
  const toR = Number(data.toData.toFixed(1));
  const hasTimes = Number.isInteger(data.fromTime) && Number.isInteger(data.toTime) && Number.isInteger(data.timeTolerance);
  return { meta, fromR, toR, hasTimes };
}

export const findPathIndex = (data: LineChartPath | LineChartArea, buffer: LineChartPathBuffer | LineChartAreaBuffer | null) => {
  if (typeof data.fromData !== 'number' || typeof data.toData !== 'number' || buffer === null) return -1
  const { meta, fromR, toR, hasTimes } = prepareLookup(data);

  if (hasTimes) {
    return buffer.findIndex((a) => Number.isInteger(a.fromTime) && Number.isInteger(a.toTime) && typeof a.fromData === 'number' && typeof a.toData === 'number' &&
      Math.abs(a.fromTime! - data.fromTime!) <= data.timeTolerance! && Math.abs(a.toTime! - data.toTime!) <= data.timeTolerance! &&
      a.from === data.from && a.to === data.to && a.fromData === fromR &&
      a.toData === toR && a.totalLength === data.totalLength && a.meta === meta)
  }
  return buffer.findIndex((a) => typeof a.fromData === 'number' && typeof a.toData === 'number' && a.from === data.from && a.to === data.to && a.fromData === fromR &&
    a.toData === toR && a.totalLength === data.totalLength && a.meta === meta)
};

export const findPath = (data: LineChartPath | LineChartArea, buffer: LineChartPathBuffer | LineChartAreaBuffer | null) => {
  if (typeof data.fromData !== 'number' || typeof data.toData !== 'number' || buffer === null) return
  const { meta, fromR, toR, hasTimes } = prepareLookup(data);

  if (hasTimes) {
    return buffer.find((a) => Number.isInteger(a.fromTime) && Number.isInteger(a.toTime) && typeof a.fromData === 'number' && typeof a.toData === 'number' &&
      Math.abs(a.fromTime! - data.fromTime!) <= data.timeTolerance! && Math.abs(a.toTime! - data.toTime!) <= data.timeTolerance! &&
      a.from === data.from && a.to === data.to && a.fromData === fromR &&
      a.toData === toR && a.totalLength === data.totalLength && a.meta === meta)
  }
  return buffer.find((a) => typeof a.fromData === 'number' && typeof a.toData === 'number' && a.from === data.from && a.to === data.to && a.fromData === fromR &&
    a.toData === toR && a.totalLength === data.totalLength && a.meta === meta)
};

export const addPath = (data: LineChartPath | LineChartArea, buffer: LineChartPathBuffer | LineChartAreaBuffer | null) => {
  if (typeof data.fromData !== 'number' || typeof data.toData !== 'number' || buffer === null) return
  const { meta, fromR, toR, hasTimes } = prepareLookup(data);

  if (hasTimes) {
    const index = buffer.findIndex((a) => Number.isInteger(a.fromTime) && Number.isInteger(a.toTime) && a.from === data.from && a.to === data.to && a.fromData === fromR &&
      Math.abs(a.fromTime! - data.fromTime!) <= data.timeTolerance! && Math.abs(a.toTime! - data.toTime!) <= data.timeTolerance! &&
      a.toData === toR && a.totalLength === data.totalLength && a.meta === meta)
    if (index < 0) {
      const x = { ...data }
      x.fromData = fromR
      x.toData = toR
      x.fromTime = Number(x.fromTime)
      x.toTime = Number(x.toTime)
      x.meta = meta
      buffer.push(x)
      if (buffer.length > 10) {
        buffer.shift()
      }
    }
  } else {
    const index = buffer.findIndex((a) => a.from === data.from && a.to === data.to && a.fromData === fromR &&
      a.toData === toR && a.totalLength === data.totalLength && a.meta === meta)
    if (index < 0) {
      const x = { ...data }
      x.fromData = fromR
      x.toData = toR
      x.meta = meta
      buffer.push(x)
      if (buffer.length > 10) {
        buffer.shift()
      }
    }
  }
};