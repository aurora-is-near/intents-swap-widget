import { ArrowBackW700 as ArrowBack } from '@material-symbols-svg/react-rounded/icons/arrow-back';

type Props = {
  title: string;
  onBack?: () => void;
};

export const ScreenHeader = ({ title, onBack }: Props) => (
  <header className="flex items-center gap-sw-md py-sw-md">
    {onBack && (
      <button
        type="button"
        aria-label="Back"
        className="flex items-center justify-center w-sw-4xl h-sw-4xl rounded-sw-md text-sw-gray-100 hover:bg-sw-gray-800 transition-colors cursor-pointer"
        onClick={onBack}>
        <ArrowBack className="w-sw-xl h-sw-xl" />
      </button>
    )}
    <h1 className="text-sw-h5 text-sw-gray-50">{title}</h1>
  </header>
);
