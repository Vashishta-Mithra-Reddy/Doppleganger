import type React from "react"
import { useState, useEffect, useRef } from "react"
import { createClient } from "@/utils/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { AlertCircle, Phone, PhoneOff } from "lucide-react"

interface VideoCallProps {
  roomId: string
  userId: string
}

interface Signal {
  type: "offer" | "answer" | "ice-candidate"
  sender: string
  payload: any
}

const VideoCall: React.FC<VideoCallProps> = ({ roomId, userId }) => {
  const [localStream, setLocalStream] = useState<MediaStream | null>(null)
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null)
  const [peerConnection, setPeerConnection] = useState<RTCPeerConnection | null>(null)
  const [connectionState, setConnectionState] = useState<string>("")
  const [error, setError] = useState<string>("")
  const [isMediaSupported, setIsMediaSupported] = useState<boolean>(false)
  const [isCaller, setIsCaller] = useState<boolean>(false)

  const localVideoRef = useRef<HTMLVideoElement>(null)
  const remoteVideoRef = useRef<HTMLVideoElement>(null)

  const supabase = createClient()

  const iceServers = [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
    { urls: "stun:stun2.l.google.com:19302" },
  ]

  useEffect(() => {
    const checkMediaSupport = async () => {
      try {
        const hasGetUserMedia = !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia)
        setIsMediaSupported(hasGetUserMedia)
      } catch (error) {
        console.error("Error checking media support:", error)
        setError("Error checking media support.")
      }
    }

    checkMediaSupport()
  }, [])

  useEffect(() => {
    if (!isMediaSupported) return

    const getMedia = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true })
        setLocalStream(stream)
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream
        }
      } catch (error) {
        console.error("Error getting media:", error)
        setError("Error getting media.")
      }
    }

    getMedia()
  }, [isMediaSupported])

  useEffect(() => {
    if (!localStream) return

    const createPeerConnection = async () => {
      try {
        const pc = new RTCPeerConnection({ iceServers })
        setPeerConnection(pc)

        pc.onicecandidate = (event) => {
          if (event.candidate) {
            // Send ICE candidate to server
            console.log("ICE candidate:", event.candidate)
          }
        }

        pc.ontrack = (event) => {
          if (remoteVideoRef.current) {
            remoteVideoRef.current.srcObject = event.streams[0]
            setRemoteStream(event.streams[0])
          }
        }

        localStream.getTracks().forEach((track) => pc.addTrack(track, localStream))

        // Set up signaling channel here...
      } catch (error) {
        console.error("Error creating peer connection:", error)
        setError("Error creating peer connection.")
      }
    }

    createPeerConnection()
  }, [localStream])

  const createOffer = async () => {
    if (!peerConnection) return
    try {
      setConnectionState("connecting")
      const offer = await peerConnection.createOffer()
      await peerConnection.setLocalDescription(offer)
      // Send offer to server
      console.log("Offer:", offer)
      setConnectionState("connected")
    } catch (error) {
      console.error("Error creating offer:", error)
      setError("Error creating offer.")
    }
  }

  return (
    <Card className="w-full h-full mx-auto">
      <CardContent className="p-6">
        {error && (
          <div className="flex items-center space-x-2 text-red-600 mb-4 p-3 bg-red-100 rounded-md">
            <AlertCircle size={20} />
            <span>{error}</span>
          </div>
        )}

        {!isMediaSupported ? (
          <div className="flex items-center space-x-2 text-yellow-600 mb-4 p-3 bg-yellow-100 rounded-md">
            <AlertCircle size={20} />
            <span>
              Your browser does not support video calls. Please use a modern browser like Chrome, Firefox, or Safari.
            </span>
          </div>
        ) : (
          <>
            <div className="flex justify-between items-center mb-4">
              <div className="text-sm font-medium">
                Status: <span className="text-blue-600">{connectionState || "Not connected"}</span>
                {isCaller && <span className="ml-2 text-gray-500">(Caller)</span>}
              </div>
              <Button
                onClick={createOffer}
                disabled={!peerConnection || connectionState === "connected" || !isMediaSupported}
                className="flex items-center space-x-2"
              >
                {connectionState === "connected" ? (
                  <>
                    <PhoneOff size={16} />
                    <span>End Call</span>
                  </>
                ) : (
                  <>
                    <Phone size={16} />
                    <span>Start Call</span>
                  </>
                )}
              </Button>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="relative aspect-video">
                <video
                  ref={localVideoRef}
                  autoPlay
                  muted
                  playsInline
                  className="w-full h-full object-cover rounded-lg bg-gray-900"
                />
                <div className="absolute bottom-2 left-2 bg-black bg-opacity-50 text-white px-2 py-1 text-sm rounded">
                  You
                </div>
              </div>
              <div className="relative aspect-video">
                <video
                  ref={remoteVideoRef}
                  autoPlay
                  playsInline
                  className="w-full h-full object-cover rounded-lg bg-gray-900"
                />
                <div className="absolute bottom-2 left-2 bg-black bg-opacity-50 text-white px-2 py-1 text-sm rounded">
                  Remote User
                </div>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}

export default VideoCall

