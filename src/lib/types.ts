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
  referral_code?: string;
  premium_until?: string | null;
  birth_date?: string | null; // "YYYY-MM-DD"
  birthday_shoutout?: boolean;
};

/**
 * A profile as other people see it. Same fields as Profile; any extra field the public
 * profile page reads is allowed too, so adding a field there never breaks the build.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type PublicProfile = Profile & { [extra: string]: any };

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
  bg_color?: string;
  likes_count: number;
  comments_count: number;
  created_at: string;
  profile: Profile;
  user_liked: boolean;
  user_following: boolean;
  user_saved: boolean;
  kind?: string | null; // "birthday" for automatic birthday shout-outs
  origin_user?: string | null; // set when this post was made from someone else's story
};

export type Notification = {
  id: string;
  user_id: string;
  actor_id: string | null;
  type:
    | "post_like"
    | "post_comment"
    | "swipe_like"
    | "match"
    | "message"
    | "follow"
    | "invite_prompt"
    | "referral_joined"
    | "referral_reward";
  post_id?: string | null;
  message_id?: string | null;
  read: boolean;
  created_at: string;
  actor?: Profile;
};