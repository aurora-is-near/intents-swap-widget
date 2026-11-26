import { createContext, useContext } from 'react';

/** Moves focus to the New loan tab; a no-op outside `BorrowTabs`. */
export const TabFocusContext = createContext<() => void>(() => {});

/**
 * For panel content that navigates to New loan: the button it was pressed
 * on unmounts with the panel, so focus goes to the tab, which stays.
 */
export const useFocusTab = () => useContext(TabFocusContext);
