export const MAX_LIST_VIEW_AREA_HEIGHT = '450px';
export const LIST_CONTAINER_ID = 'virtual-tokens-list';
export const LIST_SECTION_HEADER_HEIGHT = 62;

// A row is p-sw-lg (12px) top+bottom + two text lines (name 16px + gap-sw-xs 4px
// + sub-line 16px) = 60px. This MUST match the real rendered height: VList uses
// it as the fixed slot size, and any row taller than its slot overlaps the next
// one. Rows are kept to a single, uniform height by truncating both text lines
// in TokenItem (a wrapped sub-line would exceed the slot).
export const TOKEN_ITEM_HEIGHT = 60;
