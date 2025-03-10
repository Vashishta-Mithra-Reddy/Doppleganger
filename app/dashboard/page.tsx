"use client";
import { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { listenForStatusChanges } from "@/lib/realtimeListener";

type UserStatus = "idle" | "active" | "busy";

export default function DashboardPage() {
  const [userId, setUserId] = useState<string | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const supabase = createClient();

  // Fetch user and initialize status
  useEffect(() => {
    const initializeUser = async () => {
      const { data, error } = await supabase.auth.getUser();
      
      if (error || !data?.user) {
        console.error("User authentication error:", error);
        setError("User not authenticated");
        return;
      }

      setUserId(data.user.id);
    };

    initializeUser();
  }, []);

  // Update status only when userId is available
  useEffect(() => {
    if (!userId) return;

    updateStatus("idle");

    return () => {
      updateStatus("idle");
    };
  }, [userId]);

  // Real-time subscription setup
  useEffect(() => {
    if (!userId) return;

    let subscription: any;
    const setupRealtime = async () => {
      subscription = await listenForStatusChanges();
      
      // Listen for broadcast events when a match is found
      const channel = supabase.channel(`user_${userId}`)
        .on('broadcast', { event: 'match' }, (payload) => {
          handleMatchFound(payload.payload.conversationId);
        })
        .subscribe();

      return () => {
        channel.unsubscribe();
      };
    };

    setupRealtime();

    return () => {
      if (subscription) {
        subscription.unsubscribe();
      }
    };
  }, [userId]);

  // Update user status in Supabase
  const updateStatus = async (newStatus: UserStatus) => {
    if (!userId) {
      console.error("updateStatus called but userId is null");
      setError("User ID is missing");
      return;
    }

    console.log(`Attempting to update status for user: ${userId} to ${newStatus}`);

    const { data, error } = await supabase
      .from("profiles")
      .update({ status: newStatus })
      .eq("user_id", userId)
      .select(); // Fetch updated row for debugging

    if (error) {
      console.error("Status update error:", JSON.stringify(error, null, 2));
      setError("Failed to update status");
    } else {
      console.log("Status successfully updated:", data);
    }
  };

  const handleMatchFound = (conversationId: string) => {
    setIsSearching(false);
    updateStatus("busy");
    router.push(`/rooms/${conversationId}`);
  };

  const handleFindDoppleganger = async () => {
    setIsSearching(true);
    setError(null);

    try {
      if (!userId) throw new Error("User not authenticated");
      
      // Activate matching status
      await updateStatus("active");
      
      // Timeout safety
      setTimeout(() => {
        if (isSearching) {
          setError("Match timed out - try again!");
          setIsSearching(false);
          updateStatus("idle");
        }
      }, 30000);

    } catch (error) {
      console.error("Error in find doppelganger:", error);
      setError(error instanceof Error ? error.message : "An unexpected error occurred");
      setIsSearching(false);
      await updateStatus("idle");
    }
  };

  return (
    <div className="min-h-vh p-6 flex flex-col items-center">
      <div className="max-w-4xl w-full">
        {/* Find Doppelgänger Button */}
        <div className="flex justify-center mb-8">
          <Button
            onClick={handleFindDoppleganger}
            disabled={isSearching}
            className="text-lg"
            variant={isSearching ? "secondary" : "default"}
          >
            {isSearching ? (
              <span className="animate-pulse">🔍 Searching for your match...</span>
            ) : (
              "Find your Doppelgänger !"
            )}
          </Button>
        </div>
  
        {/* Error Message */}
        {error && (
          <div className="mb-4 p-4 bg-destructive/10 text-destructive rounded-lg">
            {error}
          </div>
        )}
  
        {/* Subtle Decorative Elements */}
        <div className="grid grid-cols-3 gap-4">
          <div className="h-28 bg-muted rounded-lg shadow-sm"></div>
          <div className="h-28 bg-muted rounded-lg shadow-sm"></div>
          <div className="h-28 bg-muted rounded-lg shadow-sm"></div>
        </div>
  
        {/* Minimalist Divider */}
        <div className="my-8 border-t border-border"></div>
  
        {/* Soft UI Elements to Fill Space */}
        <div className="grid grid-cols-2 gap-6">
          <div className="h-20 bg-muted rounded-lg shadow-sm"></div>
          <div className="h-20 bg-muted rounded-lg shadow-sm"></div>
        </div>
  
        {/* Aesthetic Footer Element */}
        <div className="mt-10 p-4 bg-muted/50 rounded-lg shadow-sm flex items-center justify-center mb-6">
          <p className="text-sm text-muted-foreground">✨ Discover your twin in the digital world... ✨</p>
        </div>
      </div>
    </div>
  );
  
  
}
