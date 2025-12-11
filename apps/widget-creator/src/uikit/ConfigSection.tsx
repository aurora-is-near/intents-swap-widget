import type { ReactNode } from 'react';

interface ConfigSectionProps {
  title: string;
  children: ReactNode;
}

export function ConfigSection({ title, children }: ConfigSectionProps) {
  return (
    <div className="bg-csw-gray-900 rounded-csw-lg p-csw-2xl ">
      <h3 className="font-semibold text-base leading-4 tracking-[-0.4px] text-csw-gray-50 mb-csw-2xl">
        {title}
      </h3>
      <div className="flex flex-col gap-2.5">{children}</div>
    </div>
  );
}
