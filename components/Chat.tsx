"use client"
import { useEffect, useState, useRef } from "react"
import { createClient } from "@/utils/supabase/client"
import { Send } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

const supabase = createClient()

interface Message {
  id: string
  sender_id: string
  content: string
  created_at: string
}

interface ChatProps {
  conversationId: string
  userId: string
  participants: string[]
}

export default function Chat({ conversationId, userId, participants }: ChatProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState("")
  const [isInitialized, setIsInitialized] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const initializeChat = async () => {
      try {
        // Check if conversation exists
        const { data: existingConversation, error: conversationError } = await supabase
          .from("conversations")
          .select("*")
          .eq("id", conversationId)
          .single()

        if (conversationError && conversationError.code !== "PGRST116") {
          throw conversationError
        }

        // No need to create conversation as it's already created in the dashboard

        // Check for existing messages
        const { data: existingMessages, error: messagesError } = await supabase
          .from("messages")
          .select("*")
          .eq("conversation_id", conversationId)
          .limit(1)

        if (messagesError) {
          throw messagesError
        }

        // Create welcome message if no messages exist
        if (!existingMessages || existingMessages.length === 0) {
          const { error: welcomeError } = await supabase.from("messages").insert([
            {
              conversation_id: conversationId,
              sender_id: userId,
              content: "Chat initialized. Welcome! 👋",
              created_at: new Date().toISOString(),
            },
          ])

          if (welcomeError) {
            throw welcomeError
          }
        }

        setIsInitialized(true)
        setError(null)
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "An unexpected error occurred"
        setError(errorMessage)
        console.error("Error initializing chat:", err)
      }
    }

    initializeChat()
  }, [conversationId, userId])

  useEffect(() => {
    if (!isInitialized) return

    const fetchMessages = async () => {
      try {
        const { data, error: fetchError } = await supabase
          .from("messages")
          .select("*")
          .eq("conversation_id", conversationId)
          .order("created_at", { ascending: true })

        if (fetchError) throw fetchError

        if (data) setMessages(data)
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "Failed to fetch messages"
        setError(errorMessage)
        console.error("Error fetching messages:", err)
      }
    }

    fetchMessages()

    const channel = supabase
      .channel(`chat-${conversationId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          if (payload.eventType === "INSERT") {
            setMessages((prev) => [...prev, payload.new as Message])
          } else if (payload.eventType === "DELETE") {
            setMessages((prev) => prev.filter((msg) => msg.id !== payload.old.id))
          } else if (payload.eventType === "UPDATE") {
            setMessages((prev) => prev.map((msg) => (msg.id === payload.new.id ? (payload.new as Message) : msg)))
          }
        },
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [conversationId, isInitialized])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  const sendMessage = async () => {
    if (!newMessage.trim()) return

    try {
      const { error: sendError } = await supabase.from("messages").insert([
        {
          conversation_id: conversationId,
          sender_id: userId,
          content: newMessage.trim(),
          created_at: new Date().toISOString(),
        },
      ])

      if (sendError) throw sendError

      setNewMessage("")
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to send message"
      setError(errorMessage)
      console.error("Error sending message:", err)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      sendMessage()
    }
  }

  if (!isInitialized) {
    return (
      <div className="flex flex-col items-center justify-center h-full bg-background border-l">
        <div className="text-muted-foreground mb-2">Initializing chat...</div>
        {error && <div className="text-destructive text-sm px-4 text-center">{error}</div>}
      </div>
    )
  }

  return (
    <div className="h-full">
      <div className="flex flex-col h-full bg-background border-l border-t border-b border-r">
        {error && <div className="bg-destructive/10 p-2 text-destructive text-sm text-center">{error}</div>}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map((msg) => (
            <div key={msg.id} className={`flex ${msg.sender_id === userId ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-[70%] p-3 rounded-lg ${
                  msg.sender_id === userId
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary text-secondary-foreground"
                }`}
              >
                {msg.content}
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>
        <div className="p-4 border-t">
          <div className="flex space-x-2">
            <Input
              type="text"
              placeholder="Type your message"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              className="flex-1"
            />
            <Button onClick={sendMessage} size="icon">
              <Send className="h-4 w-4" />
              <span className="sr-only">Send message</span>
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

