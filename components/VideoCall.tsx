'use client';

import { useState, useEffect, useRef } from 'react';
import Peer from 'simple-peer';
import { sendSignalToPeer, receiveSignalFromPeer } from '@/utils/signaling';

type PeerConnection = Peer.Instance | null;

interface VideoCallProps {
  currentUserId: string;
  otherUserId: string;
  roomId: string;  // Add roomId to identify the room
}

export default function VideoCall({ currentUserId, otherUserId, roomId }: VideoCallProps) {
  const [isInCall, setIsInCall] = useState<boolean>(false);
  const [peer, setPeer] = useState<PeerConnection>(null);
  const [otherPeer, setOtherPeer] = useState<PeerConnection>(null);

  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);

  // Send signal to the other peer (offer/answer)
  const sendSignal = (signalData: any) => {
    sendSignalToPeer(signalData, roomId);
  };

  // Accept the incoming call when the answer is received
  const acceptCall = (signalData: any) => {
    const incomingPeer = new Peer({
      initiator: false,
      trickle: false,
      stream: localVideoRef.current?.srcObject as MediaStream,
    });

    incomingPeer.on('signal', (signalData) => {
      sendSignal(signalData);  // Send back the signal (answer)
    });

    incomingPeer.on('stream', (remoteStream) => {
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = remoteStream;
      }
    });

    incomingPeer.signal(signalData);  // Signal data from the calling peer
    setOtherPeer(incomingPeer);
  };

  const startCall = async () => {
    const localPeer = new Peer({
      initiator: true,
      trickle: false,
      stream: localVideoRef.current?.srcObject as MediaStream,
    });

    localPeer.on('signal', (signalData) => {
      sendSignal(signalData);  // Send offer to the other peer
    });

    localPeer.on('stream', (remoteStream) => {
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = remoteStream;
      }
    });

    setPeer(localPeer);
  };

  const endCall = () => {
    if (peer) peer.destroy();
    if (otherPeer) otherPeer.destroy();
    setIsInCall(false);
  };

  // Get the user's media stream (video + audio)
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

    return () => {
      if (localVideoRef.current) {
        const mediaStream = localVideoRef.current.srcObject as MediaStream;
        mediaStream?.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  // Automatically start the call once both users are matched
  useEffect(() => {
    if (currentUserId && otherUserId) {
      startCall();
      receiveSignalFromPeer(acceptCall, roomId);  // Listen for incoming calls
    }
  }, [currentUserId, otherUserId, roomId]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[100%] p-4">
      <div className="flex space-x-4 mb-6 min-h-[100%]">
        <div className="relative w-1/3">
          <video
            ref={localVideoRef}
            autoPlay
            muted
            className="w-full rounded-lg shadow-lg border-2 border-gray-300"
          />
          <p className="absolute bottom-2 left-2 text-sm text-white">You</p>
        </div>

        <div className="relative w-2/3">
          <video
            ref={remoteVideoRef}
            autoPlay
            className="w-full rounded-lg shadow-lg border-2 border-gray-300"
          />
          <p className="absolute bottom-2 left-2 text-sm text-white">Remote</p>
        </div>
      </div>

      <div className="flex justify-center gap-4 bg-white">
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
