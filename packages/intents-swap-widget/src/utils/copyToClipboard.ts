import copy from 'copy-text-to-clipboard';

const isIos = (): boolean => {
  if (typeof navigator === 'undefined') {
    return false;
  }

  // iPadOS 13+ reports itself as a Mac, so touch points are the only tell.
  return (
    /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.userAgent.includes('Mac') && navigator.maxTouchPoints > 1)
  );
};

const writeTextAsync = async (text: string): Promise<boolean> => {
  try {
    await navigator.clipboard.writeText(text);

    return true;
  } catch {
    return false;
  }
};

export const copyToClipboard = async (text: string): Promise<boolean> => {
  if (isIos()) {
    return copy(text) || writeTextAsync(text);
  }

  return (await writeTextAsync(text)) || copy(text);
};
