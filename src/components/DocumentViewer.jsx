'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { X, Download } from 'lucide-react';

export function DocumentViewer({ isOpen, onClose, fileData, fileName, canDownload = true }) {
  const [error, setError] = useState(null);

  if (!isOpen || !fileData) return null;

  // Detect file type from filename
  const getFileType = (filename) => {
    const ext = filename.split('.').pop().toLowerCase();
    if (['jpg', 'jpeg', 'png', 'gif', 'svg', 'webp'].includes(ext)) return 'image';
    if (ext === 'pdf') return 'pdf';
    if (['txt', 'md', 'json', 'js', 'jsx', 'ts', 'tsx', 'css', 'html'].includes(ext)) return 'text';
    return 'download-only';
  };

  const fileType = getFileType(fileName);
  const blobUrl = fileData;

  const handleDownload = () => {
    const a = document.createElement('a');
    a.href = blobUrl;
    a.download = fileName;
    a.click();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl h-[90vh] flex flex-col">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="text-lg font-semibold truncate pr-4">
              {fileName}
            </DialogTitle>
            <div className="flex gap-2">
              {canDownload && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleDownload}
                >
                  <Download className="w-4 h-4 mr-2" />
                  Download
                </Button>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={onClose}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-hidden bg-muted rounded-lg">
          {fileType === 'image' && (
            <div className="w-full h-full flex items-center justify-center p-4">
              <img
                src={blobUrl}
                alt={fileName}
                className="max-w-full max-h-full object-contain"
                onError={() => setError('Failed to load image')}
              />
            </div>
          )}

          {fileType === 'pdf' && (
            <iframe
              src={blobUrl}
              className="w-full h-full border-0"
              title={fileName}
              onError={() => setError('Failed to load PDF. Click download to view offline.')}
            />
          )}

          {fileType === 'text' && (
            <iframe
              src={blobUrl}
              className="w-full h-full border-0 bg-white"
              title={fileName}
              onError={() => setError('Failed to load text file')}
            />
          )}

          {fileType === 'download-only' && (
            <div className="w-full h-full flex flex-col items-center justify-center gap-4 p-8 text-center">
              <div className="text-6xl">📄</div>
              <div>
                <p className="text-lg font-semibold mb-2">Preview not available</p>
                <p className="text-sm text-muted-foreground mb-4">
                  {canDownload 
                    ? "This file type cannot be previewed in the browser.\nClick the download button to view it locally."
                    : "This file type cannot be previewed in the browser."}
                </p>
              </div>
              {canDownload && (
                <Button onClick={handleDownload}>
                  <Download className="w-4 h-4 mr-2" />
                  Download {fileName}
                </Button>
              )}
            </div>
          )}

          {error && (
            <div className="w-full h-full flex flex-col items-center justify-center gap-4 p-8 text-center">
              <div className="text-6xl">⚠️</div>
              <div>
                <p className="text-lg font-semibold mb-2 text-destructive">Error</p>
                <p className="text-sm text-muted-foreground mb-4">{error}</p>
              </div>
              {canDownload && (
                <Button onClick={handleDownload}>
                  <Download className="w-4 h-4 mr-2" />
                  Download Instead
                </Button>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
