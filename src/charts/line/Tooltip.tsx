import * as React from 'react';

import Animated, {
  useAnimatedStyle,
  useDerivedValue,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { LineChartPriceText, LineChartPriceTextProps } from './PriceText';

import { CursorContext } from './Cursor';
import { LineChartDimensionsContext } from './Chart';
import { Platform, type LayoutChangeEvent, type ViewProps } from 'react-native';
import type { TFormatterFn } from '../candle/types';
import { getYForX } from 'react-native-redash';
import { useLineChart } from './useLineChart';
import { useMemo } from 'react';

export type LineChartTooltipProps = Animated.AnimateProps<ViewProps> & {
  children?: React.ReactNode;
  xGutter?: number;
  yGutter?: number;
  cursorGutter?: number;
  position?: 'top' | 'bottom';
  textProps?: LineChartPriceTextProps;
  textStyle?: LineChartPriceTextProps['style'];
  /**
   * When specified the tooltip is considered static, and will
   * always be rendered at the given index, unless there is interaction
   * with the chart (like interacting with a cursor).
   *
   * @default undefined
   */
  at?: number;
  sAt?: number;
  format?: TFormatterFn<string>;
};

LineChartTooltip.displayName = 'LineChartTooltip';

export function LineChartTooltip({
  children,
  xGutter = 8,
  yGutter = 8,
  cursorGutter = 48,
  position = 'top',
  textProps,
  textStyle,
  at,
  sAt = at,
  format,
  ...props
}: LineChartTooltipProps) {
  const { width, height, parsedPath, isOriginal, isLiveData, update, updateContext } = React.useContext(
    LineChartDimensionsContext
  );
  const { type } = React.useContext(CursorContext);
  const { currentX, currentY, isActive, data, xDomain } = useLineChart();

  const x = useSharedValue(0);
  const elementWidth = useSharedValue(xGutter);
  const elementHeight = useSharedValue(yGutter);
  const elementWidthOriginal = useSharedValue(xGutter);
  const elementHeightOriginal = useSharedValue(yGutter);

  const handleLayout = React.useCallback(
    (event: LayoutChangeEvent) => {
      x.value = event.nativeEvent.layout.x;
      if (isLiveData) {
        if (isOriginal) {
          elementWidthOriginal.value = event.nativeEvent.layout.width;
          elementHeightOriginal.value = event.nativeEvent.layout.height;
        } else {
          elementWidth.value = event.nativeEvent.layout.width;
          elementHeight.value = event.nativeEvent.layout.height;
        }
      } else {
        elementWidthOriginal.value = event.nativeEvent.layout.width;
        elementHeightOriginal.value = event.nativeEvent.layout.height;
        elementWidth.value = event.nativeEvent.layout.width;
        elementHeight.value = event.nativeEvent.layout.height;
      }
    },
    [elementHeight, elementWidth, elementWidthOriginal, elementHeightOriginal, x, isOriginal, isLiveData]
  );

  // When the user set a `at` index, get the index's y & x positions
  const atXPosition = useMemo(
    () => {
      const at_ = isOriginal ? at : sAt
      const result = at_ !== null && at_ !== undefined
        ? at_ === 0
          ? 0
          : parsedPath.curves[Math.min(at_, parsedPath.curves.length) - 1].to.x
        : undefined
      return result
    },
    [at, sAt, parsedPath, isOriginal]
  );

  const atYPosition = useDerivedValue(() => {
    if (atXPosition == null) return undefined
    let val = getYForX(parsedPath, atXPosition)
    if (val === null) {
      let maxPoint = parsedPath.curves.reduce((max, curve) => curve.to.x > max.x ? curve.to : max, parsedPath.curves[0].to);
      val = maxPoint.y;
    }
    return val || 0
  }, [atXPosition]);

  const animatedCursorStyle = useAnimatedStyle(() => {
    if (elementWidth.value === xGutter) {
      elementWidth.value = elementWidthOriginal.value
    }
    if (elementWidthOriginal.value === xGutter) {
      elementWidthOriginal.value = elementWidth.value
    }
    if (elementHeight.value === yGutter) {
      elementHeight.value = elementHeightOriginal.value
    }
    if (elementHeightOriginal.value === yGutter) {
      elementHeightOriginal.value = elementHeight.value
    }

    const ew = ((update !== 0 && !isLiveData) || (isActive.value && isLiveData)) ? elementWidthOriginal.value : elementWidth.value
    const eh = ((update !== 0 && !isLiveData) || (isActive.value && isLiveData)) ? elementHeightOriginal.value : elementHeight.value

    // console.log(ew, elementWidthOriginal.value, elementWidth.value, update)
    let translateXOffset
    // the tooltip is considered static when the user specified an `at` prop 
    const isStatic = atYPosition.value != null;

    // Calculate X position:
    const x = atXPosition ?? currentX.value;

    if (Platform.OS !== 'web'){
      translateXOffset = ew / 2
      if (x < ew / 2 + xGutter) {
        const xOffset = ew / 2 + xGutter - x;
        translateXOffset = translateXOffset - xOffset;
      }
      if (x > width - ew / 2 - xGutter) {
        const xOffset = x - (width - ew / 2 - xGutter);
        translateXOffset = translateXOffset + xOffset;
      }
    }else{
      translateXOffset = ew / 8
      if (x < ew / 8 + xGutter) {
        const xOffset = ew / 8 + xGutter - x;
        translateXOffset = translateXOffset - xOffset;
      }
      if (x > width - ew / 8 - xGutter) {
        const xOffset = x - (width - ew / 8 - xGutter);
        translateXOffset = translateXOffset + xOffset;
      }
    }

    // Calculate Y position:
    let translateYOffset = 0;
    const y = atYPosition.value ?? currentY.value;
    if (position === 'top') {
      translateYOffset = eh / 2 + cursorGutter;
      if (y - translateYOffset < yGutter) {
        translateYOffset = y - yGutter;
      }
    } else if (position === 'bottom') {
      translateYOffset = -(eh / 2) - cursorGutter / 2;
      if (y - translateYOffset + eh > height - yGutter) {
        translateYOffset = y - (height - yGutter) + eh;
      }
    }

    // determine final translateY value
    let translateY: number | undefined;
    if (type === 'crosshair' || isStatic) {
      translateY = y - translateYOffset;
    } else {
      if (position === 'top') {
        translateY = yGutter;
      } else {
        translateY = height - eh - yGutter;
      }
    }

    let opacity = isActive.value ? 1 : 0;
    if (isStatic) {
      // Only show static when there is no active cursor
      if (isActive.value || (updateContext === 0 && !isLiveData))
        opacity = 0;
      else
        opacity = withTiming(1);
    }

    // Set from and to depending on null values on data
    const boundedX = Math.max(0, currentX.value <= width ? (currentX.value) : width);
    const minIndex = data.findIndex((element: { value: null; }) => element.value !== null);
    const maxIndex = minIndex !== 0 || data.findIndex((element: { value: null; }) => element.value === null) === -1 ? data.length - 1 : data.findIndex((element: { value: null; }) => element.value === null) - 1;

    const total = xDomain ? xDomain[1] - xDomain[0] : data.length - 1
    const minVal = xDomain ? data[minIndex].timestamp : minIndex
    const maxVal = xDomain ? data[maxIndex].timestamp : maxIndex
    /*  
      if (!isStatic && !((boundedX / width < (1 / (data.length - 1)) * maxIndex) && (boundedX / width > (1 / (data.length - 1)) * minIndex))) {
        opacity = 0
      }
  */
    if (!isStatic && !(boundedX / width < (1 / (total)) * maxVal) && (boundedX / width > (1 / (total)) * minVal)) {
      opacity = 0
    }


    return {
      transform: [
        { translateX: x - translateXOffset },
        {
          translateY: translateY,
        },
      ],
      opacity: opacity,
    };
  }, [
    isOriginal,
    isLiveData,
    update,
    atXPosition,
    atYPosition.value,
    currentX.value,
    currentY.value,
    cursorGutter,
    elementHeight.value,
    elementWidth.value,
    elementHeightOriginal.value,
    elementWidthOriginal.value,
    height,
    isActive.value,
    position,
    type,
    width,
    xGutter,
    yGutter,
    data
  ]);

  return (
    <Animated.View
      onLayout={handleLayout}
      {...props}
      style={[
        {
          position: 'absolute',
          padding: 4,
          alignSelf: 'flex-start',
        },
        animatedCursorStyle,
        props.style,
      ]}
    >
      {children || (
        <LineChartPriceText index={at} style={[textStyle]} {...textProps} format={format} />
      )}
    </Animated.View>
  );
}
