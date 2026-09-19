'use client';

import { useVideoCall } from '@/hooks/useVideoCall';
import { VideoPlayer } from './VideoPlayer';
import { Button } from '@/components/ui/button';
import { Mic, MicOff, Video, VideoOff, PhoneOff, Loader2 } from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import { useEffect, useRef } from 'react';

interface DoctorVideoRoomProps {
  roomId: string;
  patientName: string;
  /** Parent can call this ref to trigger endCall (e.g. when completing consultation) */
  onEndCallRef?: React.MutableRefObject<(() => void) | null>;
}

export function DoctorVideoRoom({ roomId, patientName, onEndCallRef }: DoctorVideoRoomProps) {
  const {
    localStream, remoteStream, status, isMuted, isVideoOff,
    startCall, endCall, toggleMute, toggleVideo,
  } = useVideoCall({ roomId, role: 'doctor' });
  const { t } = useI18n();

  // Expose endCall to parent via ref
  useEffect(() => {
    if (onEndCallRef) {
      onEndCallRef.current = endCall;
    }
    return () => {
      if (onEndCallRef) onEndCallRef.current = null;
    };
  }, [endCall, onEndCallRef]);

  const isLive = status === 'connected';
  const isStarted = status !== 'idle' && status !== 'disconnected' && status !== 'requesting-media';

  return (
    <div className="relative w-full h-full bg-black flex flex-col overflow-hidden rounded-xl">

      {/* ── Main: Patient's video ── */}
      <div className="relative flex-1 bg-slate-950 overflow-hidden">
        <VideoPlayer
          stream={remoteStream}
          className="w-full h-full object-cover"
          fallbackText={isLive ? 'Patient camera off' : 'Waiting for patient...'}
        />

        {/* Waiting overlay — shown until connected */}
        {!isLive && status === 'ready' && (
          <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center gap-3">
            <Loader2 className="w-10 h-10 text-white animate-spin" />
            <span className="text-white text-sm font-medium">Waiting for patient to join...</span>
          </div>
        )}

        {/* Idle overlay — before starting */}
        {(status === 'idle' || status === 'disconnected') && (
          <div className="absolute inset-0 bg-black/70 flex flex-col items-center justify-center gap-4">
            <div className="text-center text-white space-y-1">
              <p className="font-semibold text-lg">{patientName}</p>
              <p className="text-slate-400 text-sm">Ready to start consultation</p>
            </div>
            <Button
              onClick={startCall}
              className="bg-emerald-500 hover:bg-emerald-600 text-white px-8 h-12 text-base font-semibold rounded-full"
            >
              <Video className="w-5 h-5 mr-2" />
              Start Consultation
            </Button>
          </div>
        )}

        {status === 'requesting-media' && (
          <div className="absolute inset-0 bg-black/70 flex flex-col items-center justify-center gap-3">
            <Loader2 className="w-10 h-10 text-emerald-400 animate-spin" />
            <span className="text-white text-sm">Starting camera...</span>
          </div>
        )}

        {/* Top bar — status + patient name */}
        <div className="absolute top-0 inset-x-0 flex items-center justify-between px-4 py-3
                        bg-gradient-to-b from-black/70 to-transparent pointer-events-none">
          <div className="flex items-center gap-2">
            {isLive && (
              <span className="flex items-center gap-1.5 bg-red-600 text-white text-xs font-bold px-2.5 py-1 rounded-full animate-pulse">
                ● LIVE
              </span>
            )}
            <span className="text-white text-sm font-medium drop-shadow">{patientName}</span>
          </div>
          {isStarted && (
            <span className={
              'text-xs font-semibold px-2.5 py-1 rounded-full ' +
              (isLive ? 'bg-green-500/80 text-white' : 'bg-white/20 text-white')
            }>
              {isLive ? 'Connected' : 'Connecting...'}
            </span>
          )}
        </div>

        {/* Doctor's PiP — bottom right */}
        {localStream && (
          <div className="absolute bottom-16 right-3 w-32 h-24 rounded-lg overflow-hidden
                          shadow-2xl border-2 border-slate-600 bg-black">
            <VideoPlayer stream={localStream} isMuted={true} isMirror={true}
              className="w-full h-full" fallbackText="" />
          </div>
        )}
      </div>

      {/* ── Control bar ── */}
      <div className="flex-shrink-0 bg-slate-900/95 backdrop-blur px-4 py-3
                      border-t border-slate-800 flex items-center justify-between">
        {/* Mute / Camera controls */}
        <div className="flex gap-2">
          <button
            onClick={toggleMute}
            disabled={!isStarted}
            className={
              'w-10 h-10 rounded-full flex items-center justify-center transition-colors ' +
              (isMuted
                ? 'bg-red-500/20 text-red-400 border border-red-500/40'
                : 'bg-white/10 text-white hover:bg-white/20 border border-white/10')
            }
          >
            {isMuted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
          </button>
          <button
            onClick={toggleVideo}
            disabled={!isStarted}
            className={
              'w-10 h-10 rounded-full flex items-center justify-center transition-colors ' +
              (isVideoOff
                ? 'bg-red-500/20 text-red-400 border border-red-500/40'
                : 'bg-white/10 text-white hover:bg-white/20 border border-white/10')
            }
          >
            {isVideoOff ? <VideoOff className="w-4 h-4" /> : <Video className="w-4 h-4" />}
          </button>
        </div>

        {/* End call */}
        {isStarted && (
          <Button
            onClick={endCall}
            variant="destructive"
            size="sm"
            className="rounded-full h-10 px-5 font-semibold"
          >
            <PhoneOff className="w-4 h-4 mr-2" />End Call
          </Button>
        )}
      </div>
    </div>
  );
}
