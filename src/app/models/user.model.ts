export interface UserOut {
  user_id: number;
  full_name: string;
  email: string;
  email_verified: boolean;
  created_at?: string; // string, porque el backend lo manda como ISO datetime
}
