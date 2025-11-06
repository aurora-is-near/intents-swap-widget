import { useContext } from 'react';
import { ThemeContext } from '../theme/ThemeProvider';

export const useTheme = () => {
  const theme = useContext(ThemeContext);

  return theme;
};
