"use client"

import { createClient } from "@/utils/supabase/client";

export default function Doppleganger() {
    const supabase = createClient();
    const handleAction = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) {
            console.error("No user logged in");
            return;
        }

        const { error } = await supabase
            .from("profiles")
            .update({ status: "idle" })
            .eq('user_id', user.id)
            .single();

        if (error) {
            console.error("Error updating status:", error);
        } else {
            console.log("Status updated to idle successfully.");
        }
    };

    return (
        <button className="border-2 p-3 rounded-lg hover:bg-white hover:text-black px-4" onClick={handleAction}>
            Find your Doppleganger
        </button>
    );
}
