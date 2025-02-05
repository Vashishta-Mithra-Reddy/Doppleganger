import React, { useState, useEffect, useRef } from 'react';
import { createClient } from '@/utils/supabase/client';

interface VideoCallProps {
  roomId: string;
  userId: string;
}

interface Signal {
  type: 'offer' | 'answer' | 'ice-candidate';
  sender: string;
  payload: any;
}

const VideoCall: React.FC<VideoCallProps> = ({ roomId, userId }) => {
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [peerConnection, setPeerConnection] = useState<RTCPeerConnection | null>(null);
  const [connectionState, setConnectionState] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [isMediaSupported, setIsMediaSupported] = useState<boolean>(false);
  const [hasReceivedOffer, setHasReceivedOffer] = useState<boolean>(false);

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  // Use a ref to hold queued ICE candidates until remote description is set.
  const queuedIceCandidatesRef = useRef<RTCIceCandidateInit[]>([]);

  const supabase = createClient();

  const iceServers = [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' }
  ];

  const logError = (message: string, err?: any) => {
    const errorMessage = `${message}: ${err?.message || err}`;
    console.error(errorMessage);
    setError(errorMessage);
  };

  // Check WebRTC support
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const hasUserMedia = !!(
        navigator?.mediaDevices?.getUserMedia ||
        (navigator as any)?.webkitGetUserMedia ||
        (navigator as any)?.mozGetUserMedia ||
        (navigator as any)?.msGetUserMedia
      );
      setIsMediaSupported(hasUserMedia);
      if (!hasUserMedia) {
        setError('Your browser does not support video calls. Please use a modern browser like Chrome, Firefox, or Safari.');
      }
    }
  }, []);

  // Initialize local media stream
  useEffect(() => {
    const initializeLocalStream = async () => {
      if (typeof window === 'undefined' || !isMediaSupported) return;
      try {
        console.log('Requesting media permissions...');
        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true
        });
        console.log('Media permissions granted, stream created');
        setLocalStream(stream);
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
          console.log('Local video stream connected to video element');
        }
      } catch (error: any) {
        let errorMessage = 'Error accessing media devices';
        if (error.name === 'NotAllowedError') {
          errorMessage = 'Camera and microphone access was denied. Please allow access to use video calls.';
        } else if (error.name === 'NotFoundError') {
          errorMessage = 'No camera or microphone found. Please connect a device to use video calls.';
        } else if (error.name === 'NotReadableError') {
          errorMessage = 'Your camera or microphone is already in use by another application.';
        }
        logError(errorMessage, error);
      }
    };

    if (isMediaSupported) {
      initializeLocalStream();
    }

    return () => {
      console.log('Cleaning up local stream');
      localStream?.getTracks().forEach(track => {
        track.stop();
        console.log(`Stopped track: ${track.kind}`);
      });
    };
  }, [isMediaSupported]);

  // Flush any queued ICE candidates
  const flushQueuedCandidates = async (pc: RTCPeerConnection) => {
    for (const candidate of queuedIceCandidatesRef.current) {
      try {
        await pc.addIceCandidate(new RTCIceCandidate(candidate));
        console.log('Flushed ICE candidate:', candidate.candidate);
      } catch (err) {
        logError('Error flushing ICE candidate', err);
      }
    }
    queuedIceCandidatesRef.current = [];
  };

  // Set up peer connection and Supabase subscription
  useEffect(() => {
    if (!localStream) return;

    const createPeerConnection = () => {
      console.log('Creating new RTCPeerConnection');
      const pc = new RTCPeerConnection({ iceServers });

      pc.onconnectionstatechange = () => {
        console.log(`Connection state changed to: ${pc.connectionState}`);
        setConnectionState(pc.connectionState);
      };

      pc.oniceconnectionstatechange = () => {
        console.log(`ICE connection state: ${pc.iceConnectionState}`);
      };

      pc.onsignalingstatechange = () => {
        console.log(`Signaling state: ${pc.signalingState}`);
      };

      localStream.getTracks().forEach(track => {
        pc.addTrack(track, localStream);
        console.log(`Added local track: ${track.kind}`);
      });

      pc.ontrack = (event) => {
        console.log('Received remote track', event.streams[0].id);
        const [stream] = event.streams;
        setRemoteStream(stream);
        if (remoteVideoRef.current) {
          remoteVideoRef.current.srcObject = stream;
          console.log('Remote video stream connected to video element');
        }
      };

      pc.onicecandidate = async (event) => {
        if (event.candidate) {
          console.log('New ICE candidate:', event.candidate.candidate);
          try {
            const { error } = await supabase.from('room_signals').insert({
              room_id: roomId,
              user_id: userId,
              type: 'ice-candidate',
              payload: {
                type: 'ice-candidate',
                sender: userId,
                payload: event.candidate,
                timestamp: Date.now(),
              }
            });
            if (error) {
              if (error.message.includes('duplicate key value')) {
                console.warn('Duplicate ICE candidate, ignoring.');
              } else {
                throw error;
              }
            } else {
              console.log('ICE candidate sent successfully');
            }
          } catch (err) {
            logError('Error sending ICE candidate', err);
          }
        }
      };

      return pc;
    };

    const pc = createPeerConnection();
    setPeerConnection(pc);

    console.log('Setting up realtime subscription...');
    const subscription = supabase
      .channel(`room:${roomId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'room_signals',
          filter: `room_id=eq.${roomId}`
        },
        async (payload) => {
          let signal: Signal;
          try {
            signal = typeof payload.new.payload === 'string'
              ? JSON.parse(payload.new.payload)
              : payload.new.payload;
          } catch (parseError) {
            logError('Error parsing signal payload', parseError);
            return;
          }

          if (payload.new.user_id === userId || signal.sender === userId) {
            console.log('Ignoring own signal');
            return;
          }

          try {
            switch (signal.type) {
              case 'offer':
                console.log('Processing incoming offer');
                setHasReceivedOffer(true);
                await pc.setRemoteDescription(new RTCSessionDescription(signal.payload));
                console.log('Remote description set (offer)');
                await flushQueuedCandidates(pc);

                const answer = await pc.createAnswer();
                await pc.setLocalDescription(answer);
                console.log('Local description set (answer)');

                await supabase.from('room_signals').insert({
                  room_id: roomId,
                  user_id: userId,
                  type: 'answer',
                  payload: {
                    type: 'answer',
                    sender: userId,
                    payload: answer,
                    timestamp: Date.now(),
                  }
                });
                console.log('Answer sent');
                break;

              case 'answer':
                console.log('Processing answer');
                if (pc.signalingState !== 'stable') {
                  await pc.setRemoteDescription(new RTCSessionDescription(signal.payload));
                  console.log('Remote description set (answer)');
                  await flushQueuedCandidates(pc);
                }
                break;

              case 'ice-candidate':
                // If remoteDescription is not yet set, queue the candidate.
                if (signal.payload && !pc.remoteDescription) {
                  console.log('Queuing ICE candidate');
                  queuedIceCandidatesRef.current.push(signal.payload);
                } else if (signal.payload) {
                  console.log('Adding ICE candidate');
                  await pc.addIceCandidate(new RTCIceCandidate(signal.payload));
                  console.log('ICE candidate added');
                }
                break;

              default:
                console.log('Unknown signal type:', signal.type);
            }
          } catch (err) {
            logError('Error processing signal', err);
          }
        }
      )
      .subscribe((status) => {
        console.log('Subscription status:', status);
      });

    // Auto-offer if no offer is received after a short delay.
    const autoOfferTimeout = setTimeout(async () => {
      if (!hasReceivedOffer && pc.signalingState === 'stable') {
        try {
          console.log('No incoming offer detected. Creating offer automatically.');
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);
          console.log('Local description set (offer)');

          await supabase.from('room_signals').insert({
            room_id: roomId,
            user_id: userId,
            type: 'offer',
            payload: {
              type: 'offer',
              sender: userId,
              payload: offer,
              timestamp: Date.now(),
            }
          });
          console.log('Offer sent successfully');
        } catch (err) {
          logError('Error creating/sending auto offer', err);
        }
      }
    }, 1000);

    return () => {
      console.log('Cleaning up peer connection and subscription');
      clearTimeout(autoOfferTimeout);
      subscription.unsubscribe();
      pc.close();
    };
  }, [localStream, roomId, userId, hasReceivedOffer]);

  return (
    <div className="video-call-container p-4">
      {error && (
        <div className="error-message bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}
      {!isMediaSupported ? (
        <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded mb-4">
          Your browser does not support video calls. Please use a modern browser like Chrome, Firefox, or Safari.
        </div>
      ) : (
        <>
          <div className="connection-status mb-4">
            <span className="font-semibold">Status:</span> {connectionState || 'Not connected'}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="local-video relative">
              <video
                ref={localVideoRef}
                autoPlay
                muted
                playsInline
                className="w-full h-64 object-cover rounded-lg bg-gray-900"
              />
              <div className="absolute bottom-2 left-2 bg-black bg-opacity-50 text-white px-2 py-1 rounded">
                You
              </div>
            </div>
            <div className="remote-video relative">
              <video
                ref={remoteVideoRef}
                autoPlay
                playsInline
                className="w-full h-64 object-cover rounded-lg bg-gray-900"
              />
              <div className="absolute bottom-2 left-2 bg-black bg-opacity-50 text-white px-2 py-1 rounded">
                Remote User
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default VideoCall;
