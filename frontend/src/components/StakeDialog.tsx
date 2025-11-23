import { useState } from 'react';
import { useSignAndExecuteTransaction } from '@mysten/dapp-kit';
import { Transaction } from '@mysten/sui/transactions';
import { TrendingUp, TrendingDown, X } from 'lucide-react';
import { toast } from 'sonner';

interface StakeDialogProps {
  claimId: string;
  side: 'yes' | 'no';
}

export function StakeDialog({ claimId, side }: StakeDialogProps) {
  const [amount, setAmount] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const { mutate: signAndExecute } = useSignAndExecuteTransaction();

  const handleStake = () => {
    if (!amount || parseFloat(amount) <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }

    const tx = new Transaction();
    
    // TODO: Call market::stake with actual package ID and claim object
    // Will use claimId when implementing the actual market contract call
    // tx.moveCall({
    //   target: `${PACKAGE_ID}::market::stake`,
    //   arguments: [
    //     tx.object(claimId),
    //     tx.object(marketId),
    //     tx.pure.u64(amount),
    //     tx.pure.bool(side === 'yes'),
    //   ],
    // });
    
    console.log('Staking on claim:', claimId, 'side:', side, 'amount:', amount);

    signAndExecute(
      { transaction: tx as any },
      {
        onSuccess: () => {
          toast.success(`Staked ${amount} SUI on ${side.toUpperCase()}`);
          setAmount('');
          setIsOpen(false);
        },
        onError: (error) => {
          console.error('Stake failed:', error);
          toast.error('Stake failed. See console for details.');
        },
      }
    );
  };

  const Icon = side === 'yes' ? TrendingUp : TrendingDown;
  const bgClass = side === 'yes' 
    ? 'bg-emerald-500/10 hover:bg-emerald-500/20 border-emerald-500/30 text-emerald-400' 
    : 'bg-rose-500/10 hover:bg-rose-500/20 border-rose-500/30 text-rose-400';
  const confirmClass = side === 'yes'
    ? 'bg-emerald-600 hover:bg-emerald-700'
    : 'bg-rose-600 hover:bg-rose-700';

  return (
    <>
      <button
        className={`flex-1 px-4 py-3.5 ${bgClass} rounded-xl font-semibold text-sm transition-all border backdrop-blur-sm flex items-center justify-center gap-2`}
        onClick={() => setIsOpen(true)}
      >
        <Icon className="w-4 h-4" />
        {side.toUpperCase()}
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white shadow-xl border border-neutral-200">
            <div className="flex items-center justify-between border-b border-neutral-100 px-5 py-4">
              <div>
                <h3 className="text-sm font-semibold text-neutral-900">
                  Stake on {side.toUpperCase()}
                </h3>
                <p className="mt-0.5 text-xs text-neutral-500">
                  Enter the amount of SUI to stake
                </p>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="text-neutral-500 hover:text-neutral-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="px-5 py-4">
              <div className="space-y-1">
                <label className="text-xs font-medium text-neutral-600">Amount (SUI)</label>
                <input
                  type="number"
                  placeholder="0.00"
                  step="0.1"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2 text-sm outline-none focus:border-neutral-400 focus:bg-white"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleStake();
                    }
                  }}
                />
              </div>
            </div>

            <div className="flex items-center gap-2 border-t border-neutral-100 px-5 py-4 bg-neutral-50/60 rounded-b-2xl">
              <button
                onClick={() => setIsOpen(false)}
                className="flex-1 px-3 py-1.5 rounded-full border border-neutral-200 text-xs font-medium text-neutral-600 hover:bg-white"
              >
                Cancel
              </button>
              <button
                onClick={handleStake}
                className={`flex-1 px-4 py-1.5 rounded-full ${confirmClass} text-white text-xs font-medium`}
              >
                Confirm stake
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
