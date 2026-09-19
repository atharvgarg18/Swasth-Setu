'use client';

import { useVideoCall } from '@/hooks/useVideoCall';
import { VideoPlayer } from './VideoPlayer';
import { Button } from '@/components/ui/button';
import { Mic, MicOff, Video, VideoOff, PhoneOff, FlipHorizontal, Loader2 } from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import { useEffect } from 'react';
import Link from 'next/link';

export function MobileVideoRoom({ roomId, onCallEnded }: { roomId: string; onCallEnded?: () => void }) {
  const {
    localStream, remoteStream, status, isMuted, isVideoOff,
    errorMessage, startCall, endCall, toggleMute, toggleVideo, switchCamera,
  } = useVideoCall({ roomId, role: 'patient' });

  // Tell parent page when call ends so they can show "waiting for report" UI
  const prevStatusRef = useRef('idle');
  useEffect(() => {
    if (prevStatusRef.current !== 'disconnected' && status === 'disconnected' && onCallEnded) {
      onCallEnded();
    }
    prevStatusRef.current = status;
  }, [status, onCallEnded]);


  const { locale } = useI18n();
  const isMr = locale === 'mr';

  // Auto-request media when component mounts (or remounts on reconnect)
  useEffect(() => {
    console.log('[MobileVideoRoom] Mounted, calling startCall');
    startCall();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Show camera error
  if (status === 'error') return (
    <div className="flex flex-col items-center justify-center h-full bg-slate-900 space-y-4 text-white p-6 text-center">
      <div className="text-4xl">📵</div>
      <p className="font-semibold">{isMr ? 'कॅमेरा उपलब्ध नाही' : 'Camera Not Available'}</p>
      <p className="text-sm text-slate-400">{errorMessage}</p>
      <Button onClick={startCall} className="bg-emerald-600 hover:bg-emerald-700">
        {isMr ? 'पुन्हा प्रयत्न करा' : 'Try Again'}
      </Button>
      <Link href="/patient"><Button variant="ghost" className="text-slate-400 text-sm">Go Back</Button></Link>
    </div>
  );

  // Loading camera
  if (status === 'idle' || status === 'requesting-media') return (
    <div className="flex flex-col items-center justify-center h-full bg-slate-900 space-y-4 text-white">
      <Loader2 className="w-10 h-10 animate-spin text-emerald-400" />
      <p className="text-sm text-slate-300">{isMr ? 'कॅमेरा सुरू करत आहे...' : 'Starting camera...'}</p>
    </div>
  );

  const overlayLabel = status === 'connected'
    ? null
    : status === 'disconnected'
      ? (isMr ? 'कॉल संपला' : 'Call Ended')
      : (isMr ? 'डॉक्टरांची प्रतीक्षा...' : 'Waiting for doctor...');

  return (
    <div className="relative w-full h-full bg-black overflow-hidden flex flex-col">
      {/* Remote Video */}
      <div className="flex-1 relative">
        <VideoPlayer
          stream={remoteStream}
          className="w-full h-full"
          fallbackText={isMr ? 'डॉक्टरांची प्रतीक्षा...' : 'Waiting for doctor to join...'}
        />

        {/* Overlay when not connected */}
        {overlayLabel && (
          <div className="absolute inset-0 bg-black/40 flex flex-col items-center justify-center gap-3">
            <Loader2 className="w-8 h-8 text-white animate-spin" />
            <span className="text-white font-medium px-4 py-2 bg-black/60 rounded-full text-sm">{overlayLabel}</span>
            {/* Show signaling status for debugging */}
            <span className="text-slate-400 text-xs px-3 py-1 bg-black/40 rounded-full">{status}</span>
          </div>
        )}

        {/* Local Video PiP */}
        <div className="absolute top-4 right-4 w-28 h-40 bg-slate-800 rounded-xl overflow-hidden shadow-2xl border-2 border-slate-700">
          <VideoPlayer stream={localStream} isMuted={true} isMirror={true} className="w-full h-full" fallbackText="Camera off" />
        </div>
      </div>

      {/* Controls */}
      <div className="bg-gradient-to-t from-black/90 to-transparent p-6 pb-8">
        <div className="flex items-center justify-center gap-4">
          <Button variant="outline" size="icon"
            className={"rounded-full h-14 w-14 border-0 " + (isMuted ? 'bg-red-500/20 text-red-400' : 'bg-white/20 text-white hover:bg-white/30 backdrop-blur-md')}
            onClick={toggleMute}>
            {isMuted ? <MicOff className="h-6 w-6" /> : <Mic className="h-6 w-6" />}
          </Button>
          <Button variant="outline" size="icon"
            className={"rounded-full h-14 w-14 border-0 " + (isVideoOff ? 'bg-red-500/20 text-red-400' : 'bg-white/20 text-white hover:bg-white/30 backdrop-blur-md')}
            onClick={toggleVideo}>
            {isVideoOff ? <VideoOff className="h-6 w-6" /> : <Video className="h-6 w-6" />}
          </Button>
          <Button variant="outline" size="icon"
            className="rounded-full h-14 w-14 border-0 bg-white/20 text-white hover:bg-white/30 backdrop-blur-md"
            onClick={switchCamera}>
            <FlipHorizontal className="h-6 w-6" />
          </Button>
          <Button variant="destructive" size="icon" className="rounded-full h-14 w-14" onClick={endCall}>
            <PhoneOff className="h-6 w-6" />
          </Button>
        </div>
      </div>
    </div>
  );
}
