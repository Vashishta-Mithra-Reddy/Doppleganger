export interface UserProfile {
  id: string;
  user_id: string;
  full_name: string;
  bio: string;
  interests: string[];
  hobbies: string[];
  avatar_url?: string;
  status: 'idle' | 'active' | 'busy';
  created_at: string;
  updated_at: string;
}

export interface ProfileFormData {
  full_name: string;
  bio: string;
  interests: string[];
  hobbies: string[];
  avatar_url?: string;
} 