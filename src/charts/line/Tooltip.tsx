import * as React from 'react';

import Animated, {
  AnimatedProps,
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
import { LineChartPathContext } from 'react-native-wagmi-charts/src/charts/line/LineChartPathContext';

export type LineChartTooltipProps = AnimatedProps<ViewProps> & {
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
  const { animationDuration, isMounted } = React.useContext(LineChartPathContext);

  const x = useSharedValue(0);
  const lastIsActive = useSharedValue(false);
  const elementWidth = useSharedValue(xGutter);
  const elementHeight = useSharedValue(yGutter);
  const elementWidthOriginal = useSharedValue(xGutter);
  const elementHeightOriginal = useSharedValue(yGutter);

  const { minIndex, maxIndex } = React.useMemo(() => {
    const minIndex = data.findIndex((element: { value: null }) => element.value !== null);
    const maxIndex =
      minIndex !== 0 || data.findIndex((element: { value: null }) => element.value === null) === -1
        ? data.length - 1
        : data.findIndex((element: { value: null }) => element.value === null) - 1;

    return { minIndex, maxIndex };
  }, [data]);

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
  const atXPosition = useDerivedValue(() => {
    const at_ = isOriginal ? at : sAt;
    if (at_ !== null && at_ !== undefined) {
      return at_ === 0
        ? 0
        : parsedPath.curves[Math.min(at_, parsedPath.curves.length) - 1].to.x;
    }
    return undefined;
  }, [at, sAt, parsedPath.curves, isOriginal]);


  const atYPosition = useDerivedValue(() => {
    if (atXPosition.value == null) return undefined;
    let val = getYForX(parsedPath, atXPosition.value);
    if (val === null) {
      let maxPoint = parsedPath.curves.reduce((max, curve) => curve.to.x > max.x ? curve.to : max, parsedPath.curves[0].to);
      val = maxPoint.y;
    }
    return val || 0;
  }, [atXPosition.value]);

  const animatedCursorStyle = useAnimatedStyle(() => {
    if (!data) {
      return {
        transform: [
          { translateX: 0 },
          { translateY: 0 },
        ]
      };
    }

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

    const ew = ((update !== 0 && !isLiveData) || (!isActive.value && isLiveData && Platform.OS === 'android')) ? elementWidthOriginal.value : elementWidth.value
    const eh = ((update !== 0 && !isLiveData) || (!isActive.value && isLiveData)) ? elementHeightOriginal.value : elementHeight.value

    // console.log(ew, elementWidthOriginal.value, elementWidth.value, update)
    let translateXOffset = elementWidth.value / 2;
    let translateYOffset = 0;
    let translateY: number | undefined;

    // the tooltip is considered static when the user specified an `at` prop 
    let isStatic = atYPosition.value != null;

    // Set from and to depending on null values on data
    const boundedX = Math.max(0, currentX.value <= width ? (currentX.value) : width);
    const total = xDomain ? xDomain[1] - xDomain[0] : data.length - 1
    const minVal = xDomain ? data[minIndex].timestamp : minIndex
    const maxVal = xDomain ? data[maxIndex].timestamp : maxIndex
    /*  
      if (!isStatic && !((boundedX / width < (1 / (data.length - 1)) * maxIndex) && (boundedX / width > (1 / (data.length - 1)) * minIndex))) {
        opacity = 0
      }
  */
    // Calculate X position:
    let x
    let y

    if (!isStatic && !(boundedX / width < (1 / (total)) * maxVal) && (boundedX / width > (1 / (total)) * minVal)) {
      //opacity = 0
      x = parsedPath.curves[Math.min(maxIndex, parsedPath.curves.length) - 1].to.x
      y = getYForX(parsedPath, x);
      if (y === null) {
        let maxPoint = parsedPath.curves.reduce((max, curve) => curve.to.x > max.x ? curve.to : max, parsedPath.curves[0].to);
        y = maxPoint.y;
      }
    } else {
      x = atXPosition.value ?? currentX.value;
      y = atYPosition.value ?? currentY.value;
    }

    if (!isActive.value) {
      if (Platform.OS !== 'web') {
        translateXOffset = ew / 2
        if (x < ew / 2 + xGutter) {
          const xOffset = ew / 2 + xGutter - x;
          translateXOffset = translateXOffset - xOffset;
        }
        if (x > width - ew / 2 - xGutter) {
          const xOffset = x - (width - ew / 2 - xGutter);
          translateXOffset = translateXOffset + xOffset;
        }
      } else {
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
      if (type === 'crosshair' || isStatic) {
        translateY = y - translateYOffset;
      } else {
        if (position === 'top') {
          translateY = yGutter;
        } else {
          translateY = height - eh - yGutter;
        }
      }
    } else {

      // Calculate X position:
      if (x < elementWidth.value / 2 + xGutter) {
        const xOffset = elementWidth.value / 2 + xGutter - x;
        translateXOffset = translateXOffset - xOffset;
      }
      if (x > width - elementWidth.value / 2 - xGutter) {
        const xOffset = x - (width - elementWidth.value / 2 - xGutter);
        translateXOffset = translateXOffset + xOffset;
      }

      // Calculate Y position:
      if (position === 'top') {
        translateYOffset = elementHeight.value / 2 + cursorGutter;
        if (y - translateYOffset < yGutter) {
          translateYOffset = y - yGutter;
        }
      } else if (position === 'bottom') {
        translateYOffset = -(elementHeight.value / 2) - cursorGutter / 2;
        if (y - translateYOffset + elementHeight.value > height - yGutter) {
          translateYOffset = y - (height - yGutter) + elementHeight.value;
        }
      }

      // determine final translateY value
      if (type === 'crosshair' || isStatic) {
        translateY = y - translateYOffset;
      } else {
        if (position === 'top') {
          translateY = yGutter;
        } else {
          translateY = height - elementHeight.value - yGutter;
        }
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

    const lastIsActive_ = lastIsActive.value
    lastIsActive.value = isActive.value

    // Korjaa ekalla latauksella näitä arvoja lähemmäksi oikeita
    if (translateXOffset <= 1 && isLiveData) translateXOffset = 24
    if (translateYOffset === cursorGutter && isStatic) translateY = translateY - 10
    //translateXOffset/1.5 korjataan tooltipin kohtaa hieman oikealle
    return {
      transform: [
        {
          translateX: isActive.value ? x - translateXOffset / 1.5 : lastIsActive_ || translateXOffset <= 1 ? x - translateXOffset : withTiming(x - translateXOffset, { duration: animationDuration })
        },
        //+10 jos stattisia pisteitä
        {
          translateY: isActive.value ? translateY : lastIsActive_ || (translateYOffset === cursorGutter && isStatic) ? translateY + 10 : withTiming(translateY + 10, { duration: animationDuration }),
        },
      ],
      opacity: opacity,
    };
  }, [
    isOriginal,
    isLiveData,
    update,
    atXPosition.value,
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
    data,
    animationDuration,
    maxIndex
  ]);

  const index = at ?? (isActive.value && data[maxIndex].timestamp !== Math.round(xDomain[1] / 1000) * 1000 ? maxIndex : undefined)

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
      {children || null}
      <LineChartPriceText index={index} style={[textStyle]} {...textProps} format={format} />
    </Animated.View>
  );
}
