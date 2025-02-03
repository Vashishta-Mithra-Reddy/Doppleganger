import { createClient } from '@/utils/supabase/client';

const initializeSupabase = async () => {
    return await createClient();
};

export const sendSignalToPeer = async(signalData: any, roomId: string) => {
    const supabase = await initializeSupabase();
    supabase
      .channel(`room:${roomId}`)
      .send({
        type: 'broadcast',
        event: 'signal',  
        payload: { signalData } 
      })
      .catch(console.error);
  };

export const receiveSignalFromPeer = async(callback: (signalData: any) => void, roomId: string) => {
  const supabase = await initializeSupabase();
  supabase
    .channel(`room:${roomId}`)
    .on('broadcast', { event: 'signal' }, (payload) => {
      callback(payload.signalData);
    })
    .subscribe();
};
