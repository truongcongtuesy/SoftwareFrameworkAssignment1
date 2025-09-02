export interface Group {
  id: number;
  name: string;
  description: string;
  adminId: number;
  admins: number[];
  members: number[];
  channels: number[];
  createdAt: Date;
  isActive: boolean;
}

export interface CreateGroupRequest {
  name: string;
  description?: string;
  adminId: number;
}
