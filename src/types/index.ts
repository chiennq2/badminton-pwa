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
  memberIds?: string[]; // Members who share this expense (for 'other' type)
}

export interface SessionMember {
  memberId: string;
  isPresent: boolean;
  joinedAt?: Date;
  leftAt?: Date;
  memberName?: string;
  isCustom?: boolean;
  replacementNote?: string;
}

export interface WaitingListMember {
  memberId: string;
  addedAt: Date;
  priority: number;
  memberName?: string;
  isCustom?: boolean;
}

export interface Settlement {
  memberId: string;
  memberName: string;
  amount: number;
  isPaid: boolean;
  paidAt?: Date;
  paymentMethod?: 'cash' | 'transfer' | 'card';
  notes?: string;
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
  settlements: Settlement[];
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  qrImage?: string;
  host?: {
    name: string;
    isCustom?: boolean; // true nếu nhập tay, false nếu chọn từ danh sách
    memberId?: string; // ID nếu chọn từ danh sách members
  };
  paymentQR?: string; // Base64 string hoặc URL của ảnh QR
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

export interface PaymentStats {
  totalCollected: number;
  totalPending: number;
  totalSessions: number;
  completionRate: number;
}

export interface MemberSettlementDetail {
  baseCost: number; // Court + shuttlecock cost divided by present members
  additionalCosts: { 
    expenseId: string;
    name: string; 
    amount: number; 
    sharedWith: number; // Number of people sharing this cost
  }[];
  total: number;
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