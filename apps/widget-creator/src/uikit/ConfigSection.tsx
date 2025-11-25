import type { ReactNode } from 'react';

interface ConfigSectionProps {
  title: string;
  children: ReactNode;
}

export function ConfigSection({ title, children }: ConfigSectionProps) {
  return (
    <div className="bg-sw-gray-900 rounded-sw-lg p-sw-2xl ">
      <h3 className="font-semibold text-base leading-4 tracking-[-0.4px] text-sw-gray-50 mb-sw-2xl">
        {title}
      </h3>
      <div className="flex flex-col gap-2.5">{children}</div>
    </div>
  );
}
