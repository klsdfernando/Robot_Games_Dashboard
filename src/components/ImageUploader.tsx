'use client';

import React, { useState, useRef } from 'react';
import Image from 'next/image';
import { 
  UploadCloud, 
  ImageIcon, 
  Link as LinkIcon, 
  Trash2, 
  Loader2, 
  Check, 
  Copy, 
  ExternalLink,
  Sparkles,
  AlertCircle
} from 'lucide-react';

interface ImageUploaderProps {
  value: string;
  onChange: (url: string) => void;
  label?: string;
  description?: string;
  disabled?: boolean;
}

export default function ImageUploader({
  value,
  onChange,
  label = 'Team Logo / Image',
  description = 'Upload an image file directly or paste a Google Drive / web image link to host on Freeimage.host CDN.',
  disabled = false
}: ImageUploaderProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [urlInput, setUrlInput] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isFreeImageCdn = value.includes('iili.io') || value.includes('freeimage.host');

  const handleFileUpload = async (file: File) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setError('Please select a valid image file (PNG, JPG, WEBP, SVG, GIF)');
      return;
    }

    setIsUploading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to upload image to Freeimage.host');
      }

      onChange(data.url);
      setUrlInput('');
    } catch (err: any) {
      setError(err.message || 'Image upload failed. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleHostFromUrl = async () => {
    const raw = urlInput.trim();
    if (!raw) {
      setError('Please enter a valid image URL or Google Drive link first');
      return;
    }

    setIsUploading(true);
    setError(null);

    try {
      const res = await fetch('/api/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: raw })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to host image from URL');
      }

      onChange(data.url);
      setUrlInput('');
    } catch (err: any) {
      setError(err.message || 'Failed to host image from URL');
    } finally {
      setIsUploading(false);
    }
  };

  const handleCopyLink = () => {
    if (!value) return;
    navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (disabled || isUploading) return;
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileUpload(e.dataTransfer.files[0]);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="block text-xs font-semibold text-slate-300">
          {label}
        </label>
        {value && isFreeImageCdn && (
          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-400 bg-emerald-950/40 border border-emerald-500/30 px-2 py-0.5 rounded-full">
            <Sparkles className="w-2.5 h-2.5 text-emerald-300" />
            Hosted on Freeimage CDN (iili.io)
          </span>
        )}
      </div>

      {/* Preview Card if an image exists */}
      {value ? (
        <div className="relative p-3.5 rounded-2xl bg-slate-900/90 border border-white/10 flex items-center justify-between gap-4 overflow-hidden group">
          <div className="flex items-center gap-3.5 min-w-0">
            <div className="relative w-14 h-14 rounded-xl bg-black/50 border border-white/10 overflow-hidden flex items-center justify-center shrink-0">
              <Image
                src={value}
                alt="Logo preview"
                fill
                unoptimized
                className="object-contain p-1"
                onError={(e) => {
                  (e.target as HTMLElement).style.display = 'none';
                }}
              />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-white truncate max-w-[200px] sm:max-w-xs md:max-w-md" title={value}>
                {value}
              </p>
              <div className="flex items-center gap-2 mt-1">
                <button
                  type="button"
                  onClick={handleCopyLink}
                  className="inline-flex items-center gap-1 text-[11px] text-blue-400 hover:text-blue-300 transition-colors"
                >
                  {copied ? (
                    <>
                      <Check className="w-3 h-3 text-emerald-400" />
                      <span className="text-emerald-400 font-semibold">Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3" />
                      <span>Copy link</span>
                    </>
                  )}
                </button>
                <span className="text-slate-600">•</span>
                <a
                  href={value}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-[11px] text-slate-400 hover:text-slate-200 transition-colors"
                >
                  <ExternalLink className="w-3 h-3" />
                  <span>Open in tab</span>
                </a>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              disabled={disabled || isUploading}
              onClick={() => fileInputRef.current?.click()}
              className="p-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-white/10 transition-colors disabled:opacity-50"
              title="Replace image"
            >
              Replace
            </button>
            <button
              type="button"
              disabled={disabled || isUploading}
              onClick={() => onChange('')}
              className="p-2 rounded-xl text-xs font-semibold text-rose-400 hover:bg-rose-500/10 border border-rose-500/20 transition-colors disabled:opacity-50"
              title="Remove image"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      ) : (
        /* Empty Upload Dropzone */
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          className={`relative border-2 border-dashed rounded-2xl p-4 sm:p-5 text-center transition-all ${
            isDragging
              ? 'border-blue-400 bg-blue-950/20 scale-[0.99]'
              : 'border-white/10 hover:border-blue-500/40 bg-slate-900/50 hover:bg-slate-900/80'
          }`}
        >
          {isUploading ? (
            <div className="py-4 flex flex-col items-center justify-center gap-2 text-slate-300">
              <Loader2 className="w-7 h-7 text-blue-400 animate-spin" />
              <p className="text-xs font-medium">Uploading & hosting on Freeimage.host CDN...</p>
              <p className="text-[10px] text-slate-500">Generating permanent direct link</p>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center gap-2">
              <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20 flex items-center justify-center">
                <UploadCloud className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-semibold text-white">
                  Drop image here, or{' '}
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={disabled}
                    className="text-blue-400 hover:underline font-bold"
                  >
                    browse computer
                  </button>
                </p>
                <p className="text-[10px] text-slate-500 mt-0.5">
                  PNG, JPG, WEBP, SVG up to 10MB • Auto-hosted to high-speed CDN
                </p>
              </div>

              {/* Or paste link line */}
              <div className="w-full flex items-center gap-2 my-1">
                <div className="flex-1 h-px bg-white/10" />
                <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">or host from url</span>
                <div className="flex-1 h-px bg-white/10" />
              </div>

              <div className="w-full flex items-center gap-2">
                <div className="relative flex-1">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                    <LinkIcon className="w-3.5 h-3.5" />
                  </div>
                  <input
                    type="url"
                    value={urlInput}
                    onChange={(e) => setUrlInput(e.target.value)}
                    placeholder="Paste Google Drive link or image URL..."
                    disabled={disabled || isUploading}
                    className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-950 border border-white/10 text-white text-xs placeholder:text-slate-600 focus:outline-none focus:border-blue-400"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleHostFromUrl();
                      }
                    }}
                  />
                </div>
                <button
                  type="button"
                  onClick={handleHostFromUrl}
                  disabled={disabled || isUploading || !urlInput.trim()}
                  className="px-3 py-2 rounded-xl text-xs font-bold bg-blue-500 hover:bg-blue-400 text-black transition-colors disabled:opacity-40 disabled:cursor-not-allowed shrink-0 shadow-sm"
                >
                  Host Link
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/svg+xml,image/gif"
        className="hidden"
        onChange={(e) => {
          if (e.target.files && e.target.files[0]) {
            handleFileUpload(e.target.files[0]);
          }
        }}
      />

      {/* Error message if any */}
      {error && (
        <div className="flex items-center gap-2 text-rose-400 bg-rose-950/30 border border-rose-500/20 px-3 py-2 rounded-xl text-xs">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {description && !value && (
        <p className="text-[10px] text-slate-500">
          {description}
        </p>
      )}
    </div>
  );
}
