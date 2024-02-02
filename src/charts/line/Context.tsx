import * as React from 'react';
import {
  runOnJS,
  useAnimatedReaction,
  useSharedValue,
} from 'react-native-reanimated';
import type { TLineChartDataProp } from './types';
import { LineChartDataProvider } from './Data';

import type { TLineChartContext, YRangeProp } from './types';
import { getDomain, lineChartDataPropToArray } from './utils';

export const LineChartContext = React.createContext<TLineChartContext>({
  currentX: { value: -1 },
  currentIndex: { value: -1 },
  domain: [0, 0],
  isActive: { value: false },
  yDomain: {
    min: 0,
    max: 0,
  },
  xDomain: undefined,
  xLength: 0
});

type LineChartProviderProps = {
  children: React.ReactNode;
  data: TLineChartDataProp;
  sData?: TLineChartDataProp;
  yRange?: YRangeProp;
  onCurrentIndexChange?: (x: number) => void;
  xLength?: number;
  xDomain?: [number, number];
  onActiveChange?: (isActive: boolean) => void;
};

LineChartProvider.displayName = 'LineChartProvider';

export function LineChartProvider({
  children,
  data = [],
  sData = [],
  yRange,
  onCurrentIndexChange,
  xLength,
  xDomain,
  onActiveChange
}: LineChartProviderProps) {
  const currentX = useSharedValue(-1);
  const currentIndex = useSharedValue(-1);
  const isActive = useSharedValue(false);

  const domain = React.useMemo(
    () => getDomain(Array.isArray(data) ? data : Object.values(data)[0]),
    [data]
  );

  const contextValue = React.useMemo<TLineChartContext>(() => {
    const values = lineChartDataPropToArray(data).map(({ value }) => value);
    const yDomain = {
      min: yRange?.min ?? Math.min(...values),
      max: yRange?.max ?? Math.max(...values),
    }

    return {
      currentX,
      currentIndex,
      isActive,
      domain,
      yDomain,
      xDomain,
      xLength:
        xLength ?? (Array.isArray(data) ? data : Object.values(data)[0]).length,
    };
  }, [
    currentIndex,
    currentX,
    data,
    domain,
    isActive,
    yRange?.max,
    yRange?.min,
    xLength,
    xDomain,
  ]);

  useAnimatedReaction(
    () => isActive.value,
    (data: any, prevData: any) => {
      const prevData_ = !!prevData
      if (data !== prevData_ && onActiveChange) {
        runOnJS(onActiveChange)(isActive.value);
      }
    },
    [isActive, onActiveChange]
  );

  useAnimatedReaction(
    () => currentIndex.value,
    (x, prevX) => {
      if (x !== -1 && x !== prevX && onCurrentIndexChange) {
        runOnJS(onCurrentIndexChange)(x);
      }
    },
    [currentIndex, onCurrentIndexChange]
  );

  return (
    <LineChartDataProvider data={data} sData={sData}>
      <LineChartContext.Provider value={contextValue}>
        {children}
      </LineChartContext.Provider>
    </LineChartDataProvider>
  );
}
