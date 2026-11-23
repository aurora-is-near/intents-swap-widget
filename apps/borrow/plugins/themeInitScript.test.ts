import { getThemeInitScript } from '@aurora-is-near/ui-kit';
import { describe, expect, it } from 'vitest';

import { THEME_STORAGE_KEY } from '../src/theme';
import { themeInitScriptTags } from './themeInitScript';

describe('themeInitScriptTags', () => {
  it("puts the kit's init script for the given key first in <head>", () => {
    expect(themeInitScriptTags(THEME_STORAGE_KEY)).toEqual([
      {
        tag: 'script',
        children: getThemeInitScript(THEME_STORAGE_KEY),
        injectTo: 'head-prepend',
      },
    ]);
  });

  it('reads the same key the app stores the theme under', () => {
    const [tag] = themeInitScriptTags(THEME_STORAGE_KEY);

    expect(tag?.children).toContain(JSON.stringify(THEME_STORAGE_KEY));
  });
});
