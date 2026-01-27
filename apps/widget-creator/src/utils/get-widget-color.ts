export const getWidgetColor = (key: string) => {
  return document.body.style.getPropertyValue(`--c-sw-${key}`);
};
