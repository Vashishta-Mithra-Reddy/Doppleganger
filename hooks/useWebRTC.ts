import { useState } from "react"
import { createClient } from "@/utils/supabase/client"

export const useWebRTC = (roomId: string, userId: string) => {
  const [localStream, setLocalStream] = useState<MediaStream | null>(null)
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null)
  const [peerConnection, setPeerConnection] = useState<RTCPeerConnection | null>(null)
  const [connectionState, setConnectionState] = useState<string>("")
  const [error, setError] = useState<string>("")
  const [isMediaSupported, setIsMediaSupported] = useState<boolean>(false)
  const [isCaller, setIsCaller] = useState<boolean>(false)

  const supabase = createClient()

  const iceServers = [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
    { urls: "stun:stun2.l.google.com:19302" },
  ]

  const createOffer = async () => {
    if (!peerConnection) return
    try {
      const offer = await peerConnection.createOffer()
      await peerConnection.setLocalDescription(offer)
      // Send offer to server
    } catch (error) {
      setError("Error creating offer")
      console.error("Error creating offer:", error)
    }
  }

  return {
    localStream,
    remoteStream,
    peerConnection,
    connectionState,
    error,
    isMediaSupported,
    isCaller,
    createOffer,
  }
}

