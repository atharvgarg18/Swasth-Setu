'use client';

import { useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';
import { User } from 'lucide-react';

interface VideoPlayerProps {
  stream: MediaStream | null;
  isMuted?: boolean;
  isMirror?: boolean;
  className?: string;
  fallbackText?: string;
}

export function VideoPlayer({ stream, isMuted = false, isMirror = false, className, fallbackText = 'No video' }: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !stream) return;

    // Set source and explicitly call play() — required on mobile
    // (autoPlay alone doesn't fire when srcObject is set dynamically)
    if (video.srcObject !== stream) {
      video.srcObject = stream;
    }

    const tryPlay = () => {
      video.play().catch(err => {
        // DOMException: play() interrupted — safe to ignore
        if (err.name !== 'AbortError') {
          console.warn('[VideoPlayer] play() failed:', err.name, err.message);
        }
      });
    };

    // If video is ready, play immediately; otherwise wait for loadedmetadata
    if (video.readyState >= 1) {
      tryPlay();
    } else {
      video.addEventListener('loadedmetadata', tryPlay, { once: true });
    }

    return () => {
      video.removeEventListener('loadedmetadata', tryPlay);
    };
  }, [stream]);

  if (!stream) {
    return (
      <div className={cn("bg-slate-900 flex flex-col items-center justify-center text-slate-400", className)}>
        <User className="w-12 h-12 mb-2 opacity-50" />
        <span className="text-sm font-medium">{fallbackText}</span>
      </div>
    );
  }

  return (
    <video
      ref={videoRef}
      autoPlay
      playsInline
      muted={isMuted}
      className={cn(
        "object-cover bg-slate-900",
        isMirror && "scale-x-[-1]",
        className
      )}
    />
  );
}
