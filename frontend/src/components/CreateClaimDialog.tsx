import { useState } from 'react';
import { Plus } from 'lucide-react';
import { useCurrentAccount, useSignAndExecuteTransaction } from '@mysten/dapp-kit';
import { Transaction } from '@mysten/sui/transactions';
import { SealClient } from '@mysten/seal';
import { toast } from 'sonner';

const PACKAGE_ID = import.meta.env.VITE_PACKAGE_ID as string;
const CLAIM_REGISTRY_ID = import.meta.env.VITE_CLAIM_REGISTRY_ID as string;
const SEAL_PACKAGE_ID = import.meta.env.VITE_SEAL_PACKAGE_ID as string;
const WALRUS_PUBLISHER = import.meta.env.VITE_WALRUS_PUBLISHER as string;

// Default testnet Seal key servers taken from official examples.
const DEFAULT_SEAL_KEY_SERVERS = [
  '0x73d05d62c18d9374e3ea529e8e0ed6161da1a141a94d3f76ae3fe4e99356db75',
  '0xf5d14a81a982144ae441cd7d64b09027f116a468bd36e7eca494f750591623c8',
];

export function CreateClaimDialog() {
  const [isOpen, setIsOpen] = useState(false);
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [metric, setMetric] = useState('Temperature (°C)');
  const [operator, setOperator] = useState('>');
  const [threshold, setThreshold] = useState('');
  const [deadline, setDeadline] = useState('');
  const [creatorFee, setCreatorFee] = useState('1');
  const [evidence, setEvidence] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const account = useCurrentAccount();
  const { mutate: signAndExecute } = useSignAndExecuteTransaction();

  const handleCreate = async () => {
    if (!account) {
      toast.error('Connect your wallet first');
      return;
    }

    if (!description || !location || !threshold || !deadline || !evidence) {
      toast.error('Please fill all fields, including private evidence');
      return;
    }

    try {
      setSubmitting(true);
      toast.loading('Creating claim...', { id: 'create-claim' });

      const deadlineMs = new Date(deadline).getTime();
      if (Number.isNaN(deadlineMs)) {
        toast.error('Invalid deadline', { id: 'create-claim' });
        return;
      }

      // 1. Build and upload public ClaimSpec JSON to Walrus
      const spec = {
        description,
        location,
        metric,
        operator,
        threshold: Number(threshold),
        deadline: new Date(deadline).toISOString(),
      };

      const specRes = await fetch(`${WALRUS_PUBLISHER}/v1/blobs`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(spec),
      });

      if (!specRes.ok) {
        throw new Error(`Walrus spec upload failed: ${specRes.status}`);
      }

      const specBlobId = (await specRes.text()).trim();

      // 2. Encrypt evidence with Seal (time-lock policy keyed to deadline)
      const serverIds = DEFAULT_SEAL_KEY_SERVERS;
      const serverConfigs = serverIds.map((id) => ({ objectId: id, weight: 1 }));

      // Import SuiClient from @mysten/sui/client dynamically to create a proper
      // experimental client that Seal SDK can use
      const { SuiClient: SuiClientClass } = await import('@mysten/sui/client');
      const { getFullnodeUrl } = await import('@mysten/sui/client');
      
      // Create a fresh SuiClient for Seal (not the DappKit one)
      const sealSuiClient = new SuiClientClass({
        url: getFullnodeUrl('testnet'),
      });

      const sealClient = new SealClient({
        suiClient: sealSuiClient as any,
        serverConfigs,
        verifyKeyServers: false,
      });

      // Manually encode the deadline timestamp as a little-endian u64 (8 bytes)
      // to avoid BCS API version issues. This is what BCS u64 encoding does.
      const idBytes = new Uint8Array(8);
      const view = new DataView(idBytes.buffer);
      view.setBigUint64(0, BigInt(deadlineMs), true); // true = little-endian

      // Convert bytes to 0x-prefixed hex string for Seal SDK
      const idHex =
        '0x' +
        Array.from(idBytes)
          .map((b) => b.toString(16).padStart(2, '0'))
          .join('');

      const evidenceBytes = new TextEncoder().encode(evidence);

      const { encryptedObject } = await sealClient.encrypt({
        threshold: serverConfigs.length,
        packageId: SEAL_PACKAGE_ID,
        id: idHex,
        data: evidenceBytes,
      });

      // 3. Upload ciphertext to Walrus
      const evidenceRes = await fetch(`${WALRUS_PUBLISHER}/v1/blobs`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/octet-stream' },
        body: encryptedObject,
      });

      if (!evidenceRes.ok) {
        throw new Error(`Walrus evidence upload failed: ${evidenceRes.status}`);
      }

      const evidenceBlobId = (await evidenceRes.text()).trim();

      // 4. Call claim_registry::create_claim on Sui
      const tx = new Transaction();

      tx.moveCall({
        target: `${PACKAGE_ID}::claim_registry::create_claim`,
        arguments: [
          tx.object(CLAIM_REGISTRY_ID),
          tx.pure.string(specBlobId),
          tx.pure.string(evidenceBlobId),
          tx.pure.string(description),
          tx.pure.u64(BigInt(deadlineMs)),
          tx.pure.u64(BigInt(Math.floor(parseFloat(creatorFee || '0') * 100))), // percent -> bps
          tx.object('0x6'), // Clock object on testnet
        ],
      });

      await new Promise<void>((resolve, reject) => {
        signAndExecute(
          { transaction: tx as any },
          {
            onSuccess: () => {
              resolve();
            },
            onError: (error) => {
              console.error('Claim creation failed:', error);
              reject(error);
            },
          },
        );
      });

      toast.success('Claim created successfully!', { id: 'create-claim' });
      setIsOpen(false);
      setDescription('');
      setLocation('');
      setMetric('Temperature (°C)');
      setOperator('>');
      setThreshold('');
      setDeadline('');
      setCreatorFee('1');
      setEvidence('');
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message ?? 'Failed to create claim', { id: 'create-claim' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="inline-flex items-center gap-2 rounded-full bg-black text-white px-4 py-2 text-sm font-medium shadow-sm hover:bg-neutral-900 transition-colors"
      >
        <Plus className="w-4 h-4" />
        New claim
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="w-full max-w-2xl rounded-2xl bg-white shadow-xl border border-neutral-200">
            <div className="flex items-center justify-between border-b border-neutral-100 px-5 py-4">
              <div>
                <h2 className="text-sm font-semibold text-neutral-900">Create claim</h2>
                <p className="mt-1 text-xs text-neutral-500">
                  Define the market, attach private evidence, and store everything on Walrus.
                </p>
              </div>
              <button
                onClick={() => !submitting && setIsOpen(false)}
                className="text-xs text-neutral-500 hover:text-neutral-800"
              >
                Esc
              </button>
            </div>

            <div className="px-5 py-4 space-y-4 text-sm text-neutral-900">
              <div className="space-y-1">
                <label className="text-xs font-medium text-neutral-600">Description</label>
                <input
                  type="text"
                  placeholder="London temperature will exceed 10°C on Nov 15, 2025"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2 text-sm outline-none focus:border-neutral-400 focus:bg-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-neutral-600">Location</label>
                  <input
                    type="text"
                    placeholder="London"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    className="w-full rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2 text-sm outline-none focus:border-neutral-400 focus:bg-white"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-neutral-600">Metric</label>
                  <select
                    value={metric}
                    onChange={(e) => setMetric(e.target.value)}
                    className="w-full rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2 text-sm outline-none focus:border-neutral-400 focus:bg-white"
                  >
                    <option>Temperature (°C)</option>
                    <option>Precipitation (mm)</option>
                    <option>Wind Speed (km/h)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-neutral-600">Operator</label>
                  <select
                    value={operator}
                    onChange={(e) => setOperator(e.target.value)}
                    className="w-full rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2 text-sm outline-none focus:border-neutral-400 focus:bg-white"
                  >
                    <option>&gt;</option>
                    <option>&lt;</option>
                    <option>&gt;=</option>
                    <option>&lt;=</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-neutral-600">Threshold</label>
                  <input
                    type="number"
                    placeholder="10"
                    value={threshold}
                    onChange={(e) => setThreshold(e.target.value)}
                    className="w-full rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2 text-sm outline-none focus:border-neutral-400 focus:bg-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-neutral-600">Deadline</label>
                  <input
                    type="datetime-local"
                    value={deadline}
                    onChange={(e) => setDeadline(e.target.value)}
                    className="w-full rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2 text-sm outline-none focus:border-neutral-400 focus:bg-white"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-neutral-600">Creator fee (%)</label>
                  <input
                    type="number"
                    placeholder="1"
                    step="0.1"
                    value={creatorFee}
                    onChange={(e) => setCreatorFee(e.target.value)}
                    className="w-full rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2 text-sm outline-none focus:border-neutral-400 focus:bg-white"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-neutral-600">Private evidence</label>
                <textarea
                  placeholder="Describe or paste structured evidence. This will be encrypted with Seal and stored on Walrus."
                  value={evidence}
                  onChange={(e) => setEvidence(e.target.value)}
                  rows={4}
                  className="w-full rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2 text-sm outline-none focus:border-neutral-400 focus:bg-white resize-none"
                />
              </div>
            </div>

            <div className="flex items-center justify-between border-t border-neutral-100 px-5 py-4 bg-neutral-50/60 rounded-b-2xl">
              <p className="text-xs text-neutral-500">
                Evidence is end-to-end encrypted with Seal and stored on Walrus; only policy-approved decryptions are possible.
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => !submitting && setIsOpen(false)}
                  className="px-3 py-1.5 rounded-full border border-neutral-200 text-xs font-medium text-neutral-600 hover:bg-white"
                  disabled={submitting}
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreate}
                  disabled={submitting}
                  className="px-4 py-1.5 rounded-full bg-black text-white text-xs font-medium hover:bg-neutral-900 disabled:opacity-60"
                >
                  {submitting ? 'Creating…' : 'Create claim'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

