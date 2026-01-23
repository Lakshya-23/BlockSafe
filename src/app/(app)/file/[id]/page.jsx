'use client';

import { ShareFileDialog } from '@/components/ShareFileDialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useWeb3 } from '@/components/providers/Web3Provider';
import { getContract } from '@/lib/contract';
import { getGroupRegistryContract } from '@/lib/groupRegistry';
import { decryptFile, importKey } from '@/lib/encryption';
import { useEffect, useState } from 'react';
import { Download, FileText, History, Shield, User } from 'lucide-react';
import { useParams } from 'next/navigation';
import { DocumentViewer } from '@/components/DocumentViewer';
import { CreatePublicLinkDialog } from '@/components/CreatePublicLinkDialog';
import { combine } from '@/lib/shamirSecretSharing';

export default function FileDetailsPage() {
  const { id } = useParams();
  const { signer, account } = useWeb3();
  const [file, setFile] = useState(null);
  const [access, setAccess] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [decrypting, setDecrypting] = useState(false);
  const [isViewing, setIsViewing] = useState(false);
  const [viewerData, setViewerData] = useState(null); 

  useEffect(() => {
    const fetchDetails = async () => {
      if (!signer || !id) return;
      try {
        const contract = await getContract(signer);
        
        // 1. Get File Details
        const details = await contract.getFileDetails(id);
        setFile({
          id: details.fileId.toString(),
          filename: details.filename,
          cid: details.currentCid,
          owner: details.owner,
          groupId: details.groupId.toString(),
          createdAt: new Date(Number(details.createdAt) * 1000).toLocaleString(),
        });

        // 2. Check Access (Owner, Group Member, or Individual Share)
        const isOwner = details.owner.toLowerCase() === account.toLowerCase();
        let hasAccess = isOwner;
        let permissionLevel = isOwner ? 'owner' : 'none';
        let wrappedKey = null;

        
        if (!isOwner && details.groupId > 0) {
          try {
            const groupRegistry = getGroupRegistryContract(signer);
            const isMember = await groupRegistry.isMember(details.groupId, account);
            if (isMember) {
              hasAccess = true;
              permissionLevel = 'editor'; 
            }
          } catch (err) {
            console.error('[FileDetails] Error checking group membership:', err);
          }
        }

        if (!hasAccess) {
          try {
            const accessPerm = await contract.getAccessPermission(id, account);
            if (accessPerm.hasAccess) {
              const expiresAt = Number(accessPerm.expiresAt.toString());
              const now = Math.floor(Date.now() / 1000);
              
              if (expiresAt === 0 || now < expiresAt) {
                hasAccess = true;
                permissionLevel = accessPerm.permissionLevel || 'read_only';
                wrappedKey = accessPerm.wrappedKey;
              }
            }
          } catch (err) {
            console.log('[FileDetails] No share access:', err.message);
          }
        }

        setAccess({
          hasAccess,
          permissionLevel,
          wrappedKey,
        });

      
        const registeredFilter = contract.filters.FileRegistered(id);
        const updatedFilter = contract.filters.FileUpdated(id);
        const grantedFilter = contract.filters.AccessGranted(id);
        const revokedFilter = contract.filters.AccessRevoked(id);

        const [registered, updated, granted, revoked] = await Promise.all([
          contract.queryFilter(registeredFilter),
          contract.queryFilter(updatedFilter),
          contract.queryFilter(grantedFilter),
          contract.queryFilter(revokedFilter),
        ]);

        const allEvents = [
          ...registered.map(e => ({ type: 'Registered', block: e.blockNumber, tx: e.transactionHash, args: e.args })),
          ...updated.map(e => ({ type: 'Updated', block: e.blockNumber, tx: e.transactionHash, args: e.args })),
          ...granted.map(e => ({ type: 'Access Granted', block: e.blockNumber, tx: e.transactionHash, args: e.args })),
          ...revoked.map(e => ({ type: 'Access Revoked', block: e.blockNumber, tx: e.transactionHash, args: e.args })),
        ].sort((a, b) => b.block - a.block); 

        setHistory(allEvents);

      } catch (error) {
        console.error('Error fetching file details:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchDetails();
  }, [signer, account, id]);



  const handleTrustlessTrioDownload = async () => {
    console.log('[TrustlessTrio] Starting download flow...');
    
    // 1. Get user's encryption public key (Curve25519)
    const encryptionPublicKey = await window.ethereum.request({
      method: 'eth_getEncryptionPublicKey',
      params: [account],
    });
    console.log('[TrustlessTrio] Got encryption public key');

    // 2. Sign request to prove identity
    const message = `Requesting access to file ${file.id}`;
    const signature = await signer.signMessage(message);
    console.log('[TrustlessTrio] Request signed');

    // 3. Request re-encryption from nodes
    const nodes = ['alpha', 'beta', 'gamma'];
    const shares = [];
    
    // We need at least 2 shares
    for (const nodeId of nodes) {
      try {
        console.log(`[TrustlessTrio] Requesting share from node ${nodeId}...`);
        const res = await fetch('/api/nodes/reencrypt', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            nodeId,
            fileId: file.id,
            recipientPublicKey: encryptionPublicKey,
            signature,
            userAddress: account
          })
        });

        if (!res.ok) {
          const err = await res.json();
          console.warn(`[TrustlessTrio] Node ${nodeId} failed:`, err);
          continue;
        }

        const data = await res.json();
        const reEncryptedShare = JSON.parse(data.reEncryptedShare); // It's a stringified JSON
        
        // 4. Decrypt share with MetaMask
        // MetaMask expects hex string of the JSON
        const encryptedMessageHex = '0x' + Buffer.from(JSON.stringify(reEncryptedShare), 'utf8').toString('hex');
        
        const decryptedShareHex = await window.ethereum.request({
          method: 'eth_decrypt',
          params: [encryptedMessageHex, account],
        });
        
        console.log(`[DEBUG] Decrypted share from ${nodeId}:`, decryptedShareHex);
        shares.push(decryptedShareHex);
        console.log(`[TrustlessTrio] Got share from ${nodeId}`);
        
        if (shares.length >= 2) break; // We have enough
      } catch (e) {
        console.error(`[TrustlessTrio] Error with node ${nodeId}:`, e);
      }
    }

    if (shares.length < 2) {
      throw new Error('Could not retrieve enough shares from nodes (need 2/3)');
    }

    // 5. Reconstruct key
    console.log('[DEBUG] Combining shares:', shares);
    const reconstructedKeyHex = combine(shares);
    console.log('[DEBUG] Reconstructed key (hex):', reconstructedKeyHex);
    console.log('[DEBUG] Reconstructed key length:', reconstructedKeyHex.length);
    console.log('[TrustlessTrio] Key reconstructed successfully');
    
    return await importKey(Buffer.from(reconstructedKeyHex, 'hex'));
  };

  const handleDownload = async (isViewMode = false) => {
    if (!file || !access) return;
    setDecrypting(true);
    try {
      // 1. Fetch from IPFS
      const gateway = process.env.NEXT_PUBLIC_IPFS_GATEWAY || 'https://gateway.pinata.cloud/ipfs/';
      const res = await fetch(`${gateway}${file.cid}`);
      const encryptedBlob = await res.blob();
      const encryptedBuffer = await encryptedBlob.arrayBuffer();

      // 2. Decrypt - get the key
      let key;
      
      // Check if it's a personal file (groupId 0) owned by user
      const isPersonalFile = file.groupId === '0' || file.groupId === 0;
      
      if (file.owner.toLowerCase() === account.toLowerCase() && isPersonalFile) {
        // Personal Owner - try session
        const storedKey = sessionStorage.getItem(`key_${file.cid}`);
        if (storedKey) {
          key = await importKey(Buffer.from(storedKey, 'hex'));
        } else {
          alert('Key not found in session. As owner of a personal file, you need the key from the upload session.');
          setDecrypting(false);
          return;
        }
      } else if (file.groupId > 0) {
        // Group File (Owner or Member) - Use Trustless Trio
        try {
          key = await handleTrustlessTrioDownload();
        } catch (error) {
          console.error('Trustless Trio failed:', error);
          alert('Failed to retrieve file key from Trustless Trio nodes: ' + error.message);
          setDecrypting(false);
          return;
        }
      } else {
        // Shared file - unwrap ECIES encrypted key
        try {
          console.log('[FileDetails] Unwrapping ECIES encrypted key');
          console.log('[FileDetails] Raw wrappedKey:', access.wrappedKey);
          
          // The wrappedKey from blockchain is a hex string (0x...)
          let wrappedKeyString;
          
          if (typeof access.wrappedKey === 'string' && access.wrappedKey.startsWith('0x')) {
            // Remove 0x prefix and convert hex to string
            const hexString = access.wrappedKey.slice(2);
            const bytes = new Uint8Array(hexString.match(/.{1,2}/g).map(byte => parseInt(byte, 16)));
            wrappedKeyString = new TextDecoder().decode(bytes);
          } else if (typeof access.wrappedKey === 'string') {
            wrappedKeyString = access.wrappedKey;
          } else {
            // Convert bytes array to string
            const bytes = new Uint8Array(access.wrappedKey);
            wrappedKeyString = new TextDecoder().decode(bytes);
          }
          
          console.log('[FileDetails] Decoded JSON string:', wrappedKeyString.substring(0, 100));
          
          // Parse the JSON encrypted message
          const encryptedData = JSON.parse(wrappedKeyString);
          console.log('[FileDetails] Successfully parsed encrypted data');
          
          // Verify account match
          console.log('[FileDetails] Decrypting for account:', account);
          const currentAddress = window.ethereum.selectedAddress;
          console.log('[FileDetails] MetaMask selected address:', currentAddress);
          
          if (account.toLowerCase() !== currentAddress.toLowerCase()) {
            console.warn('[FileDetails] Account mismatch! App:', account, 'MetaMask:', currentAddress);
            alert(`Warning: Your MetaMask account (${currentAddress}) doesn't match the logged-in account (${account}). Please switch accounts in MetaMask.`);
          }

          // Use MetaMask's eth_decrypt to unwrap with recipient's private key
          // MetaMask expects the encrypted message to be a HEX encoded string of the JSON data
          const encryptedMessage = JSON.stringify(encryptedData);
          const encryptedMessageHex = '0x' + Buffer.from(encryptedMessage, 'utf8').toString('hex');
          
          console.log('[FileDetails] Requesting decryption from MetaMask...');
          
          const decryptedKeyHex = await window.ethereum.request({
            method: 'eth_decrypt',
            params: [encryptedMessageHex, account],
          });
          
          // The decrypted data is the hex string of the AES key
          const keyData = Buffer.from(decryptedKeyHex, 'hex');
          key = await importKey(keyData);
          console.log('[FileDetails] Key unwrapped successfully');
        } catch (error) {
          console.error('[FileDetails] Key unwrapping failed:', error);
          alert('Failed to decrypt file: ' + error.message);
          setDecrypting(false);
          return;
        }
      }

      // 3. Decrypt the file
      if (key) {
        const decryptedBuffer = await decryptFile(new Uint8Array(encryptedBuffer), key);
        
        // Detect MIME type from filename
        const getMimeType = (filename) => {
          const ext = filename.split('.').pop().toLowerCase();
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
        
        const mimeType = getMimeType(file.filename);
        const blob = new Blob([decryptedBuffer], { type: mimeType });
        const url = window.URL.createObjectURL(blob);
        
        if (isViewMode) {
          // View mode - open in-app viewer
          setViewerData(url);
          setIsViewing(true);
        } else {
          // Download mode
          const a = document.createElement('a');
          a.href = url;
          a.download = file.filename;
          a.click();
          window.URL.revokeObjectURL(url);
        }
      } else {
        // Fallback - download encrypted
        const url = window.URL.createObjectURL(encryptedBlob);
        const a = document.createElement('a');
        a.href = url;
        a.download = file.filename + '.encrypted';
        a.click();
        window.URL.revokeObjectURL(url);
      }

    } catch (error) {
      console.error('File access error:', error);
      alert('Failed to access file');
    } finally {
      setDecrypting(false);
    }
  };

  if (loading) return <div>Loading...</div>;
  if (!file) return <div>File not found</div>;

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">{file.filename}</h2>
          <p className="text-muted-foreground">CID: {file.cid}</p>
        </div>
        <div className="flex gap-2">
          {access?.hasAccess && (
            <>
              {access.permissionLevel === 'editor' ? (
                <Button onClick={() => handleDownload(false)} disabled={decrypting}>
                  <Download className="w-4 h-4 mr-2" />
                  {decrypting ? 'Decrypting...' : 'Download'}
                </Button>
              ) : (
                <Button onClick={() => handleDownload(true)} disabled={decrypting} variant="outline">
                  <FileText className="w-4 h-4 mr-2" />
                  {decrypting ? 'Loading...' : 'View'}
                </Button>
              )}
            </>
          )}
          {file.owner.toLowerCase() === account?.toLowerCase() && (
            <>
              <CreatePublicLinkDialog fileId={file.id} fileName={file.filename} fileCid={file.cid} />
              <ShareFileDialog fileId={file.id} fileName={file.filename} />
            </>
          )}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Owner</CardTitle>
            <User className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-xs font-mono truncate">{file.owner}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Created At</CardTitle>
            <History className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-sm font-bold">{file.createdAt}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Access Status</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {access?.hasAccess ? 'Granted' : 'Denied'}
            </div>
            <p className="text-xs text-muted-foreground">
              {access?.permissionLevel || 'None'}
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="history" className="w-full">
        <TabsList>
          <TabsTrigger value="history">Audit Trail</TabsTrigger>
        </TabsList>
        <TabsContent value="history">
          <Card>
            <CardHeader>
              <CardTitle>History</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {history.map((event, i) => (
                  <div key={i} className="flex items-center justify-between border-b pb-4 last:border-0">
                    <div>
                      <p className="font-medium">{event.type}</p>
                      <p className="text-xs text-muted-foreground font-mono">{event.tx}</p>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Block {event.block}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <DocumentViewer
        isOpen={isViewing}
        onClose={() => {
          setIsViewing(false);
          if (viewerData) {
            window.URL.revokeObjectURL(viewerData);
            setViewerData(null);
          }
        }}
        fileData={viewerData}
        fileName={file?.filename}
        canDownload={file?.owner.toLowerCase() === account?.toLowerCase() || access?.permissionLevel === 'editor'}
      />
    </div>
  );
}
