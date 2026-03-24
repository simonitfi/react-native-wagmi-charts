import * as React from 'react';
import { scheduleOnRN } from 'react-native-worklets';

import Animated, {
  AnimatedProps,
  useAnimatedReaction,
  useAnimatedStyle,
  useDerivedValue,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { LineChartPriceText, LineChartPriceTextProps } from './PriceText';

import { CursorContext } from './Cursor';
import { LineChartDimensionsContext, LineChartDataContext } from './Chart';
import { Platform, type LayoutChangeEvent, type ViewProps } from 'react-native';
import type { TFormatterFn } from '../candle/types';
import { getYForX } from 'react-native-redash';
import { useLineChartShared } from './useLineChart';
import { LineChartPathContext } from './LineChartPathContext';
import { onInternalProfilerRender } from '../../profiler';

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

export const LineChartTooltip = React.memo(function LineChartTooltip({
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
  // Read data-derived values from the centralized dataInfoSV (computed once
  // in Chart.tsx), NOT from useLineChart().data. This means Tooltip does NOT
  // subscribe to the data context and won't re-render on every data tick.
  const { width, height, isLiveData, update, parsedPathSV, dataInfoSV, performanceConfig } = React.useContext(
    LineChartDimensionsContext
  );
  const { isOriginal } = React.useContext(
    LineChartDataContext
  );
  const { type } = React.useContext(CursorContext);
  // useLineChartShared() returns only stable SharedValue refs — no data subscription
  const { currentX, currentY, isActive } = useLineChartShared();
  const { animationDuration } = React.useContext(LineChartPathContext);

  const x = useSharedValue(0);
  const lastIsActive = useSharedValue(false);
  const hasInitialPosition = useSharedValue(false);
  // Mirrors path's allowMorph=false window: snap for 1 second after release
  const snapTooltip = useSharedValue(false);

  const enableTooltipAnim = () => {
    setTimeout(() => { snapTooltip.value = false; }, 1000);
  };

  useAnimatedReaction(
    () => isActive.value,
    (current, previous) => {
      if (previous !== null && current !== previous && !current) {
        snapTooltip.value = true;
        scheduleOnRN(enableTooltipAnim);
      }
    },
    []
  );
  const elementWidth = useSharedValue(60);
  const elementHeight = useSharedValue(yGutter);
  const elementWidthOriginal = useSharedValue(60);
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
  const atXPosition = useDerivedValue(() => {
    const at_ = isOriginal ? at : sAt;
    if (at_ !== null && at_ !== undefined && parsedPathSV.value?.curves?.length) {
      return at_ === 0
        ? 0
        : parsedPathSV.value?.curves?.[Math.min(at_, parsedPathSV.value.curves.length) - 1]?.to?.x ?? 0;
    }
    return undefined;
  }, [at, sAt, parsedPathSV, isOriginal]);


  const atYPosition = useDerivedValue(() => {
    if (atXPosition.value == null) return undefined;
    let val = getYForX(parsedPathSV.value, atXPosition.value);
    if (val === null && parsedPathSV.value?.curves?.length) {
      let maxPoint = parsedPathSV.value.curves.reduce((max: {x: number; y: number}, curve) => curve.to.x > max.x ? curve.to : max, parsedPathSV.value.curves[0]!.to);
      val = maxPoint.y;
    }
    return val || 0;
  }, [atXPosition.value]);

  const animatedCursorStyle = useAnimatedStyle(() => {
    // guardTooltipIdle: skip all math when tooltip is invisible
    // (no cursor active AND no static `at` position set)
    if (performanceConfig.guardTooltipIdle && !isActive.value && at == null) {
      return {
        transform: [
          { translateX: 0 },
          { translateY: 0 },
        ],
        opacity: 0,
      };
    }

    if (!dataInfoSV.value.hasData) {
      return {
        transform: [
          { translateX: 0 },
          { translateY: 0 },
        ]
      };
    }

    if (elementWidth.value === 60) {
      elementWidth.value = elementWidthOriginal.value
    }
    if (elementWidthOriginal.value === 60) {
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
    const total = dataInfoSV.value.total;
    const minVal = dataInfoSV.value.minVal;
    const maxVal = dataInfoSV.value.maxVal;
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
      if (parsedPathSV.value?.curves?.length) {
        x = parsedPathSV.value.curves[Math.min(dataInfoSV.value.maxIndex, parsedPathSV.value.curves.length) - 1]?.to?.x ?? 0
        y = getYForX(parsedPathSV.value, x);
        if (y === null) {
          let maxPoint = parsedPathSV.value.curves.reduce((max: {x: number; y: number}, curve) => curve.to.x > max.x ? curve.to : max, parsedPathSV.value.curves[0]!.to);
          y = maxPoint.y;
        }
      } else {
        x = 0;
        y = 0;
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
      if (isActive.value)
        opacity = 0;
      else
        opacity = withTiming(1);
    }

    const lastIsActive_ = lastIsActive.value
    lastIsActive.value = isActive.value

    // Korjaa ekalla latauksella näitä arvoja lähemmäksi oikeita
    if (translateXOffset <= 1 && isLiveData) translateXOffset = 24
    if (translateYOffset === cursorGutter && isStatic) translateY = translateY - 10

    // Skip withTiming on first positioned render to prevent tooltip flying in from (0,0)
    const skipAnimation = !hasInitialPosition.value;
    hasInitialPosition.value = true;

    //translateXOffset/1.5 korjataan tooltipin kohtaa hieman oikealle
    return {
      transform: [
        {
          translateX: isActive.value ? x - translateXOffset / 1.5 : (lastIsActive_ || translateXOffset <= 1 || skipAnimation || snapTooltip.value) ? x - translateXOffset : withTiming(x - translateXOffset, { duration: animationDuration })
        },
        //+10 jos stattisia pisteitä
        {
          translateY: isActive.value ? translateY : (lastIsActive_ || (translateYOffset === cursorGutter && isStatic) || skipAnimation || snapTooltip.value) ? translateY + 10 : withTiming(translateY + 10, { duration: animationDuration }),
        },
      ],
      opacity: opacity,
    };
  }, [
    isLiveData,
    update,
    cursorGutter,
    height,
    position,
    type,
    width,
    xGutter,
    yGutter,
    animationDuration,
  ]);

  const index = useDerivedValue(() => {
    if (at !== undefined) return at;
    if (isActive.value && dataInfoSV.value.hasXDomain) {
      const relativeX = (currentX.value / width) * dataInfoSV.value.total;
      return dataInfoSV.value.maxIndex && relativeX > dataInfoSV.value.maxVal ? dataInfoSV.value.maxIndex : undefined
    }
    return dataInfoSV.value.maxIndex;
  }, [at, width]);

  return (
    <React.Profiler id={`LineChartTooltip-at${at ?? 'cursor'}`} onRender={onInternalProfilerRender}>
      <Animated.View
        onLayout={handleLayout}
        {...props}
        style={[
          {
            position: 'absolute',
            padding: 0,
            margin: 0,
            alignSelf: 'flex-start',
          },
          animatedCursorStyle,
          props.style,
        ]}
      >
        {children || null}
        <LineChartPriceText index={index} style={[{ padding: 0, margin: 0 }, textStyle]} {...textProps} format={format} />
      </Animated.View>
    </React.Profiler>
  );
});
LineChartTooltip.displayName = 'LineChartTooltip';
