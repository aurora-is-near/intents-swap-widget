import { ArrowBackW700 as ArrowBack } from '@material-symbols-svg/react-rounded/icons/arrow-back';

type Props = {
  onClickBack: () => void;
  title: string;
};

export const NestedHeader = ({ onClickBack, title }: Props) => (
  <div className="px-csw-2xl pt-csw-2xl pb-csw-4xl flex items-start justify-between gap-csw-lg border-b border-csw-gray-900 w-full sm:block hidden">
    <div className="flex items-center gap-csw-xl pt-csw-md sm:max-w-[80%] max-w-full">
      <button onClick={onClickBack} className="cursor-pointer">
        <ArrowBack size={16} className="text-csw-gray-50" />
      </button>
      <h2 className="text-csw-label-lg text-csw-gray-50">{title}</h2>
    </div>
  </div>
);
