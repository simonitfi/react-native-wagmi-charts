import type { Path } from 'react-native-redash';

export function getXPositionForCurve(path: Path, index: number) {
  'worklet';
  if (index === 0) {
    return path.move.x;
  }else if (index > path.curves.length){
    return path.curves[path.curves.length - 1].to.x;
  }
  return path.curves[index - 1].to.x;
}
