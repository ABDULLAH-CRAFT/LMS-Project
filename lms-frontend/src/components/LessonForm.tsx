import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { api } from '../lib/axios';

export interface LessonFormValues {
  title: string;
  contentType: 'text' | 'video';
  content: string;
}

interface LessonFormProps {
  initial?: LessonFormValues; // present when editing an existing lesson
  submitLabel: string;
  isSaving: boolean;
  error?: string | null;
  onSubmit: (values: LessonFormValues) => void;
  onCancel: () => void;
}

const inputClass =
  'w-full bg-surface-strong border border-border rounded-lg px-3 py-2 text-sm text-text placeholder:text-placeholder outline-none focus:border-primary-500/50 focus:ring-4 focus:ring-primary-500/10 transition';

export default function LessonForm({ initial, submitLabel, isSaving, error, onSubmit, onCancel }: LessonFormProps) {
  const [values, setValues] = useState<LessonFormValues>(initial ?? { title: '', contentType: 'text', content: '' });

  // uploads the actual video file, returns the URL to store as the lesson's `content`
  const uploadVideoMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('video', file);
      const response = await api.post<{ url: string }>('/uploads/video', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return response.data.url;
    },
    onSuccess: (url) => setValues((prev) => ({ ...prev, content: url })),
  });

  const isValid = values.title.trim().length >= 3 && values.content.trim().length > 0;

  return (
    <div className="border-t border-border pt-4 mt-2">
      <input
        type="text"
        placeholder="Lesson title (min 3 characters)"
        value={values.title}
        onChange={(e) => setValues({ ...values, title: e.target.value })}
        className={`${inputClass} mb-2`}
      />
      <select
        value={values.contentType}
        onChange={(e) => setValues({ ...values, contentType: e.target.value as 'text' | 'video', content: '' })}
        className={`${inputClass} mb-2`}
      >
        <option value="text" className="bg-[#0a0a12]">Text</option>
        <option value="video" className="bg-[#0a0a12]">Video</option>
      </select>

      {values.contentType === 'text' ? (
        <textarea
          placeholder="Lesson content"
          value={values.content}
          onChange={(e) => setValues({ ...values, content: e.target.value })}
          rows={4}
          className={`${inputClass} mb-2`}
        />
      ) : (
        <div className="mb-2">
          <input
            type="file"
            accept="video/*"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) uploadVideoMutation.mutate(file);
            }}
            className="w-full text-xs text-muted file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-surface-strong file:text-text hover:file:bg-surface-high"
          />
          {uploadVideoMutation.isPending && <p className="text-xs text-muted mt-1">Uploading...</p>}
          {uploadVideoMutation.isError && <p className="text-xs text-red-500 mt-1">Video upload failed.</p>}
          <input
            type="text"
            placeholder="...or paste a video URL instead"
            value={values.content}
            onChange={(e) => setValues({ ...values, content: e.target.value })}
            className={`${inputClass} mt-2`}
          />
        </div>
      )}

      {error && <p className="text-xs text-red-500 mb-2">{error}</p>}

      <div className="flex gap-2">
        <button
          onClick={() => onSubmit({ ...values, title: values.title.trim() })}
          disabled={isSaving || uploadVideoMutation.isPending || !isValid}
          className="bg-gradient-to-r from-primary-600 to-secondary-400 text-white px-4 py-1.5 rounded-lg text-xs font-semibold disabled:opacity-50"
        >
          {isSaving ? 'Saving...' : submitLabel}
        </button>
        <button onClick={onCancel} className="text-muted text-xs px-4 py-1.5 hover:text-text transition">
          Cancel
        </button>
      </div>
    </div>
  );
}