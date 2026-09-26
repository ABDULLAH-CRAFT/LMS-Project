import { useEffect, useRef, useState } from 'react';
import { Film, Link2, Loader2, RefreshCw, Trash2, X, TriangleAlert, CircleCheck } from 'lucide-react';
import FileDropzone from './FileDropzone';
import LessonVideo from './LessonVideo';
import { formatBytes } from '../lib/format';
import { getUploadErrorMessage, uploadVideo } from '../lib/api/uploads';
import { inputClass, secondaryButtonClass } from '../config/ui';

const VIDEO_TYPES = ['video/mp4', 'video/webm', 'video/quicktime']; // keep in sync with the backend's VIDEO_TYPES
const MAX_BYTES = 500 * 1024 * 1024; // 500 MB — same limit the backend enforces
const TYPE_LABEL = 'an MP4, WebM or MOV video';

interface VideoUploaderProps {
  value: string; // the video URL (uploaded file OR pasted link); '' when none yet
  onChange: (url: string) => void;
  onBusyChange?: (busy: boolean) => void; // lets the parent disable "Save lesson" while an upload is running
}

// Lesson video picker: dropzone with real progress + cancel -> instant preview. Also accepts a pasted link.
export default function VideoUploader({ value, onChange, onBusyChange }: VideoUploaderProps) {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [file, setFile] = useState<{ name: string; size: number } | null>(null);
  const [source, setSource] = useState<'upload' | 'link'>('upload'); // how the current `value` got here — only used for the label
  const [error, setError] = useState<string | null>(null);
  const [showLinkInput, setShowLinkInput] = useState(false);
  const [linkDraft, setLinkDraft] = useState('');
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => onBusyChange?.(uploading), [uploading, onBusyChange]);
  useEffect(() => () => abortRef.current?.abort(), []); // leaving the form cancels an in-flight upload

  const startUpload = async (picked: File) => {
    setError(null);
    setProgress(0);
    setFile({ name: picked.name, size: picked.size });
    setUploading(true);
    abortRef.current = new AbortController();
    try {
      const result = await uploadVideo(picked, setProgress, abortRef.current.signal);
      setSource('upload');
      onChange(result.url);
    } catch (err) {
      const message = getUploadErrorMessage(err);
      if (message !== 'Upload cancelled.') setError(message);
    } finally {
      setUploading(false);
    }
  };

  const submitLink = () => {
    const link = linkDraft.trim();
    try {
      new URL(link); // throws if it isn't a valid absolute URL
    } catch {
      setError('Please paste a full link, starting with http:// or https://');
      return;
    }
    setError(null);
    setSource('link');
    onChange(link);
    setLinkDraft('');
    setShowLinkInput(false);
  };

  const clear = () => {
    setError(null);
    setFile(null);
    onChange('');
  };

  // ---------- 1) uploading ----------
  if (uploading && file) {
    return (
      <div className="rounded-2xl border border-border bg-surface-strong/50 p-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary-100 text-primary-600 flex items-center justify-center shrink-0">
            <Loader2 className="w-5 h-5 animate-spin" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-text truncate">{file.name}</p>
            <p className="text-xs text-muted">
              {Math.round(progress * 100)}% · {formatBytes(file.size * progress)} of {formatBytes(file.size)}
            </p>
          </div>
          <button
            type="button"
            onClick={() => abortRef.current?.abort()}
            className="inline-flex items-center gap-1 rounded-full bg-surface border border-border px-3 py-1.5 text-xs font-semibold text-muted-dark hover:text-danger-600 transition"
          >
            <X className="w-3 h-3" /> Cancel
          </button>
        </div>
        <div className="mt-3 h-2 rounded-full bg-surface-high overflow-hidden">
          <div
            className="h-2 rounded-full bg-gradient-to-r from-primary-600 to-secondary-400 transition-[width] duration-200"
            style={{ width: `${Math.round(progress * 100)}%` }}
          />
        </div>
        <p className="mt-2 text-[11px] text-muted">Keep this tab open until the upload finishes.</p>
      </div>
    );
  }

  // ---------- 2) have a video: preview it ----------
  if (value) {
    return (
      <div>
        <LessonVideo url={value} className="max-w-lg" /> {/* capped so the Save button stays on screen */}
        <div className="mt-3 flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-secondary-100 text-secondary-600 px-2.5 py-1 text-[11px] font-semibold">
            <CircleCheck className="w-3 h-3" />
            {source === 'upload' ? 'Uploaded' : 'Linked'}
          </span>
          {file && source === 'upload' && (
            <span className="text-xs text-muted truncate min-w-0">
              {file.name} · {formatBytes(file.size)}
            </span>
          )}
          <button
            type="button"
            onClick={clear}
            className="ml-auto inline-flex items-center gap-1.5 text-xs font-semibold text-muted-dark hover:text-primary-700 transition shrink-0"
          >
            <RefreshCw className="w-3 h-3" /> Replace
          </button>
          <button
            type="button"
            onClick={clear}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-danger-600 hover:text-danger-700 transition shrink-0"
          >
            <Trash2 className="w-3 h-3" /> Remove
          </button>
        </div>
      </div>
    );
  }

  // ---------- 3) nothing yet: dropzone (+ optional link) ----------
  return (
    <div>
      <FileDropzone
        accept={VIDEO_TYPES}
        typeLabel={TYPE_LABEL}
        maxBytes={MAX_BYTES}
        onFile={startUpload}
        onReject={setError}
        icon={<Film className="w-5 h-5" />}
        title="Drag & drop your video here, or click to browse"
        hint="MP4, WebM or MOV · up to 500 MB"
      />

      {showLinkInput ? (
        <div className="mt-3 flex gap-2">
          <input
            type="url"
            autoFocus
            value={linkDraft}
            onChange={(e) => setLinkDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                submitLink();
              }
            }}
            placeholder="Paste a YouTube, Vimeo or direct .mp4 link"
            className={inputClass}
          />
          <button type="button" onClick={submitLink} disabled={!linkDraft.trim()} className={secondaryButtonClass}>
            Add
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setShowLinkInput(true)}
          className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-primary-600 hover:text-primary-700 transition"
        >
          <Link2 className="w-3.5 h-3.5" /> Or use a video link instead
        </button>
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
