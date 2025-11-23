import { FC } from 'react';

interface LandingProps {
  onGetStarted: () => void;
}

export const Landing: FC<LandingProps> = ({ onGetStarted }) => {
  return (
    <div className="min-h-screen flex flex-col items-center justify-between bg-gradient-to-b from-[#050816] via-[#050816] to-black text-neutral-100">
      <header className="w-full max-w-6xl px-6 pt-6 flex items-center justify-between text-xs text-neutral-400">
        <div className="inline-flex items-center gap-2 rounded-full border border-neutral-800/80 bg-black/40 px-3 py-1">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
          <span className="uppercase tracking-[0.16em] text-[10px] text-neutral-400">Walrus Haulout 2025</span>
        </div>
        <span className="text-[11px] text-neutral-500 hidden sm:inline">
          Seal-encrypted truth vaults • Walrus + Sui
        </span>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center px-6 text-center">
        <div className="mb-8">
          <img 
            src="/tlt-logo.svg" 
            alt="TLT Logo" 
            className="w-32 h-32 mx-auto mb-4 animate-pulse"
          />
        </div>

        <div className="inline-flex items-center gap-2 rounded-full border border-neutral-800/80 bg-black/40 px-4 py-1 text-[11px] text-neutral-400 mb-6">
          <span className="h-1.5 w-1.5 rounded-full bg-violet-400" />
          <span>Welcome to TLT</span>
        </div>

        <h1 className="text-4xl sm:text-5xl md:text-6xl font-semibold tracking-tight mb-4">
          <span className="block text-neutral-100">TimeLocked Truth</span>
          <span className="block bg-gradient-to-r from-amber-300 via-orange-300 to-yellow-300 bg-clip-text text-transparent">
            Where evidence stays sealed until proven.
          </span>
        </h1>

        <p className="max-w-2xl text-sm sm:text-base text-neutral-400 mb-8">
          Encrypt sensitive evidence with Seal, store it on Walrus, and settle markets on Sui.
          Privacy-preserving prediction markets with time-locked evidence decryption.
        </p>

        <div className="flex flex-col sm:flex-row items-center gap-3">
          <button
            onClick={onGetStarted}
            className="inline-flex items-center justify-center rounded-full bg-white text-black px-6 py-2 text-sm font-medium shadow-[0_0_0_1px_rgba(255,255,255,0.1)] hover:bg-neutral-100 transition-colors"
          >
            Enter app
          </button>
          <a
            href="https://github.com/divijvaidya/truth-markets"
            target="_blank"
            rel="noreferrer"
            className="text-xs text-neutral-400 hover:text-neutral-200"
          >
            View code on GitHub
          </a>
        </div>
      </main>

      <footer className="w-full max-w-6xl px-6 pb-6 flex items-center justify-between text-[11px] text-neutral-500">
        <span>Data Security &amp; Privacy Track • Seal + Walrus + Sui</span>
        <span className="hidden sm:inline">Built by Truth Markets</span>
      </footer>
    </div>
  );
};
