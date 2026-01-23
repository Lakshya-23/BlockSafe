'use client';

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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useWeb3 } from '@/components/providers/Web3Provider';
import { getContract } from '@/lib/contract';
import { useState } from 'react';
import { Share2, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';

export function ShareFileDialog({ fileId, fileName }) {
  const { signer } = useWeb3();
  const [recipient, setRecipient] = useState('');
  const [permission, setPermission] = useState('read_only');
  const [expirationDuration, setExpirationDuration] = useState(0); 
  const [open, setOpen] = useState(false);
  const [sharing, setSharing] = useState(false);
  const router = useRouter();

  const expirationOptions = [
    { label: 'Permanent', value: 0 },
    { label: '1 Hour', value: 3600 },
    { label: '2 Hours', value: 7200 },
    { label: '24 Hours', value: 86400 },
    { label: '1 Week', value: 604800 },
  ];

  const handleShare = async () => {
    if (!recipient || !signer) return;

    setSharing(true);
    try {
      console.log('[ShareFile] ===== Starting Share Process =====');
      console.log('[ShareFile] Recipient address:', recipient);
      
      const contract = getContract(signer);
      const fileDetails = await contract.getFileDetails(fileId);
      const cid = fileDetails.currentCid;
      
      console.log('[ShareFile] File CID:', cid);
      
      const storedKey = sessionStorage.getItem(`key_${cid}`);
      if (!storedKey) {
        console.error('[ShareFile] No AES key found in sessionStorage for CID:', cid);
        alert('Encryption key not found. You must be the file owner and have uploaded this file in the current session to share it.');
        setSharing(false);
        return;
      }
      
      console.log('[ShareFile] Retrieved AES key from sessionStorage');
      
      console.log('[ShareFile] Fetching recipient public key from blockchain...');
      let recipientPublicKey;
      try {
        recipientPublicKey = await contract.encryptionKeys(recipient);
        
        console.log('[ShareFile] Recipient public key from blockchain:', recipientPublicKey);
        
        if (!recipientPublicKey || recipientPublicKey === '') {
          console.error('[ShareFile] Recipient has not registered their encryption key');
          alert(`The recipient hasn't registered their encryption key yet. They need to log in to BlockSafe once to enable file sharing.`);
          setSharing(false);
          return;
        }
        
        console.log('[ShareFile] Retrieved recipient public key from blockchain successfully');
      } catch (error) {
        console.error('[ShareFile] Failed to get recipient public key:', error);
        alert('Failed to retrieve recipient encryption key from blockchain.');
        setSharing(false);
        return;
      }
      
      console.log('[ShareFile] Wrapping AES key with ECIES...');
      const { encrypt } = await import('@metamask/eth-sig-util');
      
      const encryptedMessage = encrypt({
        publicKey: recipientPublicKey,
        data: storedKey,
        version: 'x25519-xsalsa20-poly1305',
      });
      
      console.log('[ShareFile] Encrypted message structure:', {
        version: encryptedMessage.version,
        nonce: encryptedMessage.nonce.substring(0, 20) + '...',
        ephemPublicKey: encryptedMessage.ephemPublicKey.substring(0, 20) + '...',
        ciphertextLength: encryptedMessage.ciphertext.length
      });
      
      const wrappedKey = Buffer.from(JSON.stringify(encryptedMessage), 'utf8');
      console.log('[ShareFile] Wrapped key buffer length:', wrappedKey.length);
      console.log('[ShareFile] AES key wrapped with recipient public key successfully');

      console.log('[ShareFile] Submitting transaction to blockchain...');
      console.log('[ShareFile] Parameters:', {
        fileId,
        recipient,
        permission,
        expirationDuration
      });
      
      const tx = await contract.grantAccess(
        fileId, 
        recipient, 
        permission, 
        wrappedKey,
        expirationDuration
      );
      
      console.log('[ShareFile] Transaction sent, hash:', tx.hash);
      console.log('[ShareFile] Waiting for confirmation...');
      await tx.wait();
      console.log('[ShareFile]  Transaction confirmed!');

      setOpen(false);
      router.refresh();
      alert(`File shared with ${recipient}. They can access it from their "Shared With Me" page.`);
    } catch (error) {
      console.error('[ShareFile]  Share failed:', error);
      console.error('[ShareFile] Error stack:', error.stack);
      alert(`Share failed: ${error.message}`);
    } finally {
      setSharing(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Share2 className="w-4 h-4 mr-2" />
          Share
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Share File</DialogTitle>
          <DialogDescription>
            Grant access to {fileName}.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid w-full max-w-sm items-center gap-1.5">
            <Label htmlFor="recipient">Recipient Address</Label>
            <Input 
              id="recipient" 
              placeholder="0x..." 
              value={recipient}
              onChange={(e) => setRecipient(e.target.value)}
            />
          </div>
          <div className="grid w-full max-w-sm items-center gap-1.5">
            <Label htmlFor="permission">Permission</Label>
            <Select value={permission} onValueChange={setPermission}>
              <SelectTrigger>
                <SelectValue placeholder="Select permission" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="read_only">Read Only</SelectItem>
                <SelectItem value="editor">Editor</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid w-full max-w-sm items-center gap-1.5">
            <Label htmlFor="expiration">Access Expires</Label>
            <Select 
              value={expirationDuration.toString()} 
              onValueChange={(value) => setExpirationDuration(parseInt(value))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select expiration" />
              </SelectTrigger>
              <SelectContent>
                {expirationOptions.map(option => (
                  <SelectItem key={option.value} value={option.value.toString()}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button onClick={handleShare} disabled={!recipient || sharing}>
            {sharing && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            {sharing ? 'Sharing...' : 'Share'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
