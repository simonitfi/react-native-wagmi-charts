import {
  useAnimatedProps,
  useAnimatedReaction,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import {SharedValue} from "react-native-reanimated/lib/types/lib";
import { interpolatePath } from './utils';
import { usePrevious } from '../../utils';

export default function useAnimatedPath({
  enabled = true,
  path,
  smoothedPath,
  isActive
}: {
  enabled?: boolean;
  path: string;
  smoothedPath: string;
  isActive: SharedValue<boolean>;
}) {
  const transition = useSharedValue(0);

  const currentPath = useSharedValue(smoothedPath);
  const previousPath = smoothedPath;

  useAnimatedReaction(
    () => {
      currentPath.value = isActive.value ? path: smoothedPath;
      return currentPath.value;
    },
    (result, previous) => {
      if (result !== previous) {
        transition.value = 0;
        transition.value = withTiming(1);
      }
    },
    [path, smoothedPath, isActive]
  );

  const animatedProps = useAnimatedProps(() => {
    let d = currentPath.value || '';
    if (previousPath && enabled) {
      const pathInterpolator = interpolatePath(previousPath, currentPath.value, null);
      d = pathInterpolator(transition.value);
    }
    return {
      d,
    };
  });

  return { animatedProps };
}
