import { useEffect, useRef, useState } from 'react';
import { ImagePlus, Loader2, RefreshCw, Trash2, X, TriangleAlert } from 'lucide-react';
import FileDropzone from './FileDropzone';
import { validateFile } from '../lib/fileValidation';
import { getUploadErrorMessage, uploadImage } from '../lib/api/uploads';

const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp']; // keep in sync with the backend's IMAGE_TYPES
const MAX_BYTES = 5 * 1024 * 1024; // 5 MB — same limit the backend enforces
const TYPE_LABEL = 'a JPG, PNG or WebP image';

interface CoverUploaderProps {
  value: string | null | undefined; // current cover URL, if any
  onChange: (url: string | null) => void; // called with the new URL after upload, or null when removed
  disabled?: boolean;
  onBusyChange?: (busy: boolean) => void; // lets the parent disable its Save/Create button while an upload runs
}

// Course cover picker: empty -> dropzone; uploading -> local preview + progress; done -> image with Replace / Remove.
export default function CoverUploader({ value, onChange, disabled, onBusyChange }: CoverUploaderProps) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null); // local blob preview while the upload runs
  const [progress, setProgress] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [imageFailed, setImageFailed] = useState<string | null>(null); // url that failed to load
  const abortRef = useRef<AbortController | null>(null);
  const replaceInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => onBusyChange?.(uploading), [uploading, onBusyChange]);
  useEffect(() => () => abortRef.current?.abort(), []); // leaving the page cancels an in-flight upload

  const startUpload = async (file: File) => {
    setError(null);
    setProgress(0);
    setUploading(true);
    const localUrl = URL.createObjectURL(file); // instant preview, before the server has responded
    setPreviewUrl(localUrl);
    abortRef.current = new AbortController();
    try {
      const result = await uploadImage(file, setProgress, abortRef.current.signal);
      onChange(result.url);
    } catch (err) {
      const message = getUploadErrorMessage(err);
      if (message !== 'Upload cancelled.') setError(message);
    } finally {
      URL.revokeObjectURL(localUrl); // free the blob
      setPreviewUrl(null);
      setUploading(false);
    }
  };

  const onReplacePicked = (file: File | undefined) => {
    if (!file) return;
    const problem = validateFile(file, IMAGE_TYPES, MAX_BYTES, TYPE_LABEL);
    if (problem) setError(problem);
    else startUpload(file);
  };

  const frame = 'relative aspect-video w-full overflow-hidden rounded-xl bg-surface-strong';

  return (
    <div>
      {uploading && previewUrl ? (
        <div className={frame}>
          <img src={previewUrl} alt="" className="h-full w-full object-cover" />
          <div className="absolute inset-0 bg-text/50 flex flex-col items-center justify-center gap-2 text-white">
            <Loader2 className="w-6 h-6 animate-spin" />
            <span className="text-sm font-semibold">Uploading… {Math.round(progress * 100)}%</span>
            <button
              type="button"
              onClick={() => abortRef.current?.abort()}
              className="mt-1 inline-flex items-center gap-1 rounded-full bg-white/20 hover:bg-white/30 px-3 py-1 text-xs font-medium transition"
            >
              <X className="w-3 h-3" /> Cancel
            </button>
          </div>
        </div>
      ) : value ? (
        <div className={frame}>
          {imageFailed === value ? (
            <div className="h-full w-full flex flex-col items-center justify-center gap-1 text-muted text-xs">
              <TriangleAlert className="w-5 h-5" />
              Couldn't load this image
            </div>
          ) : (
            <img src={value} alt="Course cover" onError={() => setImageFailed(value)} className="h-full w-full object-cover" />
          )}
          {!disabled && (
            <div className="absolute bottom-2 right-2 flex gap-2">
              <button
                type="button"
                onClick={() => replaceInputRef.current?.click()}
                className="inline-flex items-center gap-1.5 rounded-full bg-surface/95 px-3 py-1.5 text-xs font-semibold text-text shadow-soft hover:bg-surface transition"
              >
                <RefreshCw className="w-3 h-3" /> Replace
              </button>
              <button
                type="button"
                onClick={() => {
                  setError(null);
                  onChange(null);
                }}
                className="inline-flex items-center gap-1.5 rounded-full bg-surface/95 px-3 py-1.5 text-xs font-semibold text-danger-600 shadow-soft hover:bg-surface transition"
              >
                <Trash2 className="w-3 h-3" /> Remove
              </button>
            </div>
          )}
          <input
            ref={replaceInputRef}
            type="file"
            accept={IMAGE_TYPES.join(',')}
            className="hidden"
            onChange={(e) => {
              onReplacePicked(e.target.files?.[0]);
              e.target.value = '';
            }}
          />
        </div>
      ) : (
        <FileDropzone
          accept={IMAGE_TYPES}
          typeLabel={TYPE_LABEL}
          maxBytes={MAX_BYTES}
          onFile={startUpload}
          onReject={setError}
          disabled={disabled}
          icon={<ImagePlus className="w-5 h-5" />}
          title="Add a cover image"
          hint="Drag & drop or click. 16:9 works best (e.g. 1280×720). JPG, PNG or WebP, up to 5 MB."
          className="aspect-video"
        />
      )}

      {error && (
        <p className="mt-2 flex items-start gap-1.5 text-xs text-danger-600">
          <TriangleAlert className="w-3.5 h-3.5 mt-px shrink-0" />
          {error}
        </p>
      )}
    </div>
  );
}
