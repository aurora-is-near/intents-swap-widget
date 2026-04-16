export const getUrlParam = (param: string): string | null => {
  if (typeof window === 'undefined') {
    return null;
  }

  const searchParams = new URLSearchParams(window.location.search);

  return searchParams.get(param);
};

export const getUrlBooleanParam = (param: string): boolean => {
  const value = getUrlParam(param);

  return value === 'true' || value === '1';
};
