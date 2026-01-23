'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useWeb3 } from '@/components/providers/Web3Provider';
import { getContract } from '@/lib/contract';
import { useEffect, useState } from 'react';
import { FileText, ExternalLink, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import Link from 'next/link';
import { motion } from 'framer-motion';

export default function SharedWithMePage() {
  const { signer, account } = useWeb3();
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const fetchFiles = async () => {
      if (!signer) {
        console.log('[SharedWithMe] No signer available');
        return;
      }
      
      console.log('[SharedWithMe] Fetching shared files for account:', account);
      setLoading(true);
      try {
        const contract = getContract(signer);
        
       
        const filter = contract.filters.AccessGranted(null, null, account);
        console.log('[SharedWithMe] Event filter created for recipient:', account);
        
        const events = await contract.queryFilter(filter);
        console.log('[SharedWithMe] Found', events.length, 'AccessGranted events');
        
        const filePromises = events.map(async (event) => {
          const fileId = event.args[0];
          console.log('[SharedWithMe] Processing fileId:', fileId.toString());
          
          const details = await contract.getFileDetails(fileId);
          console.log('[SharedWithMe] File details:', details);
          
          
          const expiresAtRaw = event.args[4];
          const expiresAt = expiresAtRaw ? Number(expiresAtRaw.toString()) : 0;
          
          return {
            id: details.fileId.toString(),
            filename: details.filename,
            owner: details.owner,
            createdAt: new Date(Number(details.createdAt) * 1000).toLocaleDateString(),
            permission: event.args[3] || 'read_only',
            expiresAt: expiresAt
          };
        });

        const fetchedFiles = await Promise.all(filePromises);
        console.log('[SharedWithMe] Fetched files:', fetchedFiles);
        
        
        const fileMap = new Map();
        fetchedFiles.forEach(file => {
          const existing = fileMap.get(file.id);
          if (!existing || file.expiresAt > existing.expiresAt) {
            fileMap.set(file.id, file);
          }
        });
        const uniqueFiles = Array.from(fileMap.values());
        console.log('[SharedWithMe] Unique files after deduplication:', uniqueFiles);
        
        setFiles(uniqueFiles);
      } catch (error) {
        console.error('[SharedWithMe] Error fetching shared files:', error);
        console.error('[SharedWithMe] Error stack:', error.stack);
      } finally {
        setLoading(false);
      }
    };

    fetchFiles();
  }, [signer, account]);

  const getExpirationStatus = (expiresAt) => {
    if (!expiresAt || expiresAt === 0) {
      return { text: 'Permanent', color: 'text-green-500', badge: 'bg-green-500/10' };
    }
    
    const now = Math.floor(Date.now() / 1000);
    const expiresAtNum = Number(expiresAt);
    
    if (now >= expiresAtNum) {
      return { text: 'Expired', color: 'text-red-500', badge: 'bg-red-500/10' };
    }
    
    const timeLeft = expiresAtNum - now;
    const hours = Math.floor(timeLeft / 3600);
    const days = Math.floor(hours / 24);
    
    if (days > 0) {
      return { text: `${days}d left`, color: 'text-yellow-500', badge: 'bg-yellow-500/10' };
    }
    if (hours > 0) {
      return { text: `${hours}h left`, color: 'text-yellow-500', badge: 'bg-yellow-500/10' };
    }
    return { text: '<1h left', color: 'text-red-500', badge: 'bg-red-500/10' };
  };

  const filteredFiles = files.filter(file =>
    file.filename.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h2 className="text-3xl font-bold tracking-tight">Shared With Me</h2>
        <p className="text-muted-foreground mt-1">
          Files that others have shared with you
        </p>
      </motion.div>

      {/* Search */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search shared files..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      </motion.div>

      {/* Files Table */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <Card className="border-border/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-primary" />
              Shared Files ({filteredFiles.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="p-6 space-y-4">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="flex items-center gap-4">
                    <Skeleton className="h-12 w-12 rounded-lg" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-1/3" />
                      <Skeleton className="h-3 w-1/4" />
                    </div>
                  </div>
                ))}
              </div>
            ) : filteredFiles.length === 0 ? (
              <div className="text-center py-16 px-4">
                <div className="w-16 h-16 rounded-full bg-accent/10 flex items-center justify-center mx-auto mb-4">
                  <FileText className="w-8 h-8 text-accent" />
                </div>
                <h3 className="text-lg font-semibold mb-2">No shared files</h3>
                <p className="text-muted-foreground">
                  {searchQuery ? 'No files match your search' : 'No files have been shared with you yet'}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead>Name</TableHead>
                      <TableHead>Owner</TableHead>
                      <TableHead>Permission</TableHead>
                      <TableHead>Expires</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredFiles.map((file, index) => (
                      <motion.tr
                        key={file.id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.05 }}
                        className="group hover:bg-accent/5 transition-colors"
                      >
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-accent/10 group-hover:bg-accent/20 transition-colors">
                              <FileText className="w-4 h-4 text-accent" />
                            </div>
                            <div>
                              <div className="font-medium">{file.filename}</div>
                              <div className="text-xs text-muted-foreground">Encrypted</div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <code className="text-xs bg-muted px-2 py-1 rounded">
                            {file.owner.substring(0, 6)}...{file.owner.substring(38)}
                          </code>
                        </TableCell>
                        <TableCell>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            file.permission === 'editor' ? 'bg-primary/10 text-primary' : 'bg-accent/10 text-accent'
                          }`}>
                            {file.permission === 'editor' ? 'Editor' : 'Read Only'}
                          </span>
                        </TableCell>
                        <TableCell>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            getExpirationStatus(file.expiresAt).badge
                          } ${getExpirationStatus(file.expiresAt).color}`}>
                            {getExpirationStatus(file.expiresAt).text}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          <Link href={`/file/${file.id}`}>
                            <Button variant="ghost" size="icon" className="opacity-0 group-hover:opacity-100 transition-opacity">
                              <ExternalLink className="w-4 h-4" />
                            </Button>
                          </Link>
                        </TableCell>
                      </motion.tr>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
