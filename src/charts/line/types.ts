import type Animated from 'react-native-reanimated';

export type TLineChartPoint = {
  timestamp: number;
  value: number;
  smoothedValue: number;
};
export type TLineChartDataProp =
  | TLineChartData
  | {
    [key: string]: TLineChartData;
  };
export type TLineChartData = Array<TLineChartPoint>;
export type TLineChartDomain = [number, number];
export type TLineChartContext = {
  currentX: Animated.SharedValue<number>;
  currentIndex: Animated.SharedValue<number>;
  isActive: Animated.SharedValue<boolean>;
  domain: TLineChartDomain;
  yDomain: YDomain;
  xLength: number;
  xDomain?: [number, number] | undefined;
};

export type YRangeProp = {
  min?: number;
  max?: number;
};

export type YDomain = {
  min: number;
  max: number;
};

export type LineChartPath = {
  index: number;
  from: number;
  to: number;
  fromData: number;
  toData: number;
  fromTime?: number;
  toTime?: number;
  totalLength: number;
  data: string;
  meta: {
    pathWidth: number;
    height: number;
    gutter: number;
    yDomain: YDomain;
    xDomain: [number, number] | undefined;
  } | string
};

export type LineChartPathBuffer = Array<LineChartPath>;

export type LineChartArea = {
  index: number;
  from: number;
  to: number;
  fromData: number;
  toData: number;
  fromTime?: number;
  toTime?: number;
  totalLength: number;
  data: string;
  meta: {
    pathWidth: number;
    height: number;
    gutter: number;
    yDomain: YDomain;
  } | string
};

export type LineChartAreaBuffer = Array<LineChartArea>;
