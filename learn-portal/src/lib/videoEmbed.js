export function toEmbedUrl(provider, url) {
  if (!url) return null;

  if (provider === 'youtube') {
    const watchMatch = url.match(/[?&]v=([^&]+)/);
    const shortMatch = url.match(/youtu\.be\/([^?&]+)/);
    const id = watchMatch?.[1] ?? shortMatch?.[1];
    return id ? `https://www.youtube.com/embed/${id}` : url;
  }

  if (provider === 'vimeo') {
    const idMatch = url.match(/vimeo\.com\/(?:video\/)?(\d+)/);
    return idMatch ? `https://player.vimeo.com/video/${idMatch[1]}` : url;
  }

  return url;
}
