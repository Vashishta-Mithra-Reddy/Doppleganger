"use client"
import { useEffect, useState } from "react"
import { createClient } from "@/utils/supabase/client"
import ChatComponent from "@/components/Chat"
import { useParams, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { X } from "lucide-react"
import dynamic from "next/dynamic"
const VideoCall = dynamic(() => import('@/components/VideoCall'), {
  ssr: false
});

const supabase = createClient()

export default function RoomClientPage() {
  const { roomId } = useParams()
  const router = useRouter()
  const [participants, setParticipants] = useState<string[]>([])
  const [userId, setUserId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [otherUser, setOtherUser] = useState<string | null>(null)

  useEffect(() => {
    const fetchData = async () => {
      try {
        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser()
        if (userError || !user) throw new Error("Not authenticated")
        setUserId(user.id)

        const { data: conversation, error: convError } = await supabase
          .from("conversations")
          .select("participant_ids")
          .eq("id", roomId)
          .single()

        if (convError) throw convError
        if (!conversation) throw new Error("Conversation not found")

        const otherUserId =
          user.id === conversation.participant_ids[0]
            ? conversation.participant_ids[1]
            : conversation.participant_ids[0]
        setOtherUser(otherUserId)

        setParticipants([conversation.participant_ids[0], conversation.participant_ids[1]])
        setLoading(false)
      } catch (error) {
        console.error(error)
        setError(error instanceof Error ? error.message : "An error occurred")
        setLoading(false)
      }
    }

    fetchData()
  }, [roomId])
  // useEffect(() => {
  //   let channel: any = null;
  
  //   const handleSubscription = async () => {
  //     // Create a dedicated channel for this subscription
  //     channel = supabase
  //       .channel('conversation-updates')
  //       .on(
  //         'postgres_changes',
  //         {
  //           event: 'UPDATE',
  //           schema: 'public',
  //           table: 'conversations',
  //           filter: `id=eq.${roomId}`,
  //         },
  //         (payload) => {
  //           if (payload.new.active === false) {
  //             router.push("/dashboard");
  //           }
  //         }
  //       )
  //       .subscribe((status, err) => {
  //         if (err) {
  //           console.error('Subscription error:', err);
  //           return;
  //         }
  //         console.log('Subscription status:', status);
  //       });
  
  //     if (channel) return channel;
  //   };
  
  //   handleSubscription();
  
  //   return ;
  // }, [roomId, router]);

  const handleLeaveRoom = async () => {
    // const { error } = await supabase
    //   .from('conversations')
    //   .update({ active: false })
    //   .eq('id', roomId);
  
    // if (!error) {
      router.push("/dashboard");
    // }
  };

  if (loading)
    return <div className="fixed inset-0 flex items-center justify-center bg-background">Loading conversation...</div>
  if (error)
    return <div className="fixed inset-0 flex items-center justify-center bg-background text-destructive">{error}</div>

  return (
    <div className="fixed inset-0 bg-background flex flex-col">
      <div className="p-4 border-b flex justify-between items-center">
        <div className="flex items-center gap-2">
          <span>Chatting with {otherUser ? `User ${otherUser.slice(0, 6)}` : "..."}</span>
        </div>
        <Button variant="ghost" size="sm" onClick={handleLeaveRoom} className="hover:bg-red-500/10 hover:text-red-500">
          <X className="h-4 w-4" />
        </Button>
      </div>
      <div className="flex flex-1 overflow-hidden flex-col md:flex-row items-center md:items-stretch">
        <div className="w-full md:w-[70%] p-4 border-b md:border-r md:border-b-0">
          <VideoCall roomId={roomId as string} userId={userId as string} />
        </div>
        <div className="w-[95%] md:w-[30%] md:pr-0 max-h-[49%] md:max-h-[100%]">
          {userId && participants.length === 2 && (
            <ChatComponent conversationId={roomId as string} userId={userId} participants={participants} />
          )}
        </div>
      </div>
    </div>
  )
}

