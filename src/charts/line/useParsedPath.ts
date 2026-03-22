import * as React from 'react';
import { scheduleOnRN } from 'react-native-worklets';
import {
  SharedValue,
  useAnimatedReaction,
  useSharedValue,
} from 'react-native-reanimated';
import { addPath, appendCurveBumpXSegment, findPathIndex, getPath } from './utils';
import { useLineChart } from './useLineChart';
import { parse, Path } from 'react-native-redash';
import { LineChartPathBuffer } from './types';
// @ts-ignore
import * as d3Shape from 'd3-shape';

const EMPTY_PATH: Path = { curves: [], move: { x: 0, y: 0 }, close: false };


export default function useParsedPath({
  yGutter = 8,
  id,
  isActive,
  pathWidth,
  height,
  shape,
  isLiveData,
  update,
  pathBuffer,
}: {
  yGutter?: number;
  id: string | undefined;
  isActive: SharedValue<boolean>;
  width: number;
  height: number;
  shape?: unknown;
  update?: number;
  pathWidth: number;
  pathBuffer: React.RefObject<LineChartPathBuffer>;
  /**
   * If your `LineChart.Provider` uses a dictionary with multiple IDs for multiple paths, then this field is required.
   */
  absolute?: boolean;
  isLiveData?: boolean;
}) {

  const { data, sData, yDomain, xDomain } = useLineChart(id);

  const [isOriginal, setIsOriginal] = React.useState(false);

  const parsedPathSV = useSharedValue<Path>(EMPTY_PATH);

  const smoothData = React.useMemo(() => (sData || data), [sData, data]);

  // Cache used for O(1) incremental path extension on live charts.
  // Keyed by (dataLength, yDomain, xDomain) — reset whenever a full recompute
  // runs. xDomain is included so that a scale change (rare with xDomainQuantize)
  // forces a full recompute rather than mixing coordinates from two different
  // x-scales in the same path.
  const liveCacheRef = React.useRef<{
    dataLength: number;
    yDominMin: number;
    yDomainMax: number;
    xDomainMin: number;
    xDomainMax: number;
    path: string;
    parsedPath: Path;
  } | null>(null);

  // Combined memo: computes both the path string AND its parsed representation
  // in one pass, avoiding a redundant parse() call when using the incremental
  // fast path.
  const { smoothedPath, smoothedParsedPath } = React.useMemo(() => {
    const empty = { smoothedPath: '', smoothedParsedPath: EMPTY_PATH };
    try {
      if (!smoothData || smoothData.length < 2 ||
          typeof smoothData[0] === 'undefined' ||
          typeof smoothData[smoothData.length - 1].smoothedValue === 'undefined') {
        return empty;
      }

      // ── Fast incremental extension (O(1)) ──────────────────────────────────
      // Only valid when:
      //  1. xDomain is provided (fixed x-scale; without it the domain [0,n-1]
      //     shifts every tick and all previous x-coordinates become stale)
      //  2. shape is curveBumpX (each segment depends only on its own endpoints)
      //  3. yDomain is unchanged (y-scale stable)
      //  4. xDomain is unchanged (mixing coordinates from two scales is incorrect)
      //  5. Exactly one point was added at the tail
      const cache = liveCacheRef.current;
      if (
        isLiveData &&
        xDomain !== undefined &&
        shape === d3Shape.curveBumpX &&
        cache !== null &&
        smoothData.length === cache.dataLength + 1 &&
        yDomain.min === cache.yDominMin &&
        yDomain.max === cache.yDomainMax &&
        xDomain[0] === cache.xDomainMin &&
        xDomain[1] === cache.xDomainMax
      ) {
        const { path: newPath, newCurve } = appendCurveBumpXSegment({
          basePath: cache.path,
          prevIndex: cache.dataLength - 1,
          newIndex: cache.dataLength,
          data: smoothData,
          width: pathWidth,
          height,
          gutter: yGutter,
          yDomain,
          xDomain,
          isOriginalData: false,
        });

        // Extend parsed path without calling parse() again.
        const newParsedPath: Path = {
          move: cache.parsedPath.move,
          curves: [...cache.parsedPath.curves, newCurve],
          close: cache.parsedPath.close,
        };

        liveCacheRef.current = {
          dataLength: smoothData.length,
          yDominMin: yDomain.min,
          yDomainMax: yDomain.max,
          xDomainMin: xDomain[0],
          xDomainMax: xDomain[1],
          path: newPath,
          parsedPath: newParsedPath,
        };

        // Also add to pathBuffer so useAnimatedPath can find it via buffer
        // lookup instead of doing a full O(n) getPath() recomputation.
        addPath({
          from: 0, to: smoothData.length - 1,
          fromData: smoothData[0].smoothedValue,
          toData: smoothData[smoothData.length - 1].smoothedValue,
          fromTime: smoothData[0].timestamp,
          toTime: smoothData[smoothData.length - 1].timestamp,
          timeTolerance: 0,
          totalLength: smoothData.length, data: newPath,
          meta: {
            pathWidth: pathWidth,
            height: height,
            gutter: yGutter,
            yDomain,
            xDomain
          }
        }, pathBuffer.current);

        return { smoothedPath: newPath, smoothedParsedPath: newParsedPath };
      }

      // ── Full recomputation (O(n)) ──────────────────────────────────────────
      const bPathIndex = findPathIndex({
        from: 0, to: smoothData.length - 1,
        fromData: smoothData[0].smoothedValue,
        toData: smoothData[smoothData.length - 1].smoothedValue,
        fromTime: smoothData[0].timestamp,
        toTime: smoothData[smoothData.length - 1].timestamp,
        timeTolerance: 0,
        totalLength: smoothData.length, data: '',
        meta: {
          pathWidth: pathWidth,
          height: height,
          gutter: yGutter,
          yDomain,
          xDomain
        }
      }, pathBuffer.current);

      if (bPathIndex > -1) {
        const res = pathBuffer.current[bPathIndex].data;
        const parsed = parse(res) ?? EMPTY_PATH;
        if (isLiveData) {
          liveCacheRef.current = {
            dataLength: smoothData.length,
            yDominMin: yDomain.min,
            yDomainMax: yDomain.max,
            xDomainMin: xDomain?.[0] ?? -1,
            xDomainMax: xDomain?.[1] ?? -1,
            path: res,
            parsedPath: parsed,
          };
        }
        return { smoothedPath: res, smoothedParsedPath: parsed };
      }

      const result = getPath({
        data: smoothData,
        width: pathWidth,
        height,
        gutter: yGutter,
        shape,
        yDomain,
        xDomain,
        isOriginalData: false,
      });

      if (
        typeof smoothData[smoothData.length - 1].smoothedValue === 'number' &&
        typeof smoothData[0].smoothedValue === 'number'
      ) {
        addPath({
          from: 0, to: smoothData.length - 1,
          fromData: smoothData[0].smoothedValue,
          toData: smoothData[smoothData.length - 1].smoothedValue,
          fromTime: smoothData[0].timestamp,
          toTime: smoothData[smoothData.length - 1].timestamp,
          timeTolerance: 0,
          totalLength: smoothData.length, data: result,
          meta: {
            pathWidth: pathWidth,
            height: height,
            gutter: yGutter,
            yDomain,
            xDomain
          }
        }, pathBuffer.current);
      }

      const parsed = parse(result) ?? EMPTY_PATH;

      if (isLiveData) {
        liveCacheRef.current = {
          dataLength: smoothData.length,
          yDominMin: yDomain.min,
          yDomainMax: yDomain.max,
          xDomainMin: xDomain?.[0] ?? -1,
          xDomainMax: xDomain?.[1] ?? -1,
          path: result,
          parsedPath: parsed,
        };
      }

      return { smoothedPath: result, smoothedParsedPath: parsed };
    } catch (error) {
      if (error instanceof TypeError) {
        return empty;
      }
      throw error;
    }
  }, [
    smoothData,
    pathWidth,
    height,
    yGutter,
    shape,
    yDomain,
    xDomain,
    isLiveData,
  ]);

  const path = React.useMemo(() => {
    if (data && data.length > 0) {
      if (!isOriginal) return smoothedPath
      const p = getPath({
        data,
        width: pathWidth,
        height,
        gutter: yGutter,
        shape,
        yDomain,
        xDomain,
        isOriginalData: true,
      })
      return p
    } else {
      return '';
    }
  }, [isOriginal, smoothedPath]);

  const parsedPath = React.useMemo(() => {
    if (isOriginal) {
      const result = parse(path);
      return result ?? EMPTY_PATH;
    }
    return smoothedParsedPath
  }, [isOriginal, path]);

  React.useLayoutEffect(() => {
    parsedPathSV.value = parsedPath;
  }, [parsedPath]);

  React.useEffect(() => {
    if (update !== 0 && !isLiveData) {
      setIsOriginal(true)
    }
  }, [height, yGutter, shape, update, isLiveData]);

  useAnimatedReaction(
    () => {
      if (update === 0 || (!isActive.value && isLiveData)) {
        return false
      } else {
        return true
      }
    },
    (result, previous) => {
      if (result !== previous && previous !== null) {
        scheduleOnRN(setIsOriginal, result)
      }
    },
    [isActive]
  );

  return { parsedPathSV, path: path, isOriginal: isOriginal };
}