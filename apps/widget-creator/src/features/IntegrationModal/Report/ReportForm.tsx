import { useState } from 'react';
import { usePrivy } from '@privy-io/react-auth';
import { CheckCircleFillW700 as CheckCircle } from '@material-symbols-svg/react-rounded/icons/check-circle';
import { DownloadW700 as Download } from '@material-symbols-svg/react-rounded/icons/download';

import { addMonths, getMonthKey, MonthSelect } from './MonthSelect';
import { useDownloadCsvReport } from './hooks';

import { Button } from '@/uikit/Button';

type Props = {
  widgetAppKey: string;
  isAdmin: boolean;
};

export const ReportForm = ({ widgetAppKey, isAdmin }: Props) => {
  const { user } = usePrivy();

  const now = new Date();
  const currentMonthKey = getMonthKey(now);
  const registrationDate = user?.createdAt ?? now;
  const registrationMonthKey = getMonthKey(registrationDate);

  const [fromDate, setFromDate] = useState<string>(registrationMonthKey);
  const [toDate, setToDate] = useState<string>(currentMonthKey);

  const [isAdminReportDownloading, setIsAdminReportDownloading] =
    useState<boolean>(false);

  const [activeShortcut, setActiveShortcut] = useState<string>('All time');
  const { downloadState, downloadCsvReport, resetDownloadState } =
    useDownloadCsvReport({
      widgetAppKey,
    });

  const clamp = (d: string) => (d > currentMonthKey ? currentMonthKey : d);

  const resolveShortcutLabel = (from: string, to: string): string => {
    if (from === to) {
      return '1mo';
    }

    const shortcuts = [
      { label: 'All time', value: currentMonthKey },
      { label: '1mo', value: clamp(addMonths(from, 1)) },
      { label: '3mo', value: clamp(addMonths(from, 3)) },
      { label: '6mo', value: clamp(addMonths(from, 6)) },
      { label: '1y', value: clamp(addMonths(from, 12)) },
    ];

    return shortcuts.find((s) => s.value === to) ? 'All time' : '';
  };

  const handleShortcutChange = (label: string, value: string) => {
    setToDate(value);
    setActiveShortcut(label);
  };

  const handleToDateChange = (value: string) => {
    setToDate(value);
    setActiveShortcut(resolveShortcutLabel(fromDate, value));
  };

  const handleFromChange = (value: string) => {
    setFromDate(value);

    if (toDate < value) {
      setToDate(value);
      setActiveShortcut('1mo');
    } else {
      setActiveShortcut(resolveShortcutLabel(value, toDate));
    }
  };

  const handleDownload = async (isAdminReport: boolean) => {
    if (isAdminReport) {
      setIsAdminReportDownloading(true);
      await downloadCsvReport({
        isAdminReport: true,
      });
    } else {
      setIsAdminReportDownloading(false);
      await downloadCsvReport({
        isAdminReport: false,
        fromMonth: fromDate,
        toMonth: toDate,
      });
    }

    setIsAdminReportDownloading(false);
  };

  const renderCta = () => {
    if (
      (downloadState !== 'loading' && downloadState !== 'success') ||
      isAdminReportDownloading
    ) {
      return (
        <Button
          fluid
          size="sm"
          variant="primary"
          detail="accent"
          className="w-full"
          icon={Download}
          onClick={() => handleDownload(false)}>
          Download CSV report
        </Button>
      );
    }

    if (downloadState === 'loading') {
      return (
        <Button
          fluid
          size="sm"
          variant="outlined"
          state="loading"
          className="w-full"
          icon={Download}>
          Creating report...
        </Button>
      );
    }

    if (downloadState === 'success') {
      return (
        <Button
          fluid
          size="sm"
          variant="primary"
          detail="accent"
          className="w-full !bg-csw-status-success/20 !text-csw-status-success hover:!bg-csw-status-success/30"
          icon={CheckCircle}
          onClick={resetDownloadState}>
          Downloaded successfully
        </Button>
      );
    }
  };

  return (
    <div className="flex flex-col justify-between gap-csw-2xl h-[calc(100%-130px)]">
      <div className="flex flex-col gap-csw-2xl mt-csw-2xl">
        <MonthSelect
          label="From"
          selected={fromDate}
          onChange={handleFromChange}
          firstMonth={registrationDate}
        />

        <MonthSelect
          label="To"
          selected={toDate}
          onChange={handleToDateChange}
          firstMonth={registrationDate}
          minMonth={fromDate}
          showShortcuts
          fromDate={fromDate}
          activeShortcut={activeShortcut}
          onShortcutChange={handleShortcutChange}
        />
      </div>

      <div className="flex items-center gap-csw-2md w-full py-csw-2xl mt-csw-2xl border-t border-csw-gray-900">
        {renderCta()}
        {isAdmin && (
          <Button
            fluid
            size="sm"
            variant="outlined"
            detail="accent"
            icon={Download}
            className="w-full"
            state={
              downloadState === 'loading' && isAdminReportDownloading
                ? 'loading'
                : 'default'
            }
            onClick={() => handleDownload(true)}>
            Download all reports
          </Button>
        )}
      </div>
    </div>
  );
};
