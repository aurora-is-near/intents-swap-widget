type Props = {
  value?: string;
  placeholder?: string;
  onChange: (value: string) => void;
};

export const FeeJsonInput = ({ value = '', placeholder, onChange }: Props) => (
  <div className="flex-shrink-0">
    <div className="relative overflow-hidden bg-csw-gray-800 rounded-csw-md">
      <textarea
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        spellCheck={false}
        rows={6}
        className="w-[99%] min-h-[200px] bg-transparent text-csw-gray-50 placeholder-csw-gray-300 outline-none resize-y font-mono text-sm leading-[1.5em] p-csw-lg"
      />
    </div>
  </div>
);
