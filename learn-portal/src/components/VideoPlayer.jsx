import { useEffect, useRef } from 'react';

export default function VideoPlayer({ src, startPosition = 0, onTimeUpdate, onEnded }) {
  const videoRef = useRef(null);
  const startPositionRef = useRef(startPosition);
  startPositionRef.current = startPosition;

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleLoadedMetadata = () => {
      if (startPositionRef.current > 0 && startPositionRef.current < video.duration) {
        video.currentTime = startPositionRef.current;
      }
    };

    video.addEventListener('loadedmetadata', handleLoadedMetadata);
    return () => video.removeEventListener('loadedmetadata', handleLoadedMetadata);
  }, [src]);

  return (
    <video
      ref={videoRef}
      key={src}
      className="player-video"
      src={src}
      controls
      onTimeUpdate={(e) => onTimeUpdate?.(Math.floor(e.currentTarget.currentTime))}
      onEnded={onEnded}
    />
  );
}
