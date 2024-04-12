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

export const findPathIndex = (data: LineChartPath | LineChartArea, buffer: LineChartPathBuffer | LineChartAreaBuffer | null) => {
  if (typeof data.fromData !== 'number' || typeof data.toData !== 'number' || buffer === null) return -1
  const meta = JSON.stringify(data.meta)

  let index = -1
  if (Number.isInteger(data.fromTime) && Number.isInteger(data.toTime) && Number.isInteger(data.timeTolerance)) {
    index = buffer.findIndex((a) => Number.isInteger(a.fromTime) && Number.isInteger(a.toTime) && typeof a.fromData === 'number' && typeof a.toData === 'number' &&
      Math.abs(a.fromTime - data.fromTime) <= data.timeTolerance && Math.abs(a.toTime - data.toTime) <= data.timeTolerance &&
      a.from === data.from && a.to === data.to && a.fromData === Number(data.fromData.toFixed(1)) &&
      a.toData === Number(data.toData.toFixed(1)) && a.totalLength === data.totalLength && a.meta === meta)
  } else {
    index = buffer.findIndex((a) => typeof a.fromData === 'number' && typeof a.toData === 'number' && a.from === data.from && a.to === data.to && a.fromData === Number(data.fromData.toFixed(1)) &&
      a.toData === Number(data.toData.toFixed(1)) && a.totalLength === data.totalLength && a.meta === meta)
  }
  return index;
};

export const findPath = (data: LineChartPath | LineChartArea, buffer: LineChartPathBuffer | LineChartAreaBuffer | null) => {
  if (typeof data.fromData !== 'number' || typeof data.toData !== 'number' || buffer === null) return
  const meta = JSON.stringify(data.meta)

  let item
  if (Number.isInteger(data.fromTime) && Number.isInteger(data.toTime) && Number.isInteger(data.timeTolerance)) {
    item = buffer.find((a) => Number.isInteger(a.fromTime) && Number.isInteger(a.toTime) && typeof a.fromData === 'number' && typeof a.toData === 'number' &&
      Math.abs(a.fromTime - data.fromTime) <= data.timeTolerance && Math.abs(a.toTime - data.toTime) <= data.timeTolerance &&
      a.from === data.from && a.to === data.to && a.fromData === Number(data.fromData.toFixed(1)) &&
      a.toData === Number(data.toData.toFixed(1)) && a.totalLength === data.totalLength && a.meta === meta)
  } else {
    item = buffer.find((a) => typeof a.fromData === 'number' && typeof a.toData === 'number' && a.from === data.from && a.to === data.to && a.fromData === Number(data.fromData.toFixed(1)) &&
      a.toData === Number(data.toData.toFixed(1)) && a.totalLength === data.totalLength && a.meta === meta)
  }

  return item;
};

export const addPath = (data: LineChartPath | LineChartArea, buffer: LineChartPathBuffer | LineChartAreaBuffer | null) => {
  if (typeof data.fromData !== 'number' || typeof data.toData !== 'number' || buffer === null) return
  const meta = JSON.stringify(data.meta)

  if (Number.isInteger(data.fromTime) && Number.isInteger(data.toTime) && Number.isInteger(data.timeTolerance)) {
    const index = buffer.findIndex((a) => Number.isInteger(a.fromTime) && Number.isInteger(a.toTime) && a.from === data.from && a.to === data.to && a.fromData === Number(data.fromData.toFixed(1)) &&
      Math.abs(a.fromTime - data.fromTime) <= data.timeTolerance && Math.abs(a.toTime - data.toTime) <= data.timeTolerance &&
      a.toData === Number(data.toData.toFixed(1)) && a.totalLength === data.totalLength && a.meta === meta)
    if (index < 0) {
      const x = { ...data }
      x.fromData = Number(x.fromData.toFixed(1))
      x.toData = Number(x.toData.toFixed(1))
      x.fromTime = Number(x.fromTime)
      x.toTime = Number(x.toTime)
      x.meta = meta
      buffer.push(x)
      if (buffer.length > 10) {
        buffer.shift()
      }
    }
  } else {
    const index = buffer.findIndex((a) => a.from === data.from && a.to === data.to && a.fromData === Number(data.fromData.toFixed(1)) &&
      a.toData === Number(data.toData.toFixed(1)) && a.totalLength === data.totalLength && a.meta === meta)
    if (index < 0) {
      const x = { ...data }
      x.fromData = Number(x.fromData.toFixed(1))
      x.toData = Number(x.toData.toFixed(1))
      x.meta = meta
      buffer.push(x)
      if (buffer.length > 10) {
        buffer.shift()
      }
    }
  }


};