import React, { createContext, useContext, useMemo } from 'react';
import type { ReactNode } from 'react';

import type { TLineChartData, TLineChartDataProp } from './types';

export const DefaultLineChartId = '__LineChartData';

export type LineChartDataContext = {
  data: {
    [key: string]: TLineChartData;
  }
  sData?: {
    [key: string]: TLineChartData;
  }
};

const LineChartDataContext = createContext<LineChartDataContext>({
  data: { [DefaultLineChartId]: [] },
  sData: { [DefaultLineChartId]: [] }
});

export type LineChartDataProviderProps = {
  children: ReactNode;
  data: TLineChartDataProp;
  sData?: TLineChartDataProp;
};

export function LineChartDataProvider({
  children,
  data,
  sData
}: LineChartDataProviderProps) {
  const contextValue = useMemo<LineChartDataContext>(() => {
    let chartData
    let sChartData

    if (Array.isArray(data)) {
      chartData = {
        [DefaultLineChartId]: data,
      };
    } else {
      chartData = data
    }
    if (sData && Array.isArray(sData)) {
      sChartData = {
        [DefaultLineChartId]: sData,
      };
    } else if (sData) {
      sChartData = sData
    }
    return { data: chartData, sData: sChartData };
  }, [data, sData]);

  return (
    <LineChartDataContext.Provider value={contextValue}>
      {children}
    </LineChartDataContext.Provider>
  );
}

const LineChartIdContext = createContext<string | undefined>(undefined);

export function LineChartIdProvider({
  id,
  children,
}: {
  id?: string;
  children: ReactNode;
}) {
  return (
    <LineChartIdContext.Provider value={id}>
      {children}
    </LineChartIdContext.Provider>
  );
}

export const useLineChartId = () => useContext(LineChartIdContext);

export function useLineChartData({ id }: { id?: string }) {
  const dataContext = useContext(LineChartDataContext);

  validateLineChartId(dataContext, id);

  const data = dataContext.data[id || DefaultLineChartId];
  const sData = dataContext?.sData ? dataContext?.sData[id || DefaultLineChartId] : undefined

  return useMemo(() => ({ data, sData }), [data, sData]);
}

function validateLineChartId(dataContext: LineChartDataContext, id?: string) {
  if (id != null && !dataContext.data[id]) {
    const otherIds = Object.keys(dataContext.data).filter(
      (otherId) => otherId !== DefaultLineChartId
    );
    const singular = otherIds.length <= 1;

    const joinedIds = otherIds.join(', ');

    const suggestion = otherIds.length
      ? `Did you mean to use ${singular ? 'this ID' : 'one of these IDs'
      }: ${joinedIds}`
      : `You didn't pass any IDs to your <LineChart.Provider />'s data prop. Did you mean to pass an array instead?`;

    console.warn(
      `[react-native-wagmi-charts] Invalid usage of "id" prop on LineChart. You passed id="${id}", but this ID does not exist in your <LineChart.Provider />'s "data" prop.

${suggestion}`
    );
  } else if (id == null && !dataContext.data[DefaultLineChartId]) {
    const otherIds = Object.keys(dataContext.data);
    const singular = otherIds.length <= 1;

    const joinedIds = otherIds.join(', ');
    const suggestion = otherIds.length
      ? `Did you mean to use ${singular ? 'this ID' : 'one of these IDs'
      }: ${joinedIds}`
      : `You didn't pass any IDs to your <LineChart.Provider />'s data prop. Did you mean to pass an array instead?`;

    console.error(`[react-native-wagmi-charts] Missing data "id" prop on LineChart. You must pass an id prop to <LineChart /> when using a dictionary for your data.

${suggestion}
    `);
  }
}
