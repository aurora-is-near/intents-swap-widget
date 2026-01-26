# React Typescript Code Standard Rules

## General rules

- Respect Prettier config
- Always use arrow functions
- Stick to ESLint rules when writing code e.g. sort imports alphabetically etc.
- Group imports by deep level and add empty lines between those groups
- Do not use `return` in a component that just returns JSX

## Typescript Rules

- Prefer `type` over `interface`
- Never use `any` type, use `unknown` if needed
- Never use inline types if they are objects, always create a separate type definition
- Always import types with a separate line and `type` keyword e.g. `import type { FC } from 'react';`
- Avoid optional type properties as a best practice (use only where appropriate)

## Code Quality Check

To check written code quality use the following commands:

- `yarn lint --fix`
- `yarn typecheck`
- `yarn test:ci`

## Other instructions

- Do not create summary `*.md` files after finish coding
