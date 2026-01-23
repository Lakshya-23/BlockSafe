'use client';

import { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { ethers } from 'ethers';
import { getContract } from '@/lib/contract';
import { decryptFile, importKey } from '@/lib/encryption';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Loader2, Lock, FileText, AlertTriangle, Clock } from 'lucide-react';
import { DocumentViewer } from '@/components/DocumentViewer';
import { decrypt } from '@metamask/eth-sig-util';

export default function PublicAccessPage() {
  const { fileId } = useParams();
  const searchParams = useSearchParams();
  const privateKey = searchParams.get('key');

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [file, setFile] = useState(null);
  const [accessStatus, setAccessStatus] = useState(null); // 'valid', 'expired', 'denied'
  const [decryptedUrl, setDecryptedUrl] = useState(null);
  const [isViewing, setIsViewing] = useState(false);

  useEffect(() => {
    const init = async () => {
      if (!fileId || !privateKey) {
        setError('Invalid link. Missing file ID or key.');
        setLoading(false);
        return;
      }

      try {
        // 1. Initialize Burner Wallet
        let wallet;
        try {
          wallet = new ethers.Wallet(privateKey);
        } catch (e) {
          throw new Error('Invalid key in URL.');
        }

        // 2. Connect to Provider (Public RPC or default)
        // We need a provider to read from the contract.
        // Since the user might not have MetaMask, we need a fallback provider.
        // For localhost, we use JsonRpcProvider. For production, we'd need an Alchemy/Infura key.
        // Assuming the app wraps this in a way or we can just use window.ethereum if available?
        // No, the whole point is "No MetaMask Needed".
        // So we need a read-only provider.
        // For this project, let's assume we can use a standard JSON RPC provider pointing to localhost
        // or the environment's RPC URL.
        
        const rpcUrl = process.env.NEXT_PUBLIC_RPC_URL || 'http://127.0.0.1:8545';
        const provider = new ethers.JsonRpcProvider(rpcUrl);
        const contract = getContract(provider); // getContract handles provider or signer

        // 3. Fetch File Details
        const details = await contract.getFileDetails(fileId);
        if (details.isDeleted) {
          throw new Error('This file has been deleted.');
        }

        setFile({
          id: details.fileId.toString(),
          filename: details.filename,
          cid: details.currentCid,
          owner: details.owner,
        });

        // 4. Check Access
        // We can check `hasValidAccess` on the contract
        const hasAccess = await contract.hasValidAccess(fileId, wallet.address);
        
        if (!hasAccess) {
            // Check if it's expired specifically to give better error
            const accessDetails = await contract.getAccessDetails(fileId, wallet.address);
            if (accessDetails.hasAccess && accessDetails.expiresAt > 0) {
                const now = Math.floor(Date.now() / 1000);
                if (now > Number(accessDetails.expiresAt)) {
                    setAccessStatus('expired');
                    throw new Error('This link has expired.');
                }
            }
            setAccessStatus('denied');
            throw new Error('Access denied. This link is invalid or revoked.');
        }

        setAccessStatus('valid');

        // 5. Decrypt File
        // Get wrapped key
        const accessPermission = await contract.getAccessPermission(fileId, wallet.address);
        const wrappedKey = accessPermission.wrappedKey;

        // Decrypt the wrapped key using the burner private key
        // The wrapped key is an ECIES encrypted JSON string.
        // We use eth-sig-util 'decrypt' which takes { privateKey, encryptedData }
        // encryptedData should be the object { version, nonce, ephemPublicKey, ciphertext, mac }
        
        let encryptedObject;
        try {
            // It might be a hex string representing the JSON, or just the JSON string
            let jsonString = wrappedKey;
            if (wrappedKey.startsWith('0x')) {
                const hexString = wrappedKey.slice(2);
                const bytes = new Uint8Array(hexString.match(/.{1,2}/g).map(byte => parseInt(byte, 16)));
                jsonString = new TextDecoder().decode(bytes);
            }
            encryptedObject = JSON.parse(jsonString);
        } catch (e) {
            console.error('Failed to parse wrapped key:', e);
            throw new Error('Invalid encryption key format.');
        }

        const decryptedKeyHex = decrypt({
            encryptedData: encryptedObject,
            privateKey: privateKey.startsWith('0x') ? privateKey.slice(2) : privateKey
        });

        // Import the AES key
        const keyData = Buffer.from(decryptedKeyHex, 'hex');
        const key = await importKey(keyData);

        // Fetch file from IPFS
        const gateway = process.env.NEXT_PUBLIC_IPFS_GATEWAY || 'https://gateway.pinata.cloud/ipfs/';
        const res = await fetch(`${gateway}${details.currentCid}`);
        const encryptedBlob = await res.blob();
        const encryptedBuffer = await encryptedBlob.arrayBuffer();

        // Decrypt content
        const decryptedBuffer = await decryptFile(new Uint8Array(encryptedBuffer), key);

        // Create blob URL
        const getMimeType = (filename) => {
            const ext = filename.split('.').pop().toLowerCase();
            // ... (same mime type logic as before) ...
            const mimeTypes = {
                'pdf': 'application/pdf',
                'txt': 'text/plain',
                'jpg': 'image/jpeg',
                'jpeg': 'image/jpeg',
                'png': 'image/png',
                'gif': 'image/gif',
                'webp': 'image/webp',
                'svg': 'image/svg+xml',
                'mp4': 'video/mp4',
                'mp3': 'audio/mpeg',
                'doc': 'application/msword',
                'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                'xls': 'application/vnd.ms-excel',
                'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            };
            return mimeTypes[ext] || 'application/octet-stream';
        };

        const mimeType = getMimeType(details.filename);
        const blob = new Blob([decryptedBuffer], { type: mimeType });
        const url = window.URL.createObjectURL(blob);
        setDecryptedUrl(url);

      } catch (err) {
        console.error('Public access error:', err);
        setError(err.message || 'Failed to access file.');
      } finally {
        setLoading(false);
      }
    };

    init();
  }, [fileId, privateKey]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto" />
          <p className="text-muted-foreground">Verifying secure link...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md border-destructive/50">
          <CardHeader>
            <div className="w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center mb-4">
              <AlertTriangle className="w-6 h-6 text-destructive" />
            </div>
            <CardTitle className="text-destructive">Access Denied</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-6">{error}</p>
            <Button variant="outline" onClick={() => window.location.reload()}>
              Try Again
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
      <Card className="w-full max-w-lg shadow-lg border-primary/20">
        <CardHeader className="text-center pb-2">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
            <Lock className="w-8 h-8 text-primary" />
          </div>
          <CardTitle className="text-2xl">{file?.filename}</CardTitle>
          <p className="text-sm text-muted-foreground flex items-center justify-center gap-2 mt-2">
            <Clock className="w-3 h-3" />
            Time-Locked Secure Access
          </p>
        </CardHeader>
        <CardContent className="space-y-6 pt-6">
          <Alert className="bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-900">
            <FileText className="h-4 w-4 text-green-600 dark:text-green-400" />
            <AlertTitle className="text-green-800 dark:text-green-300">Access Granted</AlertTitle>
            <AlertDescription className="text-green-700 dark:text-green-400">
              You have temporary read-only access to this file.
            </AlertDescription>
          </Alert>

          <div className="grid gap-4">
            <Button 
                size="lg" 
                className="w-full" 
                onClick={() => setIsViewing(true)}
            >
              <FileText className="w-4 h-4 mr-2" />
              View File
            </Button>
          </div>
          
          <p className="text-xs text-center text-muted-foreground">
            Powered by BlockSafe • Decentralized & Encrypted
          </p>
        </CardContent>
      </Card>

      <DocumentViewer
        isOpen={isViewing}
        onClose={() => setIsViewing(false)}
        fileData={decryptedUrl}
        fileName={file?.filename}
        canDownload={false} // Public links are read-only view, no download (as per strict read-only request)
        // Actually user said "read_only" permission level in modal options.
        // And "also in real only mode when clicking ov view , the modal that opens has download button for both read only and editor change that to only show downlaod button for editor"
        // So yes, canDownload={false} is correct for public links which are 'viewer' (read-only)
      />
    </div>
  );
}
