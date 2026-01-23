'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Link2, Copy, Check, Clock, Globe } from 'lucide-react';
import { useWeb3 } from '@/components/providers/Web3Provider';
import { getContract } from '@/lib/contract';
import { ethers } from 'ethers';
import { encrypt } from '@metamask/eth-sig-util';
import { importKey, exportKey } from '@/lib/encryption';

export function CreatePublicLinkDialog({ fileId, fileName, fileCid }) {
  const { signer, account } = useWeb3();
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [duration, setDuration] = useState('3600'); // Default 1 hour
  const [generatedLink, setGeneratedLink] = useState('');
  const [copied, setCopied] = useState(false);

  const [existingExpiry, setExistingExpiry] = useState(null);

  useEffect(() => {
    if (isOpen && fileId) {
      checkExistingLink();
    }
  }, [isOpen, fileId]);

  const checkExistingLink = () => {
    try {
      const storedData = localStorage.getItem(`blocksafe_public_link_${fileId}`);
      if (storedData) {
        const { url, expiry } = JSON.parse(storedData);
        const now = Math.floor(Date.now() / 1000);
        
        if (expiry > now) {
          setGeneratedLink(url);
          setExistingExpiry(expiry);
        } else {
          // Clean up expired link
          localStorage.removeItem(`blocksafe_public_link_${fileId}`);
          setGeneratedLink('');
          setExistingExpiry(null);
        }
      }
    } catch (e) {
      console.error('Error checking existing link:', e);
    }
  };

  const handleCreateLink = async () => {
    if (!signer || !fileId) return;
    setLoading(true);
    try {
      // 1. Get the file's AES key from session (Owner must have it)
      const storedKeyHex = sessionStorage.getItem(`key_${fileCid}`);
      if (!storedKeyHex) {
        throw new Error('Encryption key not found in session. Please view the file first to unlock the key.');
      }
      
      // 2. Generate a Burner Wallet
      const burnerWallet = ethers.Wallet.createRandom();
      console.log('Burner Wallet Address:', burnerWallet.address);
      console.log('Burner Wallet Private Key:', burnerWallet.privateKey);

      // 3. Encrypt the AES key for the Burner Wallet
      const { getEncryptionPublicKey } = require('@metamask/eth-sig-util');
      // strip 0x prefix from private key for eth-sig-util
      const privateKey = burnerWallet.privateKey.startsWith('0x') 
        ? burnerWallet.privateKey.slice(2) 
        : burnerWallet.privateKey;
        
      const burnerPublicKey = getEncryptionPublicKey(privateKey);
      
      // Prepare the key data
      const keyBuffer = Buffer.from(storedKeyHex, 'hex');
      // We need to pass the key as a JSON string to be compatible with our existing flow
      const encryptedObject = encrypt({
        publicKey: burnerPublicKey,
        data: storedKeyHex,
        version: 'x25519-xsalsa20-poly1305',
      });
      
      const wrappedKey = JSON.stringify(encryptedObject);
      // Convert to hex string for bytes argument
      const wrappedKeyHex = '0x' + Buffer.from(wrappedKey, 'utf8').toString('hex');

      // 4. Calculate Expiry
      const expiryTimestamp = Math.floor(Date.now() / 1000) + parseInt(duration);

      // 5. Grant Access On-Chain
      const contract = getContract(signer);
      
      const tx = await contract.grantAccess(
        fileId,
        burnerWallet.address,
        'viewer',
        wrappedKeyHex,
        expiryTimestamp
      );
      
      await tx.wait();

      // 6. Generate Link
      // Format: /public/[fileId]?key=[privateKey]
      const baseUrl = window.location.origin;
      const link = `${baseUrl}/public/${fileId}?key=${burnerWallet.privateKey}`;
      
      // Save to localStorage
      localStorage.setItem(`blocksafe_public_link_${fileId}`, JSON.stringify({
        url: link,
        expiry: expiryTimestamp
      }));

      setGeneratedLink(link);
      setExistingExpiry(expiryTimestamp);

    } catch (error) {
      console.error('Error creating public link:', error);
      alert('Failed to create public link: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(generatedLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const reset = () => {
    setGeneratedLink('');
    setIsOpen(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && reset()}>
      <DialogTrigger asChild>
        <Button variant="outline" onClick={() => setIsOpen(true)}>
          <Globe className="w-4 h-4 mr-2" />
          Public Link
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create Public Link</DialogTitle>
          <DialogDescription>
            Generate a temporary, time-locked link for anyone to view this file.
          </DialogDescription>
        </DialogHeader>

        {!generatedLink ? (
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Access Duration</Label>
              <Select value={duration} onValueChange={setDuration}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="3600">1 Hour</SelectItem>
                  <SelectItem value="86400">1 Day</SelectItem>
                  <SelectItem value="604800">7 Days</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Access will automatically expire after this time.
              </p>
            </div>
            
            <div className="bg-yellow-50 dark:bg-yellow-900/20 p-3 rounded-md border border-yellow-200 dark:border-yellow-900 text-sm text-yellow-800 dark:text-yellow-200">
              <p className="font-semibold flex items-center gap-2">
                <Clock className="w-4 h-4" />
                Temporary Access
              </p>
              <p className="mt-1">
                This creates a "burner wallet" with read-only access. The link contains the key to this wallet. Anyone with the link can view the file until it expires.
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>
                {existingExpiry ? 'Active Public Link' : 'Your Public Link'}
              </Label>
              <div className="flex items-center gap-2">
                <Input value={generatedLink} readOnly className="font-mono text-xs" />
                <Button size="icon" onClick={copyToClipboard}>
                  {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                </Button>
              </div>
              
              {existingExpiry ? (
                <div className="text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 p-2 rounded border border-amber-200 dark:border-amber-900 mt-2">
                  <p className="font-semibold mb-1">Link is currently active</p>
                  <p>Expires on: {new Date(existingExpiry * 1000).toLocaleString()}</p>
                  <p className="mt-1 opacity-80">A new link can only be created after this one expires.</p>
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">
                  Share this link with anyone. They won't need a wallet to view the file.
                </p>
              )}
            </div>
          </div>
        )}

        <DialogFooter>
          {!generatedLink ? (
            <Button onClick={handleCreateLink} disabled={loading} className="w-full">
              {loading ? 'Creating Link...' : 'Generate Link'}
            </Button>
          ) : (
            <Button onClick={reset} variant="outline" className="w-full">
              Done
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
