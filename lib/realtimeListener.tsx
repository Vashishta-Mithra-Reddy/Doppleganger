import { createClient } from "@supabase/supabase-js";
import { supabaseAdmin } from "../utils/supabase/admin";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Initialize Supabase client
const initializeSupabase = async () => {
  return createClient(supabaseUrl, supabaseServiceRoleKey);
};

// Listen for status changes in real-time
export const listenForStatusChanges = async () => {
  const supabase = await supabaseAdmin;
  const channel = supabase
    .channel("user_status_changes")
    .on(
      "postgres_changes",
      {
        event: "UPDATE",
        schema: "public",
        table: "profiles",
        filter: "status=eq.active",
      },
      async (payload) => {
        const user = payload.new;
        console.log("User status changed to active:", user.id);
        await tryMatchingUser(user, supabase);
      }
    )
    .subscribe();

  return channel;
};

// **Matchmaking with Retry**
const tryMatchingUser = async (user: any, supabase: any, retries = 5) => {
  for (let i = 0; i < retries; i++) {
    const matchedUser = await findMatchingUsers(user, supabase);
    if (matchedUser) {
      console.log(`Match found between ${user.user_id} and ${matchedUser.id}`);
      console.log(`Similarity is ${matchedUser.similarity*100}%`);
      await createConversation(user, matchedUser, supabase);
      return; // Stop retrying if a match is found
    }
    // console.log(`No match found. Retrying in 2 seconds... (${i + 1}/${retries})`);
    await new Promise((resolve) => setTimeout(resolve, 2000)); // Wait 2 seconds before retrying
  }
};

// **Find the best matching user using cosine similarity**
const findMatchingUsers = async (user: any, supabase: any) => {
  const { data: matchedUsers, error } = await supabase.rpc("find_similar_users", {
    user_id: user.id,
  });

  if (error) {
    console.error("Error fetching matched users:", error);
    return null;
  }

  return matchedUsers.length > 0 ? matchedUsers[0] : null; // Return the best match if found
};


const createConversation = async (user1: any, user2: any, supabase: any) => {
  const userIds = [user1.user_id, user2.id].sort();
  console.log("Inside createConversation function, userIds:", userIds);

  try {
      // 1️⃣ Check if conversation already exists
      const { data: existingConversation, error: fetchError } = await supabase
          .from("conversations")
          .select("id")
          .contains("participant_ids", userIds)
          .single();

      if (fetchError && fetchError.code !== 'PGRST116') { // 'PGRST116' means no rows found
          throw fetchError;
      }

      let conversationId: string;

      if (existingConversation) {
          conversationId = existingConversation.id;
          console.log("Existing conversation found:", conversationId);
      } else {
          // 2️⃣ No existing conversation, create a new one
          const { data: newConversation, error: insertError } = await supabase
              .from("conversations")
              .insert([{ participant_ids: userIds }])
              .select("id")
              .single();

          if (insertError) throw insertError;
          conversationId = newConversation.id;
          console.log("New conversation created:", conversationId);
      }

      // 3️⃣ Update user statuses
      const [update1, update2] = await Promise.all([
          supabase.from("profiles").update({ status: "busy" }).eq("user_id", user1.user_id),
          supabase.from("profiles").update({ status: "busy" }).eq("user_id", user2.id)
      ]);

      if (update1.error) throw new Error(`User 1 update failed: ${update1.error.message}`);
      if (update2.error) throw new Error(`User 2 update failed: ${update2.error.message}`);

      // 4️⃣ Notify users
      await notifyUsers(conversationId, userIds[0], userIds[1], supabase);
      return conversationId;

  } catch (error) {
      console.error("Error in createConversation:", error);
      throw error;
  }
};

// Notify both users about the match
const notifyUsers = async (conversationId: string, userId1: string, userId2: string, supabase: any) => {
    // Send to each user's specific channel
    const channel1 = supabase.channel(`user_${userId1}`);
    const channel2 = supabase.channel(`user_${userId2}`);
  
    channel1.subscribe((status: string) => {
      if (status === 'SUBSCRIBED') {
        channel1.send({
          type: 'broadcast',
          event: 'match',
          payload: { conversationId }
        });
      }
    });
  
    channel2.subscribe((status: string) => {
      if (status === 'SUBSCRIBED') {
        channel2.send({
          type: 'broadcast',
          event: 'match',
          payload: { conversationId }
        });
      }
    });
  };

// Activate user for matching
export const activateUserForMatching = async (userId: string) => {
  const supabase = await supabaseAdmin;
  const { error } = await supabase
    .from('profiles')
    .update({ status: 'active' })
    .eq('id', userId);

  if (error) console.error('Error activating user:', error);
};