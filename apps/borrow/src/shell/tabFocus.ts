import { createContext, useContext } from 'react';

/** The paths the Borrow tabs stand for. */
export type TabPath = '/' | '/positions';

/** Moves focus to a Borrow tab; a no-op outside `BorrowTabs`. */
export type FocusTab = (path: TabPath) => void;

export const TabFocusContext = createContext<FocusTab>(() => {});

/**
 * For panel content that navigates to another tab: the button it was
 * pressed on unmounts with the panel, so focus goes to the tab, which stays.
 */
export const useFocusTab = () => useContext(TabFocusContext);
