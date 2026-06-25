export interface VideoInfo {
  type: 'youtube' | 'tiktok' | 'instagram' | 'direct' | 'unknown';
  embedUrl?: string;
  originalUrl: string;
}

export function parseVideoUrl(url: string): VideoInfo {
  if (!url) return { type: 'unknown', originalUrl: '' };

  const trimmedUrl = url.trim();

  // YouTube (Regular, Shorts, and Embed)
  const ytMatch = trimmedUrl.match(/(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/);
  if (ytMatch) {
    return {
      type: 'youtube',
      embedUrl: `https://www.youtube.com/embed/${ytMatch[1]}?autoplay=1&mute=1&rel=0`,
      originalUrl: trimmedUrl
    };
  }

  // TikTok (Long, Short, and Mobile)
  // Match ID from long URLs: tiktok.com/@user/video/123456... or tiktok.com/v/123456...
  const ttIdMatch = trimmedUrl.match(/(?:tiktok\.com\/)(?:@[\w.-]+\/video\/|v\/)(\d+)/);
  if (ttIdMatch) {
    return {
      type: 'tiktok',
      embedUrl: `https://www.tiktok.com/embed/v2/${ttIdMatch[1]}`,
      originalUrl: trimmedUrl
    };
  }
  
  // Detection for short TikTok URLs (vt.tiktok.com, vm.tiktok.com, /t/ code)
  if (trimmedUrl.includes('tiktok.com')) {
    return {
      type: 'tiktok',
      embedUrl: trimmedUrl, // Fallback to original, though might not embed without ID
      originalUrl: trimmedUrl
    };
  }

  // Instagram (Posts, Reels)
  const igMatch = trimmedUrl.match(/(?:instagram\.com\/(?:p|reels|reel)\/)([a-zA-Z0-9_-]+)/);
  if (igMatch) {
    return {
      type: 'instagram',
      embedUrl: `https://www.instagram.com/p/${igMatch[1]}/embed`,
      originalUrl: trimmedUrl
    };
  }
  
  if (trimmedUrl.includes('instagram.com')) {
    return {
      type: 'instagram',
      embedUrl: trimmedUrl,
      originalUrl: trimmedUrl
    };
  }

  // Direct video file (common extensions)
  if (trimmedUrl.match(/\.(mp4|webm|ogg|mov)$/i) || trimmedUrl.includes('blob:') || trimmedUrl.startsWith('data:video')) {
    return {
      type: 'direct',
      embedUrl: trimmedUrl,
      originalUrl: trimmedUrl
    };
  }

  // If it's a URL but doesn't match above
  if (trimmedUrl.startsWith('http')) {
    return {
      type: 'direct',
      embedUrl: trimmedUrl,
      originalUrl: trimmedUrl
    };
  }

  return { type: 'unknown', originalUrl: trimmedUrl };
}
