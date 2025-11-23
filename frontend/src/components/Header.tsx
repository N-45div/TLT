import { ConnectButton } from '@mysten/dapp-kit';
import { Scale } from 'lucide-react';

export function Header() {
  return (
    <header className="sticky top-0 z-40 border-b border-neutral-800/80 bg-black/60 backdrop-blur-sm">
      <div className="max-w-6xl mx-auto px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-600 to-sky-500 flex items-center justify-center shadow-[0_0_0_1px_rgba(255,255,255,0.06)]">
            <Scale className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-sm font-semibold text-neutral-100 tracking-tight">Truth Markets</h1>
            <p className="text-[11px] text-neutral-500">Seal-encrypted truth vaults on Walrus &amp; Sui</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <span className="hidden sm:inline-flex items-center gap-1.5 rounded-full border border-neutral-800/80 bg-black/50 px-2.5 py-1 text-[10px] text-neutral-400">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
            <span>Data Security &amp; Privacy Track</span>
          </span>
          <ConnectButton />
        </div>
      </div>
    </header>
  );
}
