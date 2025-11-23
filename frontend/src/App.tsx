import { useEffect, useState } from 'react';
import { createNetworkConfig, SuiClientProvider, WalletProvider } from '@mysten/dapp-kit';
import { getFullnodeUrl } from '@mysten/sui/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'sonner';
import '@mysten/dapp-kit/dist/index.css';
import { Header } from './components/Header';
import { ClaimList } from './components/ClaimList';
import { CreateClaimDialog } from './components/CreateClaimDialog';
import { Landing } from './components/Landing';

const { networkConfig } = createNetworkConfig({
  testnet: { url: getFullnodeUrl('testnet') },
  mainnet: { url: getFullnodeUrl('mainnet') },
});

const queryClient = new QueryClient();

type View = 'landing' | 'app';

function getInitialView(): View {
  if (typeof window === 'undefined') return 'landing';
  return window.location.pathname === '/app' ? 'app' : 'landing';
}

function App() {
  const [view, setView] = useState<View>(getInitialView);

  useEffect(() => {
    const handler = () => {
      setView(window.location.pathname === '/app' ? 'app' : 'landing');
    };
    window.addEventListener('popstate', handler);
    return () => window.removeEventListener('popstate', handler);
  }, []);

  const goToApp = () => {
    if (view !== 'app') {
      window.history.pushState({}, '', '/app');
      setView('app');
    }
  };

  return (
    <QueryClientProvider client={queryClient}>
      <SuiClientProvider networks={networkConfig} defaultNetwork="testnet">
        <WalletProvider autoConnect>
          <Toaster 
            position="top-right"
            theme="dark"
            toastOptions={{
              style: {
                background: '#18181b',
                border: '1px solid #27272a',
                color: '#fafafa',
              },
            }}
          />
          {view === 'landing' ? (
            <Landing onGetStarted={goToApp} />
          ) : (
            <div className="min-h-screen bg-[radial-gradient(circle_at_top,_#1f2937_0,_#020617_60%)] text-neutral-100">
              <Header />
              <main className="max-w-6xl mx-auto px-6 py-8">
                <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div>
                    <h1 className="text-xl font-semibold tracking-tight text-neutral-50">Truth Markets</h1>
                    <p className="text-xs text-neutral-500">
                      Encrypted evidence markets on Seal, Walrus &amp; Sui.
                    </p>
                  </div>
                  <CreateClaimDialog />
                </div>

                <section className="rounded-2xl border border-neutral-800 bg-black/40 shadow-[0_18px_60px_rgba(0,0,0,0.6)] p-6">
                  <div className="flex items-center justify-between mb-5">
                    <div>
                      <h2 className="text-base font-semibold text-neutral-100">Markets</h2>
                      <p className="text-[11px] text-neutral-600 mt-0.5">
                        Seal-encrypted evidence • Walrus-backed specs
                      </p>
                    </div>
                  </div>
                  <ClaimList />
                </section>
              </main>
            </div>
          )}
        </WalletProvider>
      </SuiClientProvider>
    </QueryClientProvider>
  );
}

export default App;
