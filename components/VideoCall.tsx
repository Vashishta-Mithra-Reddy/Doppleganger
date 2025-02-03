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

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);

  // Supabase client setup (replace with your actual Supabase credentials)
  const supabase = createClient();

  // ICE server configuration
  const iceServers = [
    { urls: 'stun:stun.l.google.com:19302' }
    // { 
    //   urls: 'turn:your-turn-server.com',
    //   username: 'your-username',
    //   credential: 'your-password'
    // }
  ];

  // Initialize local media stream
  useEffect(() => {
    const initializeLocalStream = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true
        });
        setLocalStream(stream);
        
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }
      } catch (error) {
        console.error('Error accessing media devices:', error);
      }
    };

    initializeLocalStream();
  }, []);

  // Set up peer connection
  useEffect(() => {
    const createPeerConnection = () => {
      const pc = new RTCPeerConnection({ iceServers });
      
      // Add local stream tracks to peer connection
      if (localStream) {
        localStream.getTracks().forEach(track => {
          pc.addTrack(track, localStream);
        });
      }

      // Handle incoming remote tracks
      pc.ontrack = (event) => {
        const [remoteStream] = event.streams;
        setRemoteStream(remoteStream);
        
        if (remoteVideoRef.current) {
          remoteVideoRef.current.srcObject = remoteStream;
        }
      };

      // Handle ICE candidate generation
      pc.onicecandidate = (event) => {
        if (event.candidate) {
          // Send ICE candidate to the other peer via Supabase
          supabase
            .from('room_signals')
            .insert({
              room_id: roomId,
              user_id: userId,
              type: 'ice-candidate',
              payload: JSON.stringify(event.candidate)
            });
        }
      };

      setPeerConnection(pc);
      return pc;
    };

    const pc = createPeerConnection();

    // Listen for signaling messages
    const signalSubscription = supabase
      .channel(`room:${roomId}`)
      .on('broadcast', { event: 'signal' }, async (payload) => {
        const signal = JSON.parse(payload.payload);
        
        if (signal.type === 'offer') {
          await pc.setRemoteDescription(new RTCSessionDescription(signal.offer));
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          
          // Send answer back to the other peer
          supabase
            .from('room_signals')
            .insert({
              room_id: roomId,
              user_id: userId,
              type: 'answer',
              payload: JSON.stringify(answer)
            });
        } else if (signal.type === 'answer') {
          await pc.setRemoteDescription(new RTCSessionDescription(signal.answer));
        } else if (signal.type === 'ice-candidate') {
          await pc.addIceCandidate(new RTCIceCandidate(signal.candidate));
        }
      })
      .subscribe();

    // Cleanup function
    return () => {
      pc.close();
      localStream?.getTracks().forEach(track => track.stop());
      signalSubscription.unsubscribe();
    };
  }, [localStream, roomId, userId]);

  // Create and send offer
  const createOffer = async () => {
    if (!peerConnection) return;

    try {
      const offer = await peerConnection.createOffer();
      await peerConnection.setLocalDescription(offer);

      // Send offer via Supabase
      supabase
        .from('room_signals')
        .insert({
          room_id: roomId,
          user_id: userId,
          type: 'offer',
          payload: JSON.stringify(offer)
        });
    } catch (error) {
      console.error('Error creating offer:', error);
    }
  };

  return (
    <div className="video-call-container">
      <div className="local-video">
        <video 
          ref={localVideoRef} 
          autoPlay 
          muted 
          playsInline 
          className="w-full h-full object-cover"
        />
      </div>
      <div className="remote-video">
        <video 
          ref={remoteVideoRef} 
          autoPlay 
          playsInline 
          className="w-full h-full object-cover"
        />
      </div>
      <button 
        onClick={createOffer}
        className="start-call-btn"
      >
        Start Call
      </button>
    </div>
  );
};

export default VideoCall;