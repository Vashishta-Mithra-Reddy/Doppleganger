'use client';

import { useState, useEffect, useRef } from 'react';
import Peer from 'simple-peer';

type PeerConnection = Peer.Instance | null;

export default function VideoCall() {
  const [isCallStarted, setIsCallStarted] = useState<boolean>(false);
  const [isInCall, setIsInCall] = useState<boolean>(false);
  const [peer, setPeer] = useState<PeerConnection>(null);
  const [otherPeer, setOtherPeer] = useState<PeerConnection>(null);

  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);

  // Handle the creation of the video call room
  const startCall = () => {
    setIsCallStarted(true);

    // Initialize the local peer
    const localPeer = new Peer({
      initiator: true,
      trickle: false, // Set to false to wait for all ICE candidates
      stream: localVideoRef.current?.srcObject as MediaStream, // Typecasting to MediaStream
    });

    localPeer.on('signal', (signalData) => {
      // Send the signal data to the other peer (via your signaling mechanism)
      sendSignalToOtherPeer(signalData);
    });

    localPeer.on('stream', (remoteStream) => {
      // Once the remote peer's stream is received, show it on the remote video element
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = remoteStream;
      }
    });

    setPeer(localPeer);
  };

  // Function to send signaling data to the other peer (this would be done via your signaling server)
  const sendSignalToOtherPeer = (signalData: any) => {
    console.log('Sending signal to other peer:', signalData);
    // Here, you'd implement the code to send this signal via WebSocket or Supabase Realtime
  };

  const acceptCall = (signalData: any) => {
    // Accept the incoming call and initialize the peer connection
    const incomingPeer = new Peer({
      initiator: false,
      trickle: false,
      stream: localVideoRef.current?.srcObject as MediaStream, // Typecasting again
    });

    incomingPeer.on('signal', (signalData) => {
      // Send the signal to the calling peer (this could also be through WebSocket or Supabase Realtime)
      sendSignalToOtherPeer(signalData);
    });

    incomingPeer.on('stream', (remoteStream) => {
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = remoteStream;
      }
    });

    incomingPeer.signal(signalData);  // Signal data from the calling peer

    setOtherPeer(incomingPeer);
  };

  const endCall = () => {
    if (peer) {
      peer.destroy();
    }
    if (otherPeer) {
      otherPeer.destroy();
    }
    setIsCallStarted(false);
    setIsInCall(false);
  };

  // Initialize user's media stream (video + audio)
  useEffect(() => {
    const getUserMedia = async () => {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }
    };

    getUserMedia();

    // Cleanup function: stop all tracks from the local stream
    return () => {
      if (localVideoRef.current) {
        const mediaStream = localVideoRef.current.srcObject as MediaStream;
        mediaStream?.getTracks().forEach((track: MediaStreamTrack) => {
          track.stop(); // Stop each track properly
        });
      }
    };
  }, []);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-800 p-4">
      <h2 className="text-3xl text-white mb-6">Video Call Room</h2>
      <div className="flex space-x-4 mb-6">
        <div className="relative w-1/3">
          <video
            ref={localVideoRef}
            autoPlay
            muted
            className="w-full rounded-lg shadow-lg border-2 border-gray-300"
          />
          <p className="absolute bottom-2 left-2 text-sm text-white">You</p>
        </div>

        <div className="relative w-1/3">
          <video
            ref={remoteVideoRef}
            autoPlay
            className="w-full rounded-lg shadow-lg border-2 border-gray-300"
          />
          <p className="absolute bottom-2 left-2 text-sm text-white">Remote</p>
        </div>
      </div>

      <div className="flex justify-center gap-4">
        {!isCallStarted && !isInCall && (
          <button
            onClick={startCall}
            className="px-6 py-3 text-lg font-medium text-white bg-blue-500 hover:bg-blue-700 rounded-lg shadow-md"
          >
            Start Call
          </button>
        )}

        {isCallStarted && !isInCall && (
          <p className="text-white text-lg">Waiting for the other user to connect...</p>
        )}

        {isInCall && (
          <button
            onClick={endCall}
            className="px-6 py-3 text-lg font-medium text-white bg-red-500 hover:bg-red-700 rounded-lg shadow-md"
          >
            End Call
          </button>
        )}
      </div>
    </div>
  );
}
