import { useCallback, useEffect, useRef, useState } from 'react';
import { usePrivy } from '@privy-io/react-auth';

import { feeServiceClient } from '@/api/network';

export type DownloadState = 'idle' | 'loading' | 'success';

type DownloadCsvParams =
  | {
      isAdminReport: false;
      fromMonth: string;
      toMonth: string;
    }
  | { isAdminReport: true; fromMonth?: never; toMonth?: never };

type UseDownloadCsvReportParams = {
  widgetAppKey: string;
  resetDelayMs?: number;
};

const toMonthStartIso = (monthKey: string): string =>
  `${monthKey}T00:00:00.000Z`;

const toMonthEndIso = (monthKey: string): string => {
  const date = new Date(`${monthKey}T00:00:00.000Z`);

  date.setUTCMonth(date.getUTCMonth() + 1);
  date.setUTCMilliseconds(-1);

  return date.toISOString();
};

const getFileNameFromDisposition = (disposition?: string): string | null => {
  if (!disposition) {
    return null;
  }

  const utf8Match = disposition.match(/filename\*=UTF-8''([^;]+)/i);

  if (utf8Match?.[1]) {
    return decodeURIComponent(utf8Match[1]);
  }

  const plainMatch = disposition.match(/filename="?([^"]+)"?/i);

  return plainMatch?.[1] ?? null;
};

const triggerCsvDownload = (payload: BlobPart, fileName: string): void => {
  const blob = new Blob([payload], {
    type: 'text/csv;charset=utf-8',
  });

  const downloadUrl = window.URL.createObjectURL(blob);
  const anchor = document.createElement('a');

  anchor.href = downloadUrl;
  anchor.download = fileName;

  document.body.appendChild(anchor);

  anchor.click();

  document.body.removeChild(anchor);
  window.URL.revokeObjectURL(downloadUrl);
};

export const useDownloadCsvReport = ({
  widgetAppKey,
  resetDelayMs = 2000,
}: UseDownloadCsvReportParams) => {
  const { getAccessToken } = usePrivy();
  const [downloadState, setDownloadState] = useState<DownloadState>('idle');
  const resetTimerRef = useRef<number | null>(null);

  const resetDownloadState = useCallback(() => {
    setDownloadState('idle');
  }, []);

  useEffect(
    () => () => {
      if (resetTimerRef.current) {
        window.clearTimeout(resetTimerRef.current);
      }
    },
    [],
  );

  const downloadCsvReport = useCallback(
    async (params: DownloadCsvParams) => {
      try {
        setDownloadState('loading');

        const authToken = await getAccessToken();

        if (!authToken) {
          throw new Error('Authorization token is required');
        }

        const from = params.isAdminReport
          ? undefined
          : toMonthStartIso(params.fromMonth);

        const to = params.isAdminReport
          ? undefined
          : toMonthEndIso(params.toMonth);

        const response = await feeServiceClient.get(
          `/report${params.isAdminReport ? '-admin' : ''}`,
          {
            headers: {
              Authorization: authToken,
            },
            responseType: 'blob',
            params: params.isAdminReport
              ? undefined
              : {
                  from,
                  to,
                },
          },
        );

        const fileName =
          getFileNameFromDisposition(response.headers['content-disposition']) ??
          (params.isAdminReport
            ? 'transaction-report-admin.zip'
            : `transaction-report-${from}-${to}.zip`);

        triggerCsvDownload(response.data, fileName);

        setDownloadState('success');
        resetTimerRef.current = window.setTimeout(() => {
          setDownloadState('idle');
        }, resetDelayMs);
      } catch {
        setDownloadState('idle');
      }
    },
    [getAccessToken, resetDelayMs, widgetAppKey],
  );

  return {
    downloadState,
    downloadCsvReport,
    resetDownloadState,
  };
};
