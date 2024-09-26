import React from 'react';

export const LineChartPathContext = React.createContext({
  color: '',
  isInactive: false,
  isTransitionEnabled: true,
  animationDuration: 300,
  isMounted: false
});
