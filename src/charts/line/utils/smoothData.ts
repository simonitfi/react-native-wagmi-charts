// @ts-ignore
import smoothish from 'smoothish';
import type { LineChartArea, LineChartAreaBuffer, LineChartPath, LineChartPathBuffer, TLineChartData, TLineChartPoint } from '../types';

export const smoothData_ = (data: TLineChartData) => {
  //let values = data.map((item: TLineChartPoint) => item.value);
  // const smoothed = smoothish(values, { radius: 2 });
  data.forEach(function (item: TLineChartPoint, i: number) {
    item.smoothedValue = item.value
  });
  return data;
};

export const findPath = (data: LineChartPath | LineChartArea, buffer: LineChartPathBuffer | LineChartAreaBuffer | null) => {
  if (typeof data.fromData !== 'number' || typeof data.toData !== 'number' || buffer === null) return
  const meta = JSON.stringify(data.meta)

  let item
  if (Number.isInteger(data.fromTime) && Number.isInteger(data.toTime)) {
    item = buffer.find((a) => Number.isInteger(a.fromTime) && Number.isInteger(a.toTime) && typeof a.fromData === 'number' && typeof a.toData === 'number' &&
      Math.abs(a.fromTime - data.fromTime) < 6000 && Math.abs(a.toTime - data.toTime) < 6000 &&
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

  if (Number.isInteger(data.fromTime) && Number.isInteger(data.toTime)) {
    const index = buffer.findIndex((a) => Number.isInteger(a.fromTime) && Number.isInteger(a.toTime) && a.from === data.from && a.to === data.to && a.fromData === Number(data.fromData.toFixed(1)) &&
    Math.abs(a.fromTime - data.fromTime) < 6000 && Math.abs(a.toTime - data.toTime) < 6000 &&  
    a.toData === Number(data.toData.toFixed(1)) && a.totalLength === data.totalLength && a.meta === meta)
    if (index < 0) {
      const x = { ...data }
      x.index = buffer.length
      x.fromData = Number(x.fromData.toFixed(1))
      x.toData = Number(x.toData.toFixed(1))
      x.fromTime = Number(x.fromTime)
      x.toTime = Number(x.toTime)
      x.meta = meta
      buffer.push(x)
      if (buffer.length > 20) {
        buffer.splice(0, buffer.length - 20);
      }
    }
  } else {
    const index = buffer.findIndex((a) => a.from === data.from && a.to === data.to && a.fromData === Number(data.fromData.toFixed(1)) &&
      a.toData === Number(data.toData.toFixed(1)) && a.totalLength === data.totalLength && a.meta === meta)
    if (index < 0) {
      const x = { ...data }
      x.index = buffer.length
      x.fromData = Number(x.fromData.toFixed(1))
      x.toData = Number(x.toData.toFixed(1))
      x.meta = meta
      buffer.push(x)
      if (buffer.length > 20) {
        buffer.splice(0, buffer.length - 20);
      }
    }
  }


};