export interface User {
  id: string;
  email: string;
  displayName: string;
  role: 'admin' | 'user';
  photoURL?: string;
  createdAt: Date;
  updatedAt: Date;
  isActive: boolean;
  qrCode?: string;
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
  skillLevel: 'Pot 5' | 'Pot 4' | 'Pot 3' | 'Pot 2' | 'Pot 1';
  joinDate: Date;
  birthDay?: Date;
  isWoman: boolean | false;
  avatar?: string;
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
  createdBy: string; // ✅ Thêm người tạo
  createdByName?: string; // ✅ Tên người tạo (optional để dễ hiển thị)
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
  avatar?: string;
  isPresent: boolean;
  joinedAt?: Date;
  leftAt?: Date;
  memberName?: string;
  isCustom?: boolean;
  isWoman?: boolean;
  replacementNote?: string;
  notePayment?:  string; // ✅ thêm dòng này
  isWaitingPass?: boolean; // ✅ THÊM MỚI

}

export interface WaitingListMember {
  memberId: string;
  addedAt: Date;
  priority: number;
  memberName?: string;
  isCustom?: boolean;
  isWoman?: boolean;
  avatar?: string;
  replacementNote?: string; // ✅ Đảm bảo có field này

}

export interface Settlement {
  memberId: string;
  memberName: string;
  amount: number;
  isPaid: boolean;
  paidAt?: Date;
  paymentMethod?: 'cash' | 'transfer' | 'card';
  notes?: string;
  paymentNote?: string;
  replacementNote?: string; // ✅ Đảm bảo có field này

}

export interface Session {
  id: string;
  name: string;
  courtId: string;
  date: Date;
  startTime: string;
  endTime: string;
  maxParticipants: number;
  priceSlot: number | 0;
  isFixedBadmintonCost: boolean | false;
  fixedBadmintonCost: number | 0;
  currentParticipants: number;
  status: 'scheduled' | 'ongoing' | 'completed' | 'cancelled';
  members: SessionMember[];
  waitingList: WaitingListMember[];
  passWaitingList?: string[]; // ✅ THÊM MỚI
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
  defaultSessionDuration: number; // minutes
  defaultMaxParticipants: number;
  defaultShuttlecockCost: number;
  isFixedBadmintonCost: boolean;
  fixedBadmintonCost: number;
  currency: string;
  timezone: string;
  updatedAt: Date;
}