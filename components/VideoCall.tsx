import React, { useState, useEffect, useRef } from 'react';
import { createClient } from '@/utils/supabase/client';

interface VideoCallProps {
  roomId: string;
  userId: string;
}

const VideoCall: React.FC<VideoCallProps> = ({ roomId, userId }) => {
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [peerConnection, setPeerConnection] = useState<RTCPeerConnection | null>(null);
  const [connectionState, setConnectionState] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [isMediaSupported, setIsMediaSupported] = useState<boolean>(false);

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);

  const supabase = createClient();

  const iceServers = [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' }
  ];

  const logError = (message: string, error?: any) => {
    const errorMessage = `${message}: ${error?.message || error}`;
    console.error(errorMessage);
    setError(errorMessage);
  };

  // Check for WebRTC support
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

  // Initialize media stream
  useEffect(() => {
    const initializeLocalStream = async () => {
      if (typeof window === 'undefined' || !isMediaSupported) {
        return;
      }

      try {
        console.log('Requesting media permissions...');
        
        if (!navigator?.mediaDevices) {
          throw new Error('mediaDevices API not available');
        }

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

  // Set up peer connection
  useEffect(() => {
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

      pc.onicegatheringstatechange = () => {
        console.log(`ICE gathering state: ${pc.iceGatheringState}`);
      };

      if (localStream) {
        console.log('Adding local stream tracks to peer connection');
        localStream.getTracks().forEach(track => {
          pc.addTrack(track, localStream);
          console.log(`Added track: ${track.kind}`);
        });
      }

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
            const { error } = await supabase
              .from('room_signals')
              .insert({
                room_id: roomId,
                user_id: userId,
                type: 'ice-candidate',
                payload: JSON.stringify({
                  type: 'ice-candidate',
                  candidate: event.candidate
                })
              });
            
            if (error) throw error;
            console.log('ICE candidate sent successfully');
          } catch (error) {
            logError('Error sending ICE candidate', error);
          }
        }
      };

      setPeerConnection(pc);
      return pc;
    };

    const handleSignal = async (payload: any) => {
      if (!peerConnection) return;

      try {
        const signal = JSON.parse(payload.payload);
        console.log('Received signal:', signal.type);

        if (signal.type === 'offer') {
          console.log('Processing offer');
          await peerConnection.setRemoteDescription(new RTCSessionDescription(signal.offer));
          console.log('Remote description set');

          const answer = await peerConnection.createAnswer();
          await peerConnection.setLocalDescription(answer);
          console.log('Local description (answer) set');

          const { error } = await supabase
            .from('room_signals')
            .insert({
              room_id: roomId,
              user_id: userId,
              type: 'answer',
              payload: JSON.stringify({
                type: 'answer',
                answer: answer
              })
            });
          
          if (error) throw error;
          console.log('Answer sent successfully');

        } else if (signal.type === 'answer') {
          console.log('Processing answer');
          await peerConnection.setRemoteDescription(new RTCSessionDescription(signal.answer));
          console.log('Remote description set');

        } else if (signal.type === 'ice-candidate') {
          console.log('Processing ICE candidate');
          if (signal.candidate) {
            await peerConnection.addIceCandidate(new RTCIceCandidate(signal.candidate));
            console.log('ICE candidate added');
          }
        }
      } catch (error) {
        logError('Error processing signal', error);
      }
    };

    const pc = createPeerConnection();

    console.log(`Subscribing to room channel: ${roomId}`);
    const channel = supabase.channel(`room:${roomId}`);
    
    channel
      .on('broadcast', { event: 'signal' }, (payload) => {
        console.log('Received broadcast message:', payload);
        handleSignal(payload);
      })
      .subscribe((status) => {
        console.log('Subscription status:', status);
      });

    return () => {
      console.log('Cleaning up peer connection and channel subscription');
      pc.close();
      channel.unsubscribe();
    };
  }, [localStream, roomId, userId]);

  const createOffer = async () => {
    if (!peerConnection) {
      console.log('No peer connection available');
      return;
    }

    try {
      console.log('Creating offer');
      const offer = await peerConnection.createOffer();
      await peerConnection.setLocalDescription(offer);
      console.log('Local description (offer) set');

      const { error } = await supabase
        .from('room_signals')
        .insert({
          room_id: roomId,
          user_id: userId,
          type: 'offer',
          payload: JSON.stringify({
            type: 'offer',
            offer: offer
          })
        });
      
      if (error) throw error;
      console.log('Offer sent successfully');
    } catch (error) {
      logError('Error creating/sending offer', error);
    }
  };

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
            Connection Status: {connectionState || 'Not connected'}
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
          <button 
            onClick={createOffer}
            className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors disabled:bg-gray-400"
            disabled={!peerConnection || connectionState === 'connected' || !isMediaSupported}
          >
            {connectionState === 'connected' ? 'Connected' : 'Start Call'}
          </button>
        </>
      )}
    </div>
  );
};

export default VideoCall;