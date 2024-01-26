// @ts-ignore
import smoothish from 'smoothish';
import type { LineChartArea, LineChartAreaBuffer, LineChartPath, LineChartPathBuffer, TLineChartData, TLineChartPoint } from '../types';

export const smoothData = (data: TLineChartData, radius: number) => {
  let values = data.map((item: TLineChartPoint) => item.value);
  const smoothed = smoothish(values, { radius: 10 });
  data.forEach(function (item: TLineChartPoint, i: number) {
    item.smoothedValue = smoothed[i];
  });
  return data;
};

export const findPath = (data: LineChartPath | LineChartArea, buffer: LineChartPathBuffer | LineChartAreaBuffer) => {
  if (typeof data.fromData !== 'number' || typeof data.toData !== 'number') return
  const meta = JSON.stringify(data.meta)
  
  const item = buffer.find((a) => typeof a.fromData === 'number' && typeof a.toData === 'number' && a.from === data.from && a.to === data.to && a.fromData === Number(data.fromData.toFixed(2)) &&
    a.toData === Number(data.toData.toFixed(2)) && a.totalLength === data.totalLength && a.meta === meta)
  return item;
};

export const addPath = (data: LineChartPath | LineChartArea, buffer: LineChartPathBuffer | LineChartAreaBuffer) => {
  if (typeof data.fromData !== 'number' || typeof data.toData !== 'number') return
  const meta = JSON.stringify(data.meta)

  const index = buffer.findIndex((a) => a.from === data.from && a.to === data.to && a.fromData === Number(data.fromData.toFixed(2)) &&
    a.toData === Number(data.toData.toFixed(2)) && a.totalLength === data.totalLength && a.meta === meta)
  if (index < 0) {
    const x = { ...data }
    x.index = buffer.length
    x.fromData = Number(x.fromData.toFixed(2))
    x.toData = Number(x.toData.toFixed(2))
    x.meta = meta
    buffer.push(x)
    if (buffer.length > 20) {
      buffer.splice(0, buffer.length - 20);
    }
  }
};