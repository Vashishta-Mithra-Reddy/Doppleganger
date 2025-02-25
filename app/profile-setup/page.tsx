"use client";
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import { ProfileForm } from '@/components/ProfileForm';
import type { ProfileFormData } from '@/types/user';
import Loading from './loading';

export default function ProfileSetup() {
  const router = useRouter();
  const supabase = createClient();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
      if (user) checkExistingProfile(user.id);
    };

    fetchUser();
  }, []);

  const checkExistingProfile = async (userId: string) => {
    try {
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (profile) {
        router.push('/dashboard');
      }
    } catch (error) {
      console.error('Error checking profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (formData: ProfileFormData) => {
    if (!user) {
      setError('User not authenticated');
      return;
    }

    try {
      const interests = Array.isArray(formData.interests)
        ? formData.interests.join(" ")
        : formData.interests || "";

        console.log(interests)
        const response = await fetch('/api/embeddings', {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.NEXT_PUBLIC_HF_API_KEY}` 
          },
          body: JSON.stringify({ text: interests }),
        });
        console.log(response)
        

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to generate vector from API');
      }

      const  vector  = await response.json();

      const { error } = await supabase.from('profiles').insert({
        user_id: user.id,
        ...formData,
        status: 'offline',
        interests_vector: vector.vector,
      });

      if (error) throw error;
      router.push('/dashboard');
    } catch (error: any) {
      console.error('Error creating profile:', error);
      setError(error.message || 'Failed to create profile. Please try again.');
    }
  };

  if (loading) {
    return <Loading />;
  }

  return <ProfileForm onSubmit={handleSubmit} />;
}
