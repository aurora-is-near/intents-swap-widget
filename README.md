# Intents Swap Widget

## Theming

This package uses Tailwind but your app doesn't have to. It exposes CSS
variables to control styling. Each variable and it's corresponding Tailwind
token uses `sw-` prefix so it doesn't conflict with you app's theme and variables.
Here is the full list of CSS files exposed:

- `theme.css` - has list of CSS variable with predefined default theme values
- `theme-text.css` - has text classes to style typography only
- `theme-classes.css` - has utility classes that use theme variables
e.g. `bg-sw-gray-100`, `gap-sw-xs`, `text-mauve-900` etc.
- `styles.css` - complete css file that includes all the above plus all TW
utility classes that are used by the widget

To adjust theme, override CSS variables on your app's side (full list of defined
variable you can find in `src/theme.css` or `dist/theme.css`):

```css
:root {
    /* colors */
    --sw-success-100: #0f0;
    ...

    /* spaces */
    --sw-space-xs: 2px;
    ...

    /* texts */
    .text-sw-label-s {
        ...
    }
}
```

### Your app uses Tailwind

If your app uses Tailwind you just need to load theme variables,
theme utility classes and text styles. So in your app CSS file:

```css
@import 'tailwindcss';

@import '@aurora-is-near/intents-swap-widget/theme.css';
@import '@aurora-is-near/intents-swap-widget/theme-text.css';
@import '@aurora-is-near/intents-swap-widget/theme-classes.css';

@theme { ... your app's theme here ... }
```

### Your app doesn't use Tailwind

Load the complete set of CSS styles used by the widget. You can still override
variables and text classes on your side to control a theme.

```css
@import '@aurora-is-near/intents-swap-widget/styles.css';
```

## Development

If you want to make changes to the package and make PRs here how you can link
the package to your application locally so you can make changes to the package
and see result in your app:

```bash

# in a package repo
yarn link
yarn build:watch

# in your app
yarn link @aurora-is-near/intents-swap-widget
yarn dev
```

### Contribution

We use semantic release with commitlint. While creating a PR make sure it's
title meets the [requirements](https://github.com/semantic-release/semantic-release?tab=readme-ov-file#how-does-it-work)
as well as commit [messages](https://github.com/conventional-changelog/commitlint).
