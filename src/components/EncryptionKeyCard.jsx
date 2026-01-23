'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Copy, Check, Key } from 'lucide-react';
import { useWeb3 } from '@/components/providers/Web3Provider';
import { getPublicKey, hasPublicKey } from '@/lib/publicKeyRegistry';

export function EncryptionKeyCard() {
  const { account } = useWeb3();
  const [copied, setCopied] = useState(false);
  const [recipientAddress, setRecipientAddress] = useState('');
  const [recipientPubKey, setRecipientPubKey] = useState('');
  const [registering, setRegistering] = useState(false);

  const myPublicKey = account ? getPublicKey(account) : null;
  const hasRegistered = account ? hasPublicKey(account) : false;

  const handleCopyKey = () => {
    if (myPublicKey) {
      navigator.clipboard.writeText(myPublicKey);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleRegisterRecipient = async () => {
    if (!recipientAddress || !recipientPubKey) {
      alert('Please enter both address and public key');
      return;
    }

    setRegistering(true);
    try {
      // Store in registry
      const registry = JSON.parse(localStorage.getItem('blocksafe_encryption_pubkey') || '{}');
      registry[recipientAddress.toLowerCase()] = recipientPubKey;
      localStorage.setItem('blocksafe_encryption_pubkey', JSON.stringify(registry));
      
      alert(`Public key registered for ${recipientAddress.slice(0, 8)}...`);
      setRecipientAddress('');
      setRecipientPubKey('');
    } catch (error) {
      alert('Failed to register public key');
    } finally {
      setRegistering(false);
    }
  };

  if (!account) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Key className="w-5 h-5" />
            Encryption Setup
          </CardTitle>
          <CardDescription>
            Connect your wallet to enable secure file sharing
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Key className="w-5 h-5" />
          Encryption Key Management
        </CardTitle>
        <CardDescription>
          Share your public key to receive encrypted files
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* My Public Key */}
        <div className="space-y-2">
          <Label className="text-sm font-semibold">Your Encryption Public Key</Label>
          {hasRegistered ? (
            <div className="flex gap-2">
              <Input
                value={myPublicKey || ''}
                readOnly
                className="font-mono text-xs"
              />
              <Button
                variant="outline"
                size="sm"
                onClick={handleCopyKey}
                className="shrink-0"
              >
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              </Button>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              ⚠️ Not registered. Your encryption key will be registered when you connect your wallet.
            </p>
          )}
          <p className="text-xs text-muted-foreground">
            Share this key with others so they can send you encrypted files
          </p>
        </div>

        {/* Register Others */}
        <div className="border-t pt-6 space-y-4">
          <div>
            <Label className="text-sm font-semibold">Register Someone Else's Key</Label>
            <p className="text-xs text-muted-foreground mt-1">
              Add a recipient's public key to share files with them
            </p>
          </div>

          <div className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="recipientAddress" className="text-xs">
                Recipient's Wallet Address
              </Label>
              <Input
                id="recipientAddress"
                placeholder="0x..."
                value={recipientAddress}
                onChange={(e) => setRecipientAddress(e.target.value)}
                className="font-mono text-sm"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="recipientPubKey" className="text-xs">
                Recipient's Encryption Public Key
              </Label>
              <Input
                id="recipientPubKey"
                placeholder="Paste their public key here"
                value={recipientPubKey}
                onChange={(e) => setRecipientPubKey(e.target.value)}
                className="font-mono text-sm"
              />
            </div>

            <Button
              onClick={handleRegisterRecipient}
              disabled={!recipientAddress || !recipientPubKey || registering}
              className="w-full"
            >
              Register Public Key
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
