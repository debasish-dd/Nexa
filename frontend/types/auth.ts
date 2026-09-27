export type LoginPayload = {
  identifier: string; // email OR username — backend looks up by either
  password: string;
};

export type SignupPayload = {
  name: string;
  username: string;
  email: string;
  password: string;
};


export type AuthUser = {
  id: string;
  username: string;
  email: string;
  role: string;
  user_status: string;
  email_verified_at: string | null;
};