export interface User {
  id: string;
  email: string;
  displayName: string;
  role: 'admin' | 'user';
  photoURL?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Court {
  id: string;
  name: string;
  location: string;
  pricePerHour: number;
  description?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface Member {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  skillLevel: 'Mới bắt đầu' | 'Trung bình' | 'Khá' | 'Giỏi' | 'Chuyên nghiệp';
  joinDate: Date;
  isActive: boolean;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Group {
  id: string;
  name: string;
  description?: string;
  memberIds: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface SessionExpense {
  id: string;
  name: string;
  amount: number;
  type: 'court' | 'shuttlecock' | 'other';
  description?: string;
}

export interface SessionMember {
  memberId: string;
  memberName?: string;
  isPresent: boolean;
  isCustom?: boolean;
  joinedAt?: Date;
  leftAt?: Date;
}

export interface WaitingListMember {
  memberId: string;
  memberName?: string;
  isCustom?: boolean;
  addedAt: Date;
  priority: number;
}

export interface Session {
  id: string;
  name: string;
  courtId: string;
  date: Date;
  startTime: string;
  endTime: string;
  maxParticipants: number;
  currentParticipants: number;
  status: 'scheduled' | 'ongoing' | 'completed' | 'cancelled';
  members: SessionMember[];
  waitingList: WaitingListMember[];
  expenses: SessionExpense[];
  totalCost: number;
  costPerPerson: number;
  notes?: string;
  qrImage?: string;
  settlements: Settlement[];
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Settlement {
  memberId: string;
  memberName: string;
  amount: number;
  isPaid: boolean;
}

export interface ReportFilter {
  startDate?: Date;
  endDate?: Date;
  memberName?: string;
  courtId?: string;
  status?: Session['status'];
}

export interface SessionStats {
  totalSessions: number;
  totalRevenue: number;
  averageCostPerSession: number;
  mostActiveMembers: { memberId: string; sessionCount: number }[];
  courtUsage: { courtId: string; sessionCount: number }[];
}

export interface AppSettings {
  id: string;
  defaultSessionDuration: number; // minutes
  defaultMaxParticipants: number;
  defaultShuttlecockCost: number;
  currency: string;
  timezone: string;
  updatedAt: Date;
}