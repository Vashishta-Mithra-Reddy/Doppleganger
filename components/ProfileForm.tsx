import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import type { ProfileFormData } from "@/types/user"
import type React from "react" // Added import for React

interface ProfileFormProps {
  onSubmit: (data: ProfileFormData) => void;
}

export function ProfileForm({ onSubmit }: ProfileFormProps) {
  const [formData, setFormData] = useState<ProfileFormData>({
    full_name: '',
    bio: '',
    interests: [],
    hobbies: [],
  });

  const handleInterestsChange = (value: string) => {
    const interests = value.split(',').map(i => i.trim()).filter(Boolean);
    setFormData(prev => ({ ...prev, interests }));
  };

  const handleHobbiesChange = (value: string) => {
    const hobbies = value.split(',').map(h => h.trim()).filter(Boolean);
    setFormData(prev => ({ ...prev, hobbies }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-6 p-6 rounded-lg w-2/6 mx-auto border border-input min-w-1/6"
    >
      <p className="font-semibold text-center border-b-2 pb-4 text-md">Tell us more about you</p>
      <div className="space-y-2">
        <Label htmlFor="full_name">Name<span className="text-red-500"> *</span></Label>
        <Input
          id="full_name"
          type="text"
          required
          placeholder="Enter your name"
          value={formData.full_name}
          onChange={(e) => setFormData((prev) => ({ ...prev, full_name: e.target.value }))}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="bio">Bio</Label>
        <Textarea
          id="bio"
          placeholder="Write about yourself"
          rows={1}
          value={formData.bio}
          onChange={(e) => setFormData((prev) => ({ ...prev, bio: e.target.value }))}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="interests">Interests (comma-separated) <span className="text-red-500"> *</span></Label>
        <Input
          id="interests"
          type="text"
          required
          placeholder="Reading, writing, coding"
          onChange={(e) => handleInterestsChange(e.target.value)}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="hobbies">Hobbies (comma-separated)</Label>
        <Input
          id="hobbies"
          type="text"
          placeholder="Photography, gaming, hiking"
          onChange={(e) => handleHobbiesChange(e.target.value)}
        />
      </div>

      <Button type="submit" className="w-full">
        Complete Profile
      </Button>
    </form>
  )
} 


