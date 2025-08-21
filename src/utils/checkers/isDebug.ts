export const isDebug = () => {
  const searchParams = new URLSearchParams(window.location.search);

  return searchParams.get('widget') === 'debug';
};
