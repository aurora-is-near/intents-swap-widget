import { ArrowUpRight, Code, Save } from 'lucide-react';
import { Button, OutlinedButton } from '@aurora-is-near/intents-swap-widget';
import CalyxLogo from '../assets/logo.svg?react';

export function Header() {
  return (
    <header className="backdrop-blur-[20px] backdrop-filter bg-sw-gray-950 rounded-sw-lg w-full flex items-center justify-between px-sw-2xl py-[11px]">
      <aside className="flex gap-[44px] items-center">
        <div className="w-[102px] h-[34px]">
          <CalyxLogo />
        </div>

        <nav className="flex gap-sw-5xl items-center">
          <a href="#" className="flex gap-2.5 items-center justify-center">
            <span className="font-medium text-xs leading-3 tracking-[1px] uppercase text-sw-accent-50 whitespace-nowrap">
              WIDGET STUDIO
            </span>
          </a>
          <a href="#" className="flex gap-sw-md items-center">
            <span className="font-medium text-xs leading-3 tracking-[1px] uppercase text-sw-gray-200 whitespace-nowrap">
              DOCS
            </span>
            <ArrowUpRight className="w-sw-xl h-sw-xl text-sw-gray-200" />
          </a>
        </nav>
      </aside>

      <aside className="flex gap-2.5 items-center">
        <OutlinedButton size="md" fluid>
          <Save className="w-4 h-4" />
          Copy config link
        </OutlinedButton>
        <Button variant="primary" size="md" fluid>
          <Code className="w-4 h-4" />
          Export
        </Button>
      </aside>
    </header>
  );
}
