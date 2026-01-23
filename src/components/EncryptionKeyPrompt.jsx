'use client';

import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Key, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';
import { useWeb3 } from '@/components/providers/Web3Provider';
import { getContract } from '@/lib/contract';
import { toast } from 'sonner';

export function EncryptionKeyPrompt() {
  const { account, signer } = useWeb3();
  const [isOpen, setIsOpen] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  const [error, setError] = useState(null);
  const [hasKey, setHasKey] = useState(null);

  useEffect(() => {
    const checkKeyRegistration = async () => {
      if (!signer || !account) return;

      try {
        const contract = getContract(signer);
        const publicKey = await contract.encryptionKeys(account);
        
        if (!publicKey || publicKey === '') {
          setHasKey(false);
          setIsOpen(true);
        } else {
          setHasKey(true);
          setIsOpen(false);
        }
      } catch (error) {
        console.error('[EncryptionKeyPrompt] Failed to check registration:', error);
      }
    };

    checkKeyRegistration();
  }, [signer, account]);

  const handleRegister = async () => {
    if (!signer || !account) return;

    setIsRegistering(true);
    setError(null);

    try {
      // Step 1: Request encryption public key from MetaMask
      console.log('[EncryptionKeyPrompt] Requesting encryption public key...');
      toast.info('Requesting encryption key from MetaMask...');
      
      const publicKey = await window.ethereum.request({
        method: 'eth_getEncryptionPublicKey',
        params: [account],
      });

      console.log('[EncryptionKeyPrompt] Got public key, registering on-chain...');
      toast.info('Registering key on blockchain...');

      // Step 2: Register on blockchain
      const contract = getContract(signer);
      const tx = await contract.registerPublicKey(publicKey);
      
      console.log('[EncryptionKeyPrompt] Transaction sent, waiting for confirmation...');
      toast.loading('Waiting for blockchain confirmation...');
      
      await tx.wait();

      console.log('[EncryptionKeyPrompt] Registration complete!');
      setHasKey(true);
      setIsOpen(false);
      
      // Show success message
      toast.success('✅ Encryption key registered! You can now receive encrypted files.');
    } catch (error) {
      console.error('[EncryptionKeyPrompt] Registration failed:', error);
      const errorMessage = error.message || 'Failed to register encryption key';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsRegistering(false);
    }
  };

  const handleDismiss = () => {
    setIsOpen(false);
    toast.info('You can register your encryption key later from Settings');
  };

  if (hasKey === null) return null; // Still checking
  if (hasKey) return null; // Already registered

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Key className="w-5 h-5 text-primary" />
            Enable Secure File Sharing
          </DialogTitle>
          <DialogDescription>
            Register your encryption key to allow others to share files with you securely
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              To receive encrypted files, you need to register your public encryption key on the blockchain.
              This is a <strong>one-time transaction</strong>.
            </AlertDescription>
          </Alert>

          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              <strong>What happens:</strong>
            </p>
            <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
              <li>MetaMask will request permission to access your encryption key</li>
              <li>Your public key will be stored on the blockchain</li>
              <li>Others can use your registered key to share files with you</li>
              <li>Your private key always stays secure in MetaMask</li>
            </ul>
          </div>
        </div>

        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={handleDismiss}
            disabled={isRegistering}
            className="flex-1"
          >
            Later
          </Button>
          <Button
            onClick={handleRegister}
            disabled={isRegistering}
            className="flex-1"
          >
            {isRegistering ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Registering...
              </>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4 mr-2" />
                Register Key
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
