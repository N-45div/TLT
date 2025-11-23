import { ConnectButton } from '@mysten/dapp-kit';

export function Header() {
  return (
    <header className="sticky top-0 z-40 border-b border-neutral-800/80 bg-black/60 backdrop-blur-sm">
      <div className="max-w-6xl mx-auto px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <img 
            src="/tlt-icon.svg" 
            alt="TLT Logo" 
            className="w-9 h-9"
          />
          <div>
            <h1 className="text-sm font-semibold text-neutral-100 tracking-tight">TLT</h1>
            <p className="text-[11px] text-neutral-500">TimeLocked Truth Markets</p>
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
