// <offset> - user defined offset e.g. page header height + space
// 152px - height of TokenModal elements like search and paddings
// 48px - minimal offset from the bottom screen edge
// Total: 152 + 48 = 200px
// const maxHeight = `calc(100vh - (${topScreenOffset ?? '0px'} + ${offset ?? '0px'} + 200px))`;
export const MAX_LIST_VIEW_AREA_HEIGHT = '450px';
export const LIST_CONTAINER_ID = 'virtual-tokens-list';
export const TOKEN_ITEM_HEIGHT = 58;
