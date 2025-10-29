import { useEffect } from 'react';

/**
 * A React hook that monitors the DOM for the addition of a div with id "headlessui-portal-root"
 * and adds a specified className to it. It handles both initial presence and dynamic additions.
 *
 * @param {string} portalId - ID of the portal root div.
 * @param {string} className - The class name to add to the portal root div.
 */
export function useAddClassToPortal(portalId: string, className: string) {
  useEffect(() => {
    // Function to add class to the target element if it exists
    const addClassIfExists = () => {
      const portalRoot = document.getElementById(portalId);

      if (portalRoot) {
        portalRoot.classList.add(className);
      }
    };

    // Check immediately on mount
    addClassIfExists();

    // Set up MutationObserver to watch for future additions
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((addedNode) => {
          if (addedNode instanceof HTMLElement && addedNode.id === portalId) {
            addedNode.classList.add(className);
          }
          // Also check descendants if subtree additions occur, though typically it's direct
          else if (addedNode instanceof HTMLElement) {
            const portalInSubtree = addedNode.querySelector(`#${portalId}`);

            if (portalInSubtree) {
              portalInSubtree.classList.add(className);
            }
          }
        });
      });
    });

    // Observe changes to the body (or documentElement if needed)
    observer.observe(document.body, { childList: true, subtree: true });

    // Cleanup observer on unmount
    return () => {
      observer.disconnect();
    };
  }, [className]);
}
