'use client';

import { useVideoCall } from '@/hooks/useVideoCall';
import { VideoPlayer } from './VideoPlayer';
import { Button } from '@/components/ui/button';
import { Mic, MicOff, Video, VideoOff, PhoneOff, FlipHorizontal, Loader2, Send, MessageSquare, X } from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import { useEffect, useRef, useState, useCallback } from 'react';
import { translateText } from '@/lib/translate';
import Link from 'next/link';

interface ChatMessage {
  id: string;
  from: 'doctor' | 'patient';
  originalText: string;
  displayText: string;
  lang: string;
  time: string;
}

export function MobileVideoRoom({ roomId, onCallEnded }: { roomId: string; onCallEnded?: () => void }) {
  const {
    localStream, remoteStream, status, isMuted, isVideoOff,
    errorMessage, startCall, endCall, toggleMute, toggleVideo, switchCamera,
  } = useVideoCall({ roomId, role: 'patient' });

  const { locale } = useI18n();
  const isMr = locale === 'mr';
  const isHi = locale === 'hi';

  // Detect call ended
  const prevStatusRef = useRef('idle');
  useEffect(() => {
    if (prevStatusRef.current !== 'disconnected' && status === 'disconnected' && onCallEnded) {
      onCallEnded();
    }
    prevStatusRef.current = status;
  }, [status, onCallEnded]);

  // Auto-start camera on mount
  useEffect(() => {
    startCall();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Chat state
  const [showChat, setShowChat] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [sending, setSending] = useState(false);
  const [unread, setUnread] = useState(0);
  const chatRef = useRef<HTMLDivElement>(null);
  const channelRef = useRef<any>(null);

  // Chat broadcast channel
  useEffect(() => {
    if (!roomId) return;
    const { createClient } = require('@/lib/supabase/client');
    const supabase = createClient();
    const ch = supabase.channel(`chat:${roomId}`, { config: { broadcast: { self: false } } });
    channelRef.current = ch;

    ch.on('broadcast', { event: 'chat' }, async ({ payload }: any) => {
      if (payload.from === 'patient') return;
      const displayText = await translateText(payload.text, payload.lang, locale);
      const msg: ChatMessage = {
        id: payload.id,
        from: 'doctor',
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
      from: 'patient',
      originalText: text,
      displayText: text,
      lang: locale,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };
    setMessages(prev => [...prev, msg]);

    channelRef.current?.send({
      type: 'broadcast',
      event: 'chat',
      payload: { id: msg.id, from: 'patient', text, lang: locale },
    });
    setSending(false);
  }, [chatInput, sending, locale]);

  const openChat = () => { setShowChat(true); setUnread(0); };

  // Error screen
  if (status === 'error') return (
    <div className="flex flex-col items-center justify-center h-full bg-slate-900 space-y-4 text-white p-6 text-center">
      <div className="text-4xl">📵</div>
      <p className="font-semibold">{isMr ? 'कॅमेरा उपलब्ध नाही' : isHi ? 'कैमरा उपलब्ध नहीं' : 'Camera Not Available'}</p>
      <p className="text-sm text-slate-400">{errorMessage}</p>
      <Button onClick={startCall} className="bg-emerald-600 hover:bg-emerald-700">
        {isMr ? 'पुन्हा प्रयत्न करा' : isHi ? 'फिर कोशिश करें' : 'Try Again'}
      </Button>
      <Link href="/patient"><Button variant="ghost" className="text-slate-400 text-sm">Go Back</Button></Link>
    </div>
  );

  if (status === 'idle' || status === 'requesting-media') return (
    <div className="flex flex-col items-center justify-center h-full bg-slate-900 space-y-4 text-white">
      <Loader2 className="w-10 h-10 animate-spin text-emerald-400" />
      <p className="text-sm text-slate-300">{isMr ? 'कॅमेरा सुरू करत आहे...' : isHi ? 'कैमरा शुरू हो रहा है...' : 'Starting camera...'}</p>
    </div>
  );

  const overlayLabel = status === 'connected' ? null
    : status === 'disconnected'
      ? (isMr ? 'कॉल संपला' : isHi ? 'कॉल समाप्त' : 'Call Ended')
      : (isMr ? 'डॉक्टरांची प्रतीक्षा...' : isHi ? 'डॉक्टर की प्रतीक्षा...' : 'Waiting for doctor...');

  return (
    <div className="relative w-full h-full bg-black overflow-hidden flex flex-col">
      {/* Remote Video */}
      <div className="flex-1 relative">
        <VideoPlayer
          stream={remoteStream}
          className="w-full h-full"
          fallbackText={isMr ? 'डॉक्टरांची प्रतीक्षा...' : isHi ? 'डॉक्टर की प्रतीक्षा...' : 'Waiting for doctor to join...'}
        />

        {overlayLabel && (
          <div className="absolute inset-0 bg-black/40 flex flex-col items-center justify-center gap-3">
            <Loader2 className="w-8 h-8 text-white animate-spin" />
            <span className="text-white font-medium px-4 py-2 bg-black/60 rounded-full text-sm">{overlayLabel}</span>
            <span className="text-slate-400 text-xs px-3 py-1 bg-black/40 rounded-full">{status}</span>
          </div>
        )}

        {/* Local PiP */}
        <div className="absolute top-4 right-4 w-28 h-40 bg-slate-800 rounded-xl overflow-hidden shadow-2xl border-2 border-slate-700">
          <VideoPlayer stream={localStream} isMuted={true} isMirror={true} className="w-full h-full" fallbackText="Camera off" />
        </div>

        {/* Chat button */}
        {status === 'connected' && !showChat && (
          <button
            onClick={openChat}
            className="absolute bottom-4 left-4 flex items-center gap-1.5 px-3 py-2 rounded-full bg-black/60 text-white text-xs font-semibold"
          >
            <MessageSquare className="w-3.5 h-3.5" />
            {isMr ? 'चॅट' : isHi ? 'चैट' : 'Chat'}
            {unread > 0 && <span className="bg-red-500 text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center">{unread}</span>}
          </button>
        )}
      </div>

      {/* Chat drawer */}
      {showChat && (
        <div className="absolute inset-0 flex flex-col bg-black/95 z-20">
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700">
            <p className="text-white font-semibold text-sm">{isMr ? 'डॉक्टरांशी चॅट' : isHi ? 'डॉक्टर के साथ चैट' : 'Chat with Doctor'}</p>
            <button onClick={() => setShowChat(false)} className="text-slate-400 hover:text-white">
              <X className="w-4 h-4" />
            </button>
          </div>
          <div ref={chatRef} className="flex-1 overflow-y-auto p-3 space-y-2">
            {messages.length === 0 && (
              <p className="text-slate-500 text-xs text-center mt-8">
                {isMr ? 'संदेश आपोआप भाषांतरित होतात' : isHi ? 'संदेश स्वचालित अनुवादित होते हैं' : 'Messages are auto-translated'}
              </p>
            )}
            {messages.map(m => (
              <div key={m.id} className={`flex ${m.from === 'patient' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[80%] rounded-xl px-3 py-2 ${m.from === 'patient' ? 'bg-emerald-600 text-white' : 'bg-slate-700 text-slate-100'}`}>
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
              onKeyDown={e => e.key === 'Enter' && sendChat()}
              placeholder={isMr ? 'संदेश टाइप करा...' : isHi ? 'संदेश लिखें...' : 'Type a message...'}
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

      {/* Controls */}
      <div className="bg-gradient-to-t from-black/90 to-transparent p-6 pb-8">
        <div className="flex items-center justify-center gap-4">
          <Button variant="outline" size="icon" className={`rounded-full h-14 w-14 border-0 ${isMuted ? 'bg-red-500/20 text-red-400' : 'bg-white/20 text-white hover:bg-white/30 backdrop-blur-md'}`} onClick={toggleMute}>
            {isMuted ? <MicOff className="h-6 w-6" /> : <Mic className="h-6 w-6" />}
          </Button>
          <Button variant="outline" size="icon" className={`rounded-full h-14 w-14 border-0 ${isVideoOff ? 'bg-red-500/20 text-red-400' : 'bg-white/20 text-white hover:bg-white/30 backdrop-blur-md'}`} onClick={toggleVideo}>
            {isVideoOff ? <VideoOff className="h-6 w-6" /> : <Video className="h-6 w-6" />}
          </Button>
          <Button variant="outline" size="icon" className="rounded-full h-14 w-14 border-0 bg-white/20 text-white hover:bg-white/30 backdrop-blur-md" onClick={switchCamera}>
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
