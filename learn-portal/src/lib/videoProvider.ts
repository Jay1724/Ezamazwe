import type { Lesson } from '../types/database';

// ============================================================================
// FLAGGED DECISION: video hosting.
//
// The brief recommends Mux or Cloudflare Stream for adaptive playback and
// bandwidth cost control, but asked that this be confirmed with the client
// before committing to a vendor (real recurring cost). For this build we
// stub it: `lessons.video_provider` / `video_provider_id` / `video_url`
// exist in the schema and are swappable, but only a plain <video> element
// pointed at `video_url` (or a bundled placeholder clip) is implemented.
//
// To wire in a real provider later:
//   - Mux: store the Mux asset's playback_id in video_provider_id, and
//     render with @mux/mux-player-react instead of getPlaybackSource() below.
//   - Cloudflare Stream: store the Stream video UID in video_provider_id,
//     and render via Cloudflare's <stream> web component / iframe embed.
// In both cases, generate signed/short-lived playback URLs server-side
// (checking enrollment) rather than storing a public URL — see the RLS
// caveat in supabase/migrations/0001_init.sql.
// ============================================================================

const PLACEHOLDER_CLIP_URL =
  'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4';

export interface PlaybackSource {
  kind: 'html5' | 'unsupported';
  url?: string;
  message?: string;
}

export function getPlaybackSource(lesson: Lesson): PlaybackSource {
  switch (lesson.video_provider) {
    case 'stub':
    case 'external_url':
      return { kind: 'html5', url: lesson.video_url ?? PLACEHOLDER_CLIP_URL };
    case 'mux':
    case 'cloudflare_stream':
      return {
        kind: 'unsupported',
        message: `This lesson is configured for ${lesson.video_provider === 'mux' ? 'Mux' : 'Cloudflare Stream'}, but that integration hasn't been wired up in this build yet — see src/lib/videoProvider.ts.`,
      };
    default:
      return { kind: 'unsupported', message: 'No video source configured for this lesson.' };
  }
}
