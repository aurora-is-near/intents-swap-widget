import { TokenItem as Item } from './TokenItem';
import { TokensList as List } from './TokensList';
import { TokensListPlaceholder } from './TokensListPlaceholder';

export const TokensList = Object.assign(List, {
  Placeholder: TokensListPlaceholder,
  Item,
});
