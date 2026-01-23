import { useTheme } from './useTheme';

export const useIsDarkMode = () => {
  const { colorScheme } = useTheme() ?? {};

  return { isDarkMode: colorScheme === 'dark' };
};
