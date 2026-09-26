import { useRef, useState, type DragEvent, type KeyboardEvent, type ReactNode } from 'react';
import { validateFile } from '../lib/fileValidation';

interface FileDropzoneProps {
  accept: string[]; // allowed mime types, e.g. ['video/mp4']
  typeLabel: string; // human wording for errors, e.g. "an MP4, WebM or MOV video"
  maxBytes: number;
  onFile: (file: File) => void; // called only with a file that passed validation
  onReject: (message: string) => void; // called with a friendly error when it didn't
  icon: ReactNode;
  title: string;
  hint: string;
  disabled?: boolean;
  className?: string;
}

// A click-or-drag file picker in the app's soft-UI style. It only picks + validates; the parent decides what to do with the file.
export default function FileDropzone({
  accept,
  typeLabel,
  maxBytes,
  onFile,
  onReject,
  icon,
  title,
  hint,
  disabled,
  className = '',
}: FileDropzoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handle = (file: File | undefined) => {
    if (!file) return;
    const error = validateFile(file, accept, maxBytes, typeLabel);
    if (error) onReject(error);
    else onFile(file);
  };

  const open = () => !disabled && inputRef.current?.click();

  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (!disabled) handle(e.dataTransfer.files?.[0]);
  };

  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      open();
    }
  };

  return (
    <div
      role="button"
      tabIndex={disabled ? -1 : 0}
      aria-disabled={disabled}
      onClick={open}
      onKeyDown={onKeyDown}
      onDragOver={(e) => {
        e.preventDefault(); // required, otherwise the browser won't allow a drop here
        if (!disabled) setIsDragging(true);
      }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={onDrop}
      className={`flex flex-col items-center justify-center text-center gap-2 rounded-2xl border-2 border-dashed px-6 py-8 cursor-pointer transition outline-none focus-visible:ring-4 focus-visible:ring-primary-500/20 ${
        isDragging
          ? 'border-primary-500 bg-primary-50'
          : 'border-border-strong bg-surface-strong/50 hover:border-primary-400 hover:bg-primary-50/60'
      } ${disabled ? 'opacity-50 cursor-not-allowed' : ''} ${className}`}
    >
      <div className="w-12 h-12 rounded-full bg-primary-100 text-primary-600 flex items-center justify-center">{icon}</div>
      <p className="text-sm font-semibold text-text">
        {isDragging ? 'Drop it here' : title}
      </p>
      <p className="text-xs text-muted max-w-xs">{hint}</p>

      <input
        ref={inputRef}
        type="file"
        accept={accept.join(',')}
        className="hidden"
        onChange={(e) => {
          handle(e.target.files?.[0]);
          e.target.value = ''; // reset so picking the SAME file again still fires onChange
        }}
      />
    </div>
  );
}
