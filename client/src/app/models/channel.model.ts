export interface Channel {
  id: number;
  name: string;
  description: string;
  groupId: number;
  adminId: number;
  members: number[];
  bannedUsers: number[];
  messages: Message[];
  createdAt: Date;
  isActive: boolean;
}

export interface CreateChannelRequest {
  name: string;
  description?: string;
  groupId: number;
  adminId: number;
}

export interface Message {
  id: number;
  channelId: number;
  userId: number;
  username: string;
  content: string;
  type: 'text' | 'image' | 'video' | 'file' | 'video-call' | 'system';
  timestamp: Date;
  edited: boolean;
  editedAt?: Date;
}
