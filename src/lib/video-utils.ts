export interface VideoInfo {
  type: 'youtube' | 'tiktok' | 'instagram' | 'direct' | 'unknown';
  embedUrl?: string;
  originalUrl: string;
}

export function parseVideoUrl(url: string): VideoInfo {
  if (!url) return { type: 'unknown', originalUrl: '' };

  // YouTube
  const ytMatch = url.match(/(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/);
  if (ytMatch) {
    return {
      type: 'youtube',
      embedUrl: `https://www.youtube.com/embed/${ytMatch[1]}?autoplay=1&mute=1&rel=0`,
      originalUrl: url
    };
  }

  // TikTok
  const ttMatch = url.match(/(?:https?:\/\/)?(?:www\.)?tiktok\.com\/@[\w.-]+\/video\/(\d+)/);
  if (ttMatch) {
    return {
      type: 'tiktok',
      embedUrl: `https://www.tiktok.com/embed/v2/${ttMatch[1]}`,
      originalUrl: url
    };
  }

  // Instagram
  const igMatch = url.match(/(?:https?:\/\/)?(?:www\.)?instagram\.com\/(?:p|reels|reel)\/([a-zA-Z0-9_-]+)/);
  if (igMatch) {
    return {
      type: 'instagram',
      embedUrl: `https://www.instagram.com/p/${igMatch[1]}/embed`,
      originalUrl: url
    };
  }

  // Direct video file (common extensions)
  if (url.match(/\.(mp4|webm|ogg|mov)$/i) || url.includes('blob:') || url.startsWith('data:video')) {
    return {
      type: 'direct',
      embedUrl: url,
      originalUrl: url
    };
  }

  // If it's a URL but doesn't match above, it might be a direct link to a file without extension
  // or a different video hosting service. We'll treat it as direct for now if it doesn't look like social media.
  if (url.startsWith('http') && !url.includes('youtube.com') && !url.includes('youtu.be') && !url.includes('tiktok.com') && !url.includes('instagram.com')) {
    return {
      type: 'direct',
      embedUrl: url,
      originalUrl: url
    };
  }

  return { type: 'unknown', originalUrl: url };
}
