export interface CombotGroup {
  id: number;
  title: string;
  type: string;
  username?: string;
}

export interface CombotStats {
  members: number;
  messages: number;
  activeUsers: number;
  topUsers: Array<{ userId: number; username: string; messages: number }>;
}
