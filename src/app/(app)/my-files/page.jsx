'use client';

import { FileUploadDialog } from '@/components/FileUploadDialog';
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
import { FileText, Share2, Download, MoreVertical, Search, Trash2, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Skeleton } from '@/components/ui/skeleton';

export default function MyFilesPage() {
  const { signer, account } = useWeb3();
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [deletingId, setDeletingId] = useState(null);

  const fetchFiles = async () => {
    if (!signer) return;
    setLoading(true);
    try {
      const contract = getContract(signer);
      const filter = contract.filters.FileRegistered(null, account);
      const events = await contract.queryFilter(filter);
      
      const filePromises = events.map(async (event) => {
        try {
          const details = await contract.getFileDetails(event.args[0]);
          
          if (details.isDeleted) return null;
          
          return {
            id: details.fileId.toString(),
            filename: details.filename,
            cid: details.currentCid,
            createdAt: new Date(Number(details.createdAt) * 1000).toLocaleDateString(),
            size: 'Encrypted', 
          };
        } catch (e) {
          console.error("Error fetching file details:", e);
          return null;
        }
      });

      const fetchedFiles = (await Promise.all(filePromises)).filter(f => f !== null);
      setFiles(fetchedFiles);
    } catch (error) {
      console.error('Error fetching files:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFiles();
  }, [signer, account]);

  const handleDelete = async (fileId, cid) => {
    if (!confirm('Are you sure you want to delete this file? This will remove it from the blockchain registry and attempt to unpin it from IPFS.')) return;
    
    setDeletingId(fileId);
    try {
    
      const contract = getContract(signer);
      const tx = await contract.deleteFile(fileId);
      await tx.wait();
      
      try {
        const token = sessionStorage.getItem('jwt_token'); 
      
        const authToken = localStorage.getItem('token');
        if (authToken) {
            await fetch('/api/files/unpin', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${authToken}`
                },
                body: JSON.stringify({ cid })
            });
            console.log('File unpinned from Pinata');
        } else {
            console.warn('No auth token found, skipping Pinata unpin');
        }

      } catch (pinataError) {
        console.error('Failed to unpin from Pinata:', pinataError);
       
      }

      
      setFiles(files.filter(f => f.id !== fileId));
      alert('File deleted successfully');
    } catch (error) {
      console.error('Error deleting file:', error);
      alert('Failed to delete file: ' + error.message);
    } finally {
      setDeletingId(null);
    }
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
        className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
      >
        <div>
          <h2 className="text-3xl font-bold tracking-tight">My Files</h2>
          <p className="text-muted-foreground mt-1">
            Manage and share your encrypted files
          </p>
        </div>
        <FileUploadDialog onUploadSuccess={fetchFiles} />
      </motion.div>

      {/* Search and Filter */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="flex gap-4"
      >
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search files..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      </motion.div>

      {/* Files Table/Grid */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <Card className="border-border/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-primary" />
              Your Files ({filteredFiles.length})
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
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                  <FileText className="w-8 h-8 text-primary" />
                </div>
                <h3 className="text-lg font-semibold mb-2">No files yet</h3>
                <p className="text-muted-foreground mb-6">
                  {searchQuery ? 'No files match your search' : 'Upload your first file to get started'}
                </p>
                {!searchQuery && <FileUploadDialog onUploadSuccess={fetchFiles} />}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead>Name</TableHead>
                      <TableHead>CID</TableHead>
                      <TableHead>Size</TableHead>
                      <TableHead>Created</TableHead>
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
                            <div className="p-2 rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-colors">
                              <FileText className="w-4 h-4 text-primary" />
                            </div>
                            <div>
                              <div className="font-medium">{file.filename}</div>
                              <div className="text-xs text-muted-foreground">Encrypted</div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <code className="text-xs bg-muted px-2 py-1 rounded">
                            {file.cid.substring(0, 8)}...
                          </code>
                        </TableCell>
                        <TableCell className="text-muted-foreground">{file.size}</TableCell>
                        <TableCell className="text-muted-foreground">{file.createdAt}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            
                            <Link href={`/file/${file.id}`}>
                              <Button variant="ghost" size="icon" className="opacity-0 group-hover:opacity-100 transition-opacity" title="Share File">
                                <Share2 className="w-4 h-4" />
                              </Button>
                            </Link>

                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive hover:bg-destructive/10"
                              onClick={() => handleDelete(file.id, file.cid)}
                              disabled={deletingId === file.id}
                              title="Delete File"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
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

      {/* Stats */}
      {files.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="grid grid-cols-1 sm:grid-cols-3 gap-4"
        >
          <Card className="border-border/50">
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-primary">{files.length}</div>
              <div className="text-sm text-muted-foreground">Total Files</div>
            </CardContent>
          </Card>
          <Card className="border-border/50">
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-accent">
                {files.length}
              </div>
              <div className="text-sm text-muted-foreground">Encrypted Files</div>
            </CardContent>
          </Card>
          <Card className="border-border/50">
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-chart-2">100%</div>
              <div className="text-sm text-muted-foreground">Encrypted</div>
            </CardContent>
          </Card>
        </motion.div>
      )}
    </div>
  );
}
