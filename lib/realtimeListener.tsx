import { createClient } from "@supabase/supabase-js";
import { supabaseAdmin } from "../utils/supabase/admin";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
// Initialize Supabase client with service role
const initializeSupabase = async() => {
  return createClient(supabaseUrl, supabaseServiceRoleKey);
};


// Listen for status changes and handle matching
export const listenForStatusChanges = async () => {
  const supabase = await supabaseAdmin;
  const channel = supabase
    .channel('user_status_changes')
    .on('postgres_changes', {
      event: 'UPDATE',
      schema: 'public',
      table: 'profiles',
      filter: 'status=eq.active',
    }, async (payload) => {
      const user = payload.new;
      console.log('User status changed to active:', user.id);
      await findMatchingUsers(user, supabase);
    })
    .subscribe();

  return channel;
};

// Find users with matching interests
const findMatchingUsers = async (user: any, supabase: any) => {
  const { data: activeUsers, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('status', 'active')
    .neq('id', user.id);

  if (error) {
    console.error('Error fetching active users:', error);
    return;
  }

  const matchedUser = activeUsers.find((otherUser: any) => 
    user.interests.some((interest: string) => 
      otherUser.interests.includes(interest)
    )
  );

  if (matchedUser) {
    console.log(`Match found between ${user.user_id} and ${matchedUser.user_id}`);
    await createConversation(user, matchedUser, supabase);
  }
};

const createConversation = async (user1: any, user2: any, supabase: any) => {
  const userIds = [user1.user_id, user2.user_id].sort();

  try {
      // 1️⃣ First attempt to insert conversation
      const { data: newConversation, error: insertError } = await supabase
          .from("conversations")
          .insert([{ participant_ids: userIds }])
          .select()
          .single();

      let conversationId: string;

      if (insertError) {
          // 2️⃣ Handle unique constraint violation
          if (insertError.code === '23505') {
              // Fetch existing conversation
              const { data: existingConversation, error: fetchError } = await supabase
                  .from("conversations")
                  .select("id")
                  .eq("participant_ids", userIds)
                  .single();

              if (fetchError) throw fetchError;
              conversationId = existingConversation.id;
              console.log("Existing conversation found:", conversationId);
          } else {
              throw insertError;
          }
      } else {
          // 3️⃣ New conversation created successfully
          conversationId = newConversation.id;
          console.log("New conversation created:", conversationId);
      }

      // 4️⃣ Update user statuses
      const [update1, update2] = await Promise.all([
          supabase.from("profiles").update({ status: "busy" }).eq("user_id", user1.user_id),
          supabase.from("profiles").update({ status: "busy" }).eq("user_id", user2.user_id)
      ]);

      if (update1.error) throw new Error(`User 1 update failed: ${update1.error.message}`);
      if (update2.error) throw new Error(`User 2 update failed: ${update2.error.message}`);

      // 5️⃣ Notify users
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