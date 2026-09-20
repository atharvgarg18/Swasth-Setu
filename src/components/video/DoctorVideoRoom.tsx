'use client';

import { useVideoCall } from '@/hooks/useVideoCall';
import { VideoPlayer } from './VideoPlayer';
import { Button } from '@/components/ui/button';
import { Mic, MicOff, Video, VideoOff, PhoneOff, Loader2, Send, MessageSquare, X } from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import { useEffect, useRef, useState, useCallback } from 'react';
import { translateText } from '@/lib/translate';

interface DoctorVideoRoomProps {
  roomId: string;
  patientName: string;
  onEndCallRef?: React.MutableRefObject<(() => void) | null>;
}

interface ChatMessage {
  id: string;
  from: 'doctor' | 'patient';
  originalText: string;
  displayText: string;
  lang: string;
  time: string;
}

export function DoctorVideoRoom({ roomId, patientName, onEndCallRef }: DoctorVideoRoomProps) {
  const {
    localStream, remoteStream, status, isMuted, isVideoOff,
    startCall, endCall, toggleMute, toggleVideo,
  } = useVideoCall({ roomId, role: 'doctor' });
  const { locale } = useI18n();

  // Expose endCall to parent via ref
  useEffect(() => {
    if (onEndCallRef) onEndCallRef.current = endCall;
    return () => { if (onEndCallRef) onEndCallRef.current = null; };
  }, [endCall, onEndCallRef]);

  // Chat state
  const [showChat, setShowChat] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [sending, setSending] = useState(false);
  const [unread, setUnread] = useState(0);
  const chatRef = useRef<HTMLDivElement>(null);
  const channelRef = useRef<any>(null);

  // Set up chat broadcast channel (piggybacks on the existing call channel)
  useEffect(() => {
    if (!roomId) return;
    const { createClient } = require('@/lib/supabase/client');
    const supabase = createClient();
    const ch = supabase.channel(`chat:${roomId}`, { config: { broadcast: { self: false } } });
    channelRef.current = ch;

    ch.on('broadcast', { event: 'chat' }, async ({ payload }: any) => {
      if (payload.from === 'doctor') return; // ignore own messages echoed back
      // Translate incoming patient message to doctor's locale
      const displayText = await translateText(payload.text, payload.lang, locale);
      const msg: ChatMessage = {
        id: payload.id,
        from: 'patient',
        originalText: payload.text,
        displayText,
        lang: payload.lang,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages(prev => [...prev, msg]);
      if (!showChat) setUnread(u => u + 1);
    });

    ch.subscribe();
    return () => { supabase.removeChannel(ch); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId]);

  // Auto-scroll chat
  useEffect(() => {
    if (chatRef.current) chatRef.current.scrollTop = chatRef.current.scrollHeight;
  }, [messages]);

  const sendChat = useCallback(async () => {
    if (!chatInput.trim() || sending) return;
    setSending(true);
    const text = chatInput.trim();
    setChatInput('');

    const msg: ChatMessage = {
      id: Date.now().toString(),
      from: 'doctor',
      originalText: text,
      displayText: text,
      lang: locale,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };
    setMessages(prev => [...prev, msg]);

    channelRef.current?.send({
      type: 'broadcast',
      event: 'chat',
      payload: { id: msg.id, from: 'doctor', text, lang: locale },
    });
    setSending(false);
  }, [chatInput, sending, locale]);

  const openChat = () => { setShowChat(true); setUnread(0); };

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

        {!isLive && status === 'ready' && (
          <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center gap-3">
            <Loader2 className="w-10 h-10 text-white animate-spin" />
            <span className="text-white text-sm font-medium">Waiting for patient to join...</span>
          </div>
        )}

        {(status === 'idle' || status === 'disconnected') && (
          <div className="absolute inset-0 bg-black/70 flex flex-col items-center justify-center gap-4">
            <div className="text-center text-white space-y-1">
              <p className="font-semibold text-lg">{patientName}</p>
              <p className="text-slate-400 text-sm">Ready to start consultation</p>
            </div>
            <Button onClick={startCall} className="bg-emerald-500 hover:bg-emerald-600 text-white px-8 h-12 text-base font-semibold rounded-full">
              <Video className="w-5 h-5 mr-2" />Start Consultation
            </Button>
          </div>
        )}

        {status === 'requesting-media' && (
          <div className="absolute inset-0 bg-black/70 flex flex-col items-center justify-center gap-3">
            <Loader2 className="w-10 h-10 text-emerald-400 animate-spin" />
            <span className="text-white text-sm">Starting camera...</span>
          </div>
        )}

        {/* Top bar */}
        <div className="absolute top-0 inset-x-0 flex items-center justify-between px-4 py-3 bg-gradient-to-b from-black/70 to-transparent pointer-events-none">
          <div className="flex items-center gap-2">
            {isLive && <span className="flex items-center gap-1.5 bg-red-600 text-white text-xs font-bold px-2.5 py-1 rounded-full animate-pulse">● LIVE</span>}
            <span className="text-white text-sm font-medium drop-shadow">{patientName}</span>
          </div>
          {isStarted && (
            <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${isLive ? 'bg-green-500/80 text-white' : 'bg-white/20 text-white'}`}>
              {isLive ? 'Connected' : 'Connecting...'}
            </span>
          )}
        </div>

        {/* Doctor PiP */}
        {localStream && (
          <div className="absolute bottom-16 right-3 w-32 h-24 rounded-lg overflow-hidden shadow-2xl border-2 border-slate-600 bg-black">
            <VideoPlayer stream={localStream} isMuted={true} isMirror={true} className="w-full h-full" fallbackText="" />
          </div>
        )}

        {/* Chat bubble button */}
        {isLive && !showChat && (
          <button
            onClick={openChat}
            className="absolute bottom-20 left-3 flex items-center gap-1.5 px-3 py-2 rounded-full bg-slate-800/80 text-white text-xs font-semibold hover:bg-slate-700 transition-colors"
          >
            <MessageSquare className="w-3.5 h-3.5" />
            Chat
            {unread > 0 && <span className="bg-red-500 text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center">{unread}</span>}
          </button>
        )}
      </div>

      {/* ── Chat drawer ── */}
      {showChat && (
        <div className="absolute inset-0 flex flex-col bg-black/95 z-20">
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700">
            <p className="text-white font-semibold text-sm">Chat with {patientName}</p>
            <button onClick={() => setShowChat(false)} className="text-slate-400 hover:text-white">
              <X className="w-4 h-4" />
            </button>
          </div>
          <div ref={chatRef} className="flex-1 overflow-y-auto p-3 space-y-2">
            {messages.length === 0 && (
              <p className="text-slate-500 text-xs text-center mt-8">Messages are translated to your language automatically</p>
            )}
            {messages.map(m => (
              <div key={m.id} className={`flex ${m.from === 'doctor' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[80%] rounded-xl px-3 py-2 ${m.from === 'doctor' ? 'bg-emerald-600 text-white' : 'bg-slate-700 text-slate-100'}`}>
                  <p className="text-sm">{m.displayText}</p>
                  {m.originalText !== m.displayText && (
                    <p className="text-[10px] opacity-60 mt-0.5">{m.originalText}</p>
                  )}
                  <p className="text-[10px] opacity-50 mt-0.5 text-right">{m.time}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="p-3 border-t border-slate-700 flex gap-2">
            <input
              value={chatInput}
              onChange={e => setChatInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendChat()}
              placeholder="Type a message..."
              className="flex-1 bg-slate-800 text-white text-sm px-3 py-2 rounded-lg border border-slate-600 outline-none focus:border-emerald-500 placeholder:text-slate-500"
            />
            <button
              onClick={sendChat}
              disabled={!chatInput.trim() || sending}
              className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white p-2 rounded-lg transition-colors"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* ── Control bar ── */}
      <div className="flex-shrink-0 bg-slate-900/95 backdrop-blur px-4 py-3 border-t border-slate-800 flex items-center justify-between">
        <div className="flex gap-2">
          <button onClick={toggleMute} disabled={!isStarted} className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${isMuted ? 'bg-red-500/20 text-red-400 border border-red-500/40' : 'bg-white/10 text-white hover:bg-white/20 border border-white/10'}`}>
            {isMuted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
          </button>
          <button onClick={toggleVideo} disabled={!isStarted} className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${isVideoOff ? 'bg-red-500/20 text-red-400 border border-red-500/40' : 'bg-white/10 text-white hover:bg-white/20 border border-white/10'}`}>
            {isVideoOff ? <VideoOff className="w-4 h-4" /> : <Video className="w-4 h-4" />}
          </button>
        </div>
        {isStarted && (
          <Button onClick={endCall} variant="destructive" size="sm" className="rounded-full h-10 px-5 font-semibold">
            <PhoneOff className="w-4 h-4 mr-2" />End Call
          </Button>
        )}
      </div>
    </div>
  );
}
