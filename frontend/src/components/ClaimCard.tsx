import { useState } from 'react';
import { Calendar, Clock, TrendingUp, TrendingDown } from 'lucide-react';
import { StakeDialog } from './StakeDialog';

interface Claim {
  id: string;
  description: string;
  creator: string;
  deadline: Date;
  yesStake: number;
  noStake: number;
  status: 'open' | 'resolved';
  specBlobId: string;
  result?: boolean;
}

interface ClaimCardProps {
  claim: Claim;
}

export function ClaimCard({ claim }: ClaimCardProps) {
  const [activeTab, setActiveTab] = useState<'buy' | 'sell'>('buy');
  
  const totalStake = claim.yesStake + claim.noStake;
  const yesPercent = totalStake > 0 ? (claim.yesStake / totalStake) * 100 : 50;
  const noPercent = totalStake > 0 ? (claim.noStake / totalStake) * 100 : 50;
  
  const now = new Date();
  const timeLeft = claim.deadline.getTime() - now.getTime();
  const daysLeft = Math.floor(timeLeft / (1000 * 60 * 60 * 24));
  const hoursLeft = Math.floor((timeLeft % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

  const yesPrice = totalStake > 0 ? (yesPercent / 100).toFixed(2) : '0.50';
  const noPrice = totalStake > 0 ? (noPercent / 100).toFixed(2) : '0.50';

  return (
    <div className="group rounded-2xl border border-neutral-800/60 bg-gradient-to-br from-neutral-900/90 to-black/50 hover:border-neutral-700/80 transition-all duration-300 overflow-hidden backdrop-blur-sm">
      {/* Header with Question */}
      <div className="p-6 pb-4">
        <div className="flex items-start justify-between gap-3 mb-3">
          <h3 className="text-base font-medium text-neutral-50 leading-snug group-hover:text-white transition-colors">
            {claim.description}
          </h3>
          {claim.status === 'resolved' && (
            <span className={`shrink-0 px-2.5 py-0.5 text-[10px] font-semibold rounded-full uppercase tracking-wide ${
              claim.result 
                ? 'bg-emerald-500/20 text-emerald-400 ring-1 ring-emerald-500/30' 
                : 'bg-rose-500/20 text-rose-400 ring-1 ring-rose-500/30'
            }`}>
              {claim.result ? 'YES' : 'NO'}
            </span>
          )}
        </div>
        
        <div className="flex items-center gap-4 text-[11px] text-neutral-500">
          <div className="flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5" />
            <span>{claim.deadline.toLocaleDateString()}</span>
          </div>
          {claim.status === 'open' && (
            <div className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5" />
              <span>
                {daysLeft > 0 ? `${daysLeft}d ` : ''}{hoursLeft}h left
              </span>
            </div>
          )}
          <div className="ml-auto text-neutral-600">
            {totalStake.toLocaleString()} SUI volume
          </div>
        </div>
      </div>

      {/* Large Probability Display */}
      <div className="px-6 pb-4">
        <div className="flex items-baseline gap-2">
          <span className="text-[11px] uppercase tracking-wider text-neutral-500 font-medium">
            YES
          </span>
          <span className="text-4xl font-bold bg-gradient-to-br from-emerald-400 to-emerald-500 bg-clip-text text-transparent">
            {yesPercent.toFixed(0)}%
          </span>
          <span className="text-sm text-emerald-500/60">
            chance
          </span>
          <span className="text-[10px] text-emerald-500/40 ml-1">
            {yesPercent > 50 ? '↑' : yesPercent < 50 ? '↓' : '→'} {Math.abs(yesPercent - 50).toFixed(0)}
          </span>
        </div>
      </div>

      {/* Simplified Chart Visualization */}
      <div className="px-6 pb-5">
        <div className="h-16 flex items-end gap-1">
          {[...Array(20)].map((_, i) => {
            const height = 30 + Math.random() * 70;
            const isRecent = i >= 15;
            return (
              <div 
                key={i} 
                className={`flex-1 rounded-t transition-all ${
                  isRecent ? 'bg-emerald-500/40' : 'bg-emerald-500/20'
                }`}
                style={{ height: `${height}%` }}
              />
            );
          })}
        </div>
        <div className="mt-2 flex justify-between text-[9px] text-neutral-600 uppercase tracking-wide">
          <span>1H</span>
          <span>6H</span>
          <span>1D</span>
          <span className="text-emerald-500/60 font-medium">ALL</span>
        </div>
      </div>

      {/* Buy/Sell Tabs */}
      {claim.status === 'open' && (
        <div className="px-6 pb-4">
          <div className="flex gap-1 bg-neutral-900/80 rounded-lg p-1 mb-4">
            <button
              onClick={() => setActiveTab('buy')}
              className={`flex-1 py-2 rounded-md text-xs font-medium transition-all ${
                activeTab === 'buy'
                  ? 'bg-neutral-800 text-neutral-50 shadow-sm'
                  : 'text-neutral-500 hover:text-neutral-400'
              }`}
            >
              Buy
            </button>
            <button
              onClick={() => setActiveTab('sell')}
              className={`flex-1 py-2 rounded-md text-xs font-medium transition-all ${
                activeTab === 'sell'
                  ? 'bg-neutral-800 text-neutral-50 shadow-sm'
                  : 'text-neutral-500 hover:text-neutral-400'
              }`}
            >
              Sell
            </button>
          </div>

          {/* Outcome Buttons - Polymarket Style */}
          <div className="grid grid-cols-2 gap-2.5">
            <div className="relative">
              <div className="absolute -top-1 -right-1 bg-emerald-500 text-black text-[9px] font-bold px-1.5 py-0.5 rounded-full z-10">
                {yesPrice}¢
              </div>
              <StakeDialog claimId={claim.id} side="yes" />
            </div>
            <div className="relative">
              <div className="absolute -top-1 -right-1 bg-rose-500 text-black text-[9px] font-bold px-1.5 py-0.5 rounded-full z-10">
                {noPrice}¢
              </div>
              <StakeDialog claimId={claim.id} side="no" />
            </div>
          </div>
        </div>
      )}

      {claim.status === 'resolved' && (
        <div className="px-6 pb-5">
          <button className="w-full py-3 bg-neutral-800/50 hover:bg-neutral-800 text-neutral-300 rounded-lg text-sm font-medium transition-colors border border-neutral-700/50">
            View Result
          </button>
        </div>
      )}

      {/* Footer Info */}
      <div className="px-6 pb-4 pt-2 border-t border-neutral-800/40">
        <div className="flex items-center justify-between text-[10px] text-neutral-600">
          <span className="truncate max-w-[200px]">
            {claim.specBlobId}
          </span>
          <span className="flex items-center gap-1">
            <TrendingUp className="w-3 h-3 text-emerald-500/50" />
            <span className="text-emerald-500/50">{yesPercent.toFixed(1)}%</span>
            <TrendingDown className="w-3 h-3 text-rose-500/50 ml-2" />
            <span className="text-rose-500/50">{noPercent.toFixed(1)}%</span>
          </span>
        </div>
      </div>
    </div>
  );
}
