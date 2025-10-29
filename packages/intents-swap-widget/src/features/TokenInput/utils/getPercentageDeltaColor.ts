export const getPercentageDeltaColor = (num: number) => {
  if (num > 2) {
    return 'success';
  }

  if (num < -2) {
    return 'alert';
  }

  return 'gray';
};
