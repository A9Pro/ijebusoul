export type Profile = {
  id: string;
  name: string;
  age: number;
  gender?: string;
  preference?: string;
  location?: string;
  looking_for?: string;
  bio?: string;
  occupation?: string;
  interests: string[];
  avatar_url?: string | null;
  photos: string[];
  online_at?: string;
  created_at: string;
};

export type Match = {
  id: string;
  user1_id: string;
  user2_id: string;
  created_at: string;
  other_user: Profile;
  last_message?: string;
  last_message_at?: string;
  unread_count: number;
};

export type Message = {
  id: string;
  match_id: string;
  sender_id: string;
  content: string;
  read_at?: string | null;
  created_at: string;
};

export type Post = {
  id: string;
  user_id: string;
  type: "photo" | "video" | "text";
  caption?: string;
  media_url?: string | null;
  likes_count: number;
  comments_count: number;
  created_at: string;
  profile: Profile;
  user_liked: boolean;
  user_following: boolean;
  user_saved: boolean;
};