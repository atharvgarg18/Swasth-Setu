'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';

const ICE_SERVERS = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun.cloudflare.com:3478' },
    // TURN relay servers — required for cross-network (phone ↔ laptop)
    { urls: 'turn:openrelay.metered.ca:80', username: 'openrelayproject', credential: 'openrelayproject' },
    { urls: 'turn:openrelay.metered.ca:443', username: 'openrelayproject', credential: 'openrelayproject' },
    { urls: 'turns:openrelay.metered.ca:443?transport=tcp', username: 'openrelayproject', credential: 'openrelayproject' },
  ],
  iceCandidatePoolSize: 10,
};

export function useVideoCall({ roomId, role }: { roomId: string; role: 'doctor' | 'patient' }) {
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [status, setStatus] = useState<
    'idle' | 'requesting-media' | 'ready' | 'calling' | 'connected' | 'disconnected' | 'error'
  >('idle');
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const localStreamRef = useRef<MediaStream | null>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const channelRef = useRef<any>(null);
  const iceQueueRef = useRef<RTCIceCandidateInit[]>([]);
  const makingOfferRef = useRef(false);
  const facingRef = useRef<'user' | 'environment'>('user');
  const supabase = useRef(createClient()).current;

  // ── Create peer connection ──────────────────────────────────────────────
  const getPc = useCallback(() => {
    if (pcRef.current) return pcRef.current;
    const pc = new RTCPeerConnection(ICE_SERVERS);
    pcRef.current = pc;

    // Add local tracks
    localStreamRef.current?.getTracks().forEach(t => {
      pc.addTrack(t, localStreamRef.current!);
    });

    // Remote track received
    pc.ontrack = evt => {
      const t = evt.track;
      console.log('[WebRTC] ontrack:', t.kind, 'muted:', t.muted, 'streams:', evt.streams.length);
      if (!evt.streams[0]) { console.warn('[WebRTC] ontrack: no stream'); return; }
      t.enabled = true;
      t.onunmute = () => console.log('[WebRTC] track unmuted:', t.kind);
      setRemoteStream(evt.streams[0]);
      setStatus('connected');
    };

    // ICE candidate — send via signaling channel (channel MUST be alive!)
    pc.onicecandidate = evt => {
      if (!evt.candidate) { console.log('[ICE] Gathering complete'); return; }
      console.log('[ICE] Sending candidate:', evt.candidate.type, evt.candidate.protocol);
      if (channelRef.current) {
        channelRef.current.send({
          type: 'broadcast',
          event: 'ice',
          payload: { from: role, candidate: evt.candidate.toJSON() },
        });
      } else {
        console.warn('[ICE] Channel closed — candidate lost:', evt.candidate.type);
      }
    };

    pc.oniceconnectionstatechange = () => {
      console.log('[ICE] Connection state:', pc.iceConnectionState);
    };

    pc.onconnectionstatechange = () => {
      console.log('[WebRTC] Connection state:', pc.connectionState);
      if (pc.connectionState === 'failed') {
        console.log('[WebRTC] Connection failed — attempting ICE restart');
        pc.restartIce();
      }
    };

    return pc;
  }, [role]);

  // ── Set up Supabase signaling channel ──────────────────────────────────
  // IMPORTANT: channel is set up ONCE per roomId and stays alive
  // for the ENTIRE call duration so ICE trickle candidates can flow.
  useEffect(() => {
    if (!roomId) return;
    console.log('[Signaling] Setting up channel, room:', roomId, 'role:', role);

    const ch = supabase.channel(`call:${roomId}`, {
      config: {
        broadcast: { self: false, ack: false },
        presence: { key: role },
      },
    });
    channelRef.current = ch;

    // ── Helper: doctor sends offer once local stream is ready ────────────
    const sendOffer = async () => {
      if (role !== 'doctor' || makingOfferRef.current) return;
      if (!localStreamRef.current) {
        console.log('[Signaling] No local stream yet — offer deferred');
        return;
      }
      const pc = getPc();
      if (pc.signalingState !== 'stable') {
        console.log('[Signaling] Skipping offer — not stable:', pc.signalingState);
        return;
      }
      console.log('[Signaling] Creating offer...');
      try {
        makingOfferRef.current = true;
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        ch.send({
          type: 'broadcast',
          event: 'sdp',
          payload: { from: 'doctor', description: pc.localDescription?.toJSON() },
        });
        console.log('[Signaling] Offer sent');
      } catch (e) {
        console.error('[Signaling] Offer error:', e);
      } finally {
        makingOfferRef.current = false;
      }
    };

    // ── SDP exchange ──────────────────────────────────────────────────────
    ch.on('broadcast', { event: 'sdp' }, async ({ payload }: { payload: any }) => {
      if (payload.from === role) return;
      console.log('[Signaling] Got SDP:', payload.description.type, 'from:', payload.from);
      const pc = getPc();
      const desc = new RTCSessionDescription(payload.description);

      // Perfect negotiation — patient is polite
      const collision = desc.type === 'offer' && (makingOfferRef.current || pc.signalingState !== 'stable');
      if (collision && role === 'doctor') { console.log('[Signaling] Collision — skipping (impolite)'); return; }

      await pc.setRemoteDescription(desc);

      // Drain queued ICE candidates
      const queue = iceQueueRef.current.splice(0);
      for (const c of queue) {
        await pc.addIceCandidate(new RTCIceCandidate(c)).catch(e => console.error('[ICE] Queue drain:', e));
      }

      if (desc.type === 'offer') {
        await pc.setLocalDescription(await pc.createAnswer());
        ch.send({
          type: 'broadcast',
          event: 'sdp',
          payload: { from: role, description: pc.localDescription?.toJSON() },
        });
        console.log('[Signaling] Answer sent');
      }
    });

    // ── ICE candidates ────────────────────────────────────────────────────
    ch.on('broadcast', { event: 'ice' }, async ({ payload }: { payload: any }) => {
      if (payload.from === role) return;
      console.log('[ICE] Received candidate from:', payload.from, payload.candidate?.type);
      const pc = pcRef.current;
      if (!pc) return;
      if (pc.remoteDescription) {
        await pc.addIceCandidate(new RTCIceCandidate(payload.candidate)).catch(e => console.error('[ICE] Add error:', e));
      } else {
        iceQueueRef.current.push(payload.candidate);
      }
    });

    ch.on('broadcast', { event: 'hangup' }, () => {
      console.log('[Signaling] Remote hangup');
      cleanup();
    });

    // ── Presence — doctor sends offer when patient detected ───────────────
    ch.on('presence', { event: 'join' }, ({ newPresences }: { newPresences: any[] }) => {
      const roles = newPresences.map((p: any) => p.role);
      console.log('[Presence] Join:', roles);
      if (role === 'doctor' && roles.includes('patient')) sendOffer();
    });

    ch.on('presence', { event: 'sync' }, () => {
      const state = ch.presenceState();
      const roles = Object.values(state).flat().map((p: any) => p.role);
      console.log('[Presence] Sync, in room:', roles);
      if (role === 'doctor' && roles.includes('patient')) sendOffer();
    });

    ch.subscribe(async (subStatus: string) => {
      console.log('[Channel] Subscribe status:', subStatus);
      if (subStatus !== 'SUBSCRIBED') return;
      await ch.track({ role, ts: Date.now() });
      console.log('[Presence] Tracked as:', role);
    });

    // Cleanup only on unmount / roomId change — NOT on status change
    return () => {
      console.log('[Signaling] Channel teardown (unmount)');
      supabase.removeChannel(ch);
      channelRef.current = null;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId, role]); // ← NO status dependency! Channel stays alive for whole call.

  // ── Cleanup helper ──────────────────────────────────────────────────────
  const cleanup = useCallback(() => {
    localStreamRef.current?.getTracks().forEach(t => t.stop());
    pcRef.current?.close();
    pcRef.current = null;
    localStreamRef.current = null;
    iceQueueRef.current = [];
    makingOfferRef.current = false;
    setLocalStream(null);
    setRemoteStream(null);
    setStatus('disconnected');
  }, []);

  // ── Unmount cleanup ─────────────────────────────────────────────────────
  useEffect(() => {
    return () => {
      localStreamRef.current?.getTracks().forEach(t => t.stop());
      pcRef.current?.close();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Get camera ──────────────────────────────────────────────────────────
  const initMedia = useCallback(async (facing?: 'user' | 'environment') => {
    const mode = facing ?? facingRef.current;
    facingRef.current = mode;
    setStatus('requesting-media');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: mode, width: { ideal: 640 }, height: { ideal: 480 } },
        audio: { echoCancellation: true, noiseSuppression: true },
      });
      localStreamRef.current = stream;
      setLocalStream(stream);
      setStatus('ready');
      console.log('[Media] Stream acquired, tracks:', stream.getTracks().map(t => t.kind));
      return stream;
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Camera access denied');
      setStatus('error');
      throw err;
    }
  }, []);

  const startCall = useCallback(async () => {
    await initMedia();
    // After media is ready, if channel is subscribed AND we're doctor,
    // trigger offer by re-checking presence state
    if (role === 'doctor' && channelRef.current) {
      const state = channelRef.current.presenceState();
      const roles = Object.values(state).flat().map((p: any) => p.role);
      console.log('[StartCall] Presence after media ready:', roles);
      if (roles.includes('patient')) {
        // Build pc and send offer
        const pc = getPc();
        if (pc.signalingState === 'stable' && !makingOfferRef.current) {
          console.log('[StartCall] Patient present — sending offer after media');
          try {
            makingOfferRef.current = true;
            const offer = await pc.createOffer();
            await pc.setLocalDescription(offer);
            channelRef.current.send({
              type: 'broadcast',
              event: 'sdp',
              payload: { from: 'doctor', description: pc.localDescription?.toJSON() },
            });
            console.log('[StartCall] Offer sent');
          } catch(e) {
            console.error('[StartCall] Offer error:', e);
          } finally {
            makingOfferRef.current = false;
          }
        }
      }
    }
  }, [initMedia, role, getPc]);

  const endCall = useCallback(() => {
    channelRef.current?.send({ type: 'broadcast', event: 'hangup', payload: { from: role } });
    cleanup();
  }, [cleanup, role]);

  const toggleMute = useCallback(() => {
    localStreamRef.current?.getAudioTracks().forEach(t => { t.enabled = !t.enabled; });
    setIsMuted(prev => !prev);
  }, []);

  const toggleVideo = useCallback(() => {
    localStreamRef.current?.getVideoTracks().forEach(t => { t.enabled = !t.enabled; });
    setIsVideoOff(prev => !prev);
  }, []);

  const switchCamera = useCallback(async () => {
    const newMode = facingRef.current === 'user' ? 'environment' : 'user';
    localStreamRef.current?.getTracks().forEach(t => t.stop());
    const newStream = await initMedia(newMode);
    if (pcRef.current && newStream) {
      const vt = newStream.getVideoTracks()[0];
      const sender = pcRef.current.getSenders().find(s => s.track?.kind === 'video');
      if (sender && vt) sender.replaceTrack(vt);
    }
  }, [initMedia]);

  return { localStream, remoteStream, status, isMuted, isVideoOff, errorMessage, startCall, endCall, toggleMute, toggleVideo, switchCamera };
}
