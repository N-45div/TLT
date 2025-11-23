import { useState, useEffect } from 'react';
import { useSuiClient } from '@mysten/dapp-kit';
import { ClaimCard } from './ClaimCard';
import { Tabs, TabsList, TabsTrigger } from './ui/Tabs';

const PACKAGE_ID = import.meta.env.VITE_PACKAGE_ID;

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

export function ClaimList() {
  const [filter, setFilter] = useState<'all' | 'open' | 'resolved'>('all');
  const [claims, setClaims] = useState<Claim[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const client = useSuiClient();

  useEffect(() => {
    fetchClaims(true); // Initial load with loader
    
    // Auto-refresh claims every 10 seconds to show newly created claims
    const interval = setInterval(() => {
      fetchClaims(false); // Silent refresh without loader
    }, 10000);
    
    return () => clearInterval(interval);
  }, []);

  async function fetchClaims(showLoader = false) {
    try {
      if (showLoader) {
        setLoading(true);
      } else {
        setIsRefreshing(true);
      }
      
      // Query ClaimCreated events to find all claims
      const events = await client.queryEvents({
        query: {
          MoveEventType: `${PACKAGE_ID}::claim_registry::ClaimCreated`,
        },
        limit: 50,
        order: 'descending',
      });

      const claimPromises = events.data.map(async (event) => {
        const eventData = event.parsedJson as any;
        const claimId = eventData.claim_id;

        // Fetch the actual Claim object to get current state (stakes, status)
        const claimObj = await client.getObject({
          id: claimId,
          options: { showContent: true },
        });

        if (claimObj.data?.content?.dataType === 'moveObject') {
          const fields = claimObj.data.content.fields as any;
          return {
            id: claimId,
            description: fields.description,
            creator: fields.creator,
            deadline: new Date(parseInt(fields.deadline)),
            yesStake: parseInt(fields.yes_stake || '0') / 1e9,
            noStake: parseInt(fields.no_stake || '0') / 1e9,
            status: fields.status === 2 ? 'resolved' : 'open',
            specBlobId: fields.spec_blob_id,
            result: fields.result,
          } as Claim;
        }
        return null;
      });

      const fetchedClaims = (await Promise.all(claimPromises)).filter(Boolean) as Claim[];
      setClaims(fetchedClaims);
    } catch (error) {
      console.error('Failed to fetch claims:', error);
      // Don't clear claims on error during refresh, keep showing existing data
      if (showLoader) {
        setClaims([]);
      }
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }
  
  const filteredClaims = claims.filter(claim => {
    if (filter === 'all') return true;
    return claim.status === filter;
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <Tabs defaultValue="all">
          <TabsList>
            <TabsTrigger value="all" onClick={() => setFilter('all')}>
              All Markets
            </TabsTrigger>
            <TabsTrigger value="open" onClick={() => setFilter('open')}>
              Active
            </TabsTrigger>
            <TabsTrigger value="resolved" onClick={() => setFilter('resolved')}>
              Closed
            </TabsTrigger>
          </TabsList>
        </Tabs>
        {isRefreshing && (
          <div className="flex items-center gap-2 text-xs text-neutral-500">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span>Updating...</span>
          </div>
        )}
      </div>

      {loading ? (
        <div className="text-center py-20">
          <div className="inline-block animate-spin rounded-full h-10 w-10 border-2 border-neutral-700 border-t-emerald-500"></div>
          <p className="mt-4 text-sm text-neutral-500">Loading markets...</p>
        </div>
      ) : (
        <>
          <div className="grid gap-5 md:grid-cols-2">
            {filteredClaims.map((claim) => (
              <ClaimCard key={claim.id} claim={claim} />
            ))}
          </div>

          {filteredClaims.length === 0 && (
            <div className="text-center py-20">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-neutral-800/50 mb-4">
                <svg className="w-8 h-8 text-neutral-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <p className="text-base font-medium text-neutral-300">No markets found</p>
              <p className="text-sm text-neutral-500 mt-1.5">Create the first claim to get started</p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
