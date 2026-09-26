import { useState } from 'react';
import { TriangleAlert } from 'lucide-react';
import { getEmbedUrl } from '../lib/video';

interface LessonVideoProps {
  url: string;
  onEnded?: () => void; // only fires for native (uploaded/direct) videos — embedded players don't report it
  className?: string;
}

// Plays a lesson video: uploaded files and direct links natively, YouTube/Vimeo links via their embed player.
export default function LessonVideo({ url, onEnded, className = '' }: LessonVideoProps) {
  const [failedUrl, setFailedUrl] = useState<string | null>(null); // remembers WHICH url failed, so a new url starts fresh
  const embed = getEmbedUrl(url);

  if (embed) {
    return (
      <div className={`aspect-video overflow-hidden rounded-2xl bg-black shadow-soft ${className}`}>
        <iframe
          src={embed}
          title="Lesson video"
          className="w-full h-full"
          allow="accelerometer; encrypted-media; picture-in-picture; fullscreen"
          allowFullScreen
        />
      </div>
    );
  }

  if (failedUrl === url) {
    return (
      <div className={`flex items-start gap-3 rounded-2xl bg-danger-50 border border-danger-100 p-4 text-sm text-danger-700 ${className}`}>
        <TriangleAlert className="w-4 h-4 mt-0.5 shrink-0" />
        <p>
          This video couldn't be played. If it's a link, make sure it points straight to a video file (.mp4, .webm) or is
          a YouTube / Vimeo link.
        </p>
      </div>
    );
  }

  return (
    <video
      key={url}
      controls
      preload="metadata" // loads just enough to show the first frame + duration, not the whole file
      src={url}
      onEnded={onEnded}
      onError={() => setFailedUrl(url)}
      className={`w-full rounded-2xl bg-black shadow-soft ${className}`}
    />
  );
}
