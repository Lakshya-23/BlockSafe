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
import { encryptFile, generateKey, exportKey } from '@/lib/encryption';
import { getContract } from '@/lib/contract';
import { getGroupRegistryContract } from '@/lib/groupRegistry';
import { NODE_CONFIG } from '@/lib/nodeConfig';
import { split as splitSecret } from '@/lib/shamirSecretSharing';
import { useState, useEffect } from 'react';
import { Upload, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { ethers } from 'ethers';

import { encrypt } from '@metamask/eth-sig-util';

// ECIES encryption for shares using eth-sig-util (compatible with backend)
async function encryptForNode(message, publicKey) {
  try {
    // eth-sig-util's encrypt function:
    // - publicKey: base64 encoded x25519 public key (from nodeConfig)
    // - data: the message to encrypt (string)
    // - version: 'x25519-xsalsa20-poly1305'
    // Returns: { version, nonce, ephemPublicKey, ciphertext }
    
    const encrypted = encrypt({
      publicKey: publicKey, // Already in base64 format from nodeConfig
      data: message,
      version: 'x25519-xsalsa20-poly1305',
    });
    
    // Backend expects this exact structure for decryption
    return JSON.stringify(encrypted);
  } catch (error) {
    console.error('Encryption error:', error);
    throw error;
  }
}

export function FileUploadDialog({ onUploadSuccess, requireGroup = false }) {
  const { signer, account } = useWeb3();
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [open, setOpen] = useState(false);
  const [groups, setGroups] = useState([]);
  const [selectedGroupId, setSelectedGroupId] = useState('');
  const router = useRouter();

  useEffect(() => {
    if (open && signer && requireGroup) {
      loadGroups();
    }
  }, [open, signer, requireGroup]);

  const loadGroups = async () => {
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const userAddress = await signer.getAddress();
      const contract = getGroupRegistryContract(signer);
      
      const userGroupIds = await contract.getUserGroups(userAddress);
      const loadedGroups = await Promise.all(userGroupIds.map(async (id) => {
        const group = await contract.getGroupDetails(id);
        const status = await contract.getMemberStatus(id, userAddress);
        if (Number(status) === 2) { // Only show joined groups
          return {
            id: group.groupId.toString(),
            name: group.name,
          };
        }
        return null;
      }));
      
      setGroups(loadedGroups.filter(g => g !== null));
    } catch (error) {
      console.error("Failed to load groups:", error);
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleUpload = async () => {
    if (!file || !signer) {
      alert('Please select a file and connect your wallet');
      return;
    }
    if (requireGroup && !selectedGroupId) {
        alert('Please select a group to upload to');
        return;
    }

    setUploading(true);
    try {
      console.log('Step 1: Generating encryption key...');
      const key = await generateKey();
      const exportedKey = await exportKey(key);
      const keyHex = Buffer.from(exportedKey).toString('hex');
      console.log('[DEBUG] Original encryption key (hex):', keyHex);
      console.log('[DEBUG] Original encryption key length:', keyHex.length);
      
      let encryptedSharesStrings = ["", "", ""];
      
      if (requireGroup) {
        // ORGANIZATION MODE: Use Shamir + Trustless Trio
        console.log('Step 2: Splitting key using Shamir Secret Sharing...');
        const shares = splitSecret(keyHex);
        console.log('[DEBUG] Shamir shares created:', shares.length);
        console.log('[DEBUG] Share 1:', shares[0]);
        console.log('[DEBUG] Share 2:', shares[1]);
        console.log('[DEBUG] Share 3:', shares[2]);
        
        console.log('Step 3: Encrypting shares for Trustless Trio nodes...');
        encryptedSharesStrings = await Promise.all([
          encryptForNode(shares[0], NODE_CONFIG.alpha.publicKey),
          encryptForNode(shares[1], NODE_CONFIG.beta.publicKey),
          encryptForNode(shares[2], NODE_CONFIG.gamma.publicKey)
        ]);
        console.log('[DEBUG] Encrypted shares created:', encryptedSharesStrings.length);
      } else {
        // PERSONAL MODE: Store key in session
        console.log('Step 2: Storing key in session (personal file)...');
        // Will store after getting CID
      }

      console.log('Step ' + (requireGroup ? '4' : '3') + ': Encrypting file...');
      const encryptedContent = await encryptFile(file, key);
      
      console.log('Step ' + (requireGroup ? '5' : '4') + ': Uploading to IPFS...');
      const formData = new FormData();
      const blob = new Blob([encryptedContent], { type: 'application/octet-stream' });
      formData.append('file', blob, file.name + '.encrypted');

      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('Not authenticated. Please log in again.');
      }

      const uploadRes = await fetch('/api/files/upload', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData,
      });

      if (!uploadRes.ok) {
        const errorData = await uploadRes.json();
        throw new Error(errorData.error || errorData.details || 'Upload failed');
      }
      const { cid } = await uploadRes.json();
      
      if (!cid) {
        throw new Error('Upload succeeded but no CID returned from server.');
      }
      
      console.log('File uploaded to IPFS. CID:', cid);

      console.log('Step ' + (requireGroup ? '6' : '5') + ': Registering file on blockchain...');
      const contract = getContract(signer);
      
      // Use groupId 0 for personal files (no group)
      const groupId = requireGroup ? selectedGroupId : '0';
      
      const tx = await contract.registerFile(
          cid, 
          file.name, 
          groupId,
          encryptedSharesStrings
      );
      console.log('Transaction sent. Waiting for confirmation...');
      await tx.wait();
      console.log('File registered on blockchain!');

      // For personal files, store key in session
      if (!requireGroup) {
        sessionStorage.setItem(`key_${cid}`, keyHex);
        console.log('Key stored in session for personal file');
      }

      alert(`File "${file.name}" uploaded successfully!`);
      setOpen(false);
      setFile(null);
      setSelectedGroupId('');
      
      if (onUploadSuccess) {
        await onUploadSuccess();
      }
    } catch (error) {
      console.error('Upload error:', error);
      alert(`Upload failed: ${error.message}`);
    } finally {
      setUploading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Upload className="w-4 h-4 mr-2" />
          {requireGroup ? 'Upload to Group' : 'Upload File'}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{requireGroup ? 'Upload to Organization' : 'Upload File'}</DialogTitle>
          <DialogDescription>
            {requireGroup  
              ? 'Encrypt and upload file to your organization (secured with Trustless Trio).'
              : 'Encrypt and upload a personal file to IPFS.'}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid w-full max-w-sm items-center gap-1.5">
            <Label htmlFor="file">File</Label>
            <Input id="file" type="file" onChange={handleFileChange} />
          </div>
          
          {requireGroup && (
            <div className="grid w-full max-w-sm items-center gap-1.5">
              <Label htmlFor="group">Access Group</Label>
              <Select onValueChange={setSelectedGroupId} value={selectedGroupId}>
                  <SelectTrigger>
                      <SelectValue placeholder="Select a group" />
                  </SelectTrigger>
                  <SelectContent>
                      {groups.length === 0 ? (
                          <SelectItem value="none" disabled>No groups available</SelectItem>
                      ) : (
                          groups.map(g => (
                              <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>
                          ))
                      )}
                  </SelectContent>
              </Select>
              {groups.length === 0 && (
                  <p className="text-xs text-muted-foreground">
                      You must join or create a group to upload files.
                  </p>
              )}
            </div>
          )}
        </div>
        <DialogFooter>
          <Button 
            onClick={handleUpload} 
            disabled={!file || (requireGroup && !selectedGroupId) || uploading}
          >
            {uploading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            {uploading ? 'Uploading...' : 'Upload'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
