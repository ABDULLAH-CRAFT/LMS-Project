// YouTube / Vimeo page links can't be played in a <video> tag — they need their embed URL.
// Returns null for anything else (a direct .mp4 / uploaded file), which we play natively.
export function getEmbedUrl(url: string): string | null {
  try {
    const u = new URL(url);
    const host = u.hostname.replace(/^www\./, '').replace(/^m\./, '');
    let id: string | null = null;

    if (host === 'youtu.be') id = u.pathname.slice(1);
    else if (host === 'youtube.com') {
      if (u.pathname === '/watch') id = u.searchParams.get('v');
      else if (u.pathname.startsWith('/embed/') || u.pathname.startsWith('/shorts/')) id = u.pathname.split('/')[2];
    }
    if (id && /^[\w-]{6,}$/.test(id)) return `https://www.youtube-nocookie.com/embed/${id}`;

    if (host === 'vimeo.com') {
      const match = u.pathname.match(/^\/(\d+)/);
      if (match) return `https://player.vimeo.com/video/${match[1]}`;
    }
  } catch {
    // not a valid URL — fall through to null
  }
  return null;
}
