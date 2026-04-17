import { feeServiceClient } from '../network';

const getParentDomain = (): string | undefined => {
  try {
    if (document.referrer) {
      return new URL(document.referrer).hostname;
    }
  } catch {
    // invalid referrer URL — fall through
  }

  try {
    const ancestor = window.location.ancestorOrigins?.[0];

    if (ancestor) {
      return new URL(ancestor).hostname;
    }
  } catch {
    // ancestorOrigins not available or invalid URL — fall through
  }

  return undefined;
};

export const patchWidgetConfigUsed = async (uuid: string): Promise<void> => {
  const domain = getParentDomain();

  await feeServiceClient.patch(`/widget-config/${uuid}`, {
    lastTimeUsed: new Date().toISOString(),
    ...(domain != null && { domain }),
  });
};
