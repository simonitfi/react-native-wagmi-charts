import * as React from 'react';

import { LineChartContext } from './Context';
import { useLineChartData, useLineChartId } from './Data';
import { useCurrentY } from './useCurrentY';

export function useLineChart(customId?:string) {
  const lineChartContext = React.useContext(LineChartContext);
  const maybeId = useLineChartId();
  const dataContext = useLineChartData({
    id: customId ?? maybeId,
  });
  const currentY = useCurrentY();

  return React.useMemo(
    () => ({ ...lineChartContext, ...dataContext, currentY }),
    [lineChartContext, dataContext, currentY]
  );
}

/**
 * Lightweight hook that returns ONLY stable SharedValue references
 * (currentX, currentY, isActive, xDomain, etc.) WITHOUT subscribing
 * to the data context. Use this in components (like Tooltip) that
 * don't need reactive access to the data array.
 */
export function useLineChartShared() {
  const lineChartContext = React.useContext(LineChartContext);
  const currentY = useCurrentY();

  return React.useMemo(
    () => ({ ...lineChartContext, currentY }),
    [lineChartContext, currentY]
  );
}
