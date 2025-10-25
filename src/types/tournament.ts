// src/types/tournament.ts

export type TournamentFormat = 'single-elimination' | 'round-robin' | 'mixed';
export type TournamentCategory = 'men-singles' | 'women-singles' | 'men-doubles' | 'women-doubles' | 'mixed-doubles';
export type TournamentStatus = 'draft' | 'registration' | 'ongoing' | 'completed' | 'cancelled';
export type PotLevel = 'Pot 1' | 'Pot 2' | 'Pot 3' | 'Pot 4' | 'Pot 5';
export type MatchStatus = 'pending' | 'scheduled' | 'ongoing' | 'completed' | 'walkover';

export interface TournamentParticipant {
  id: string;
  name: string;
  isCustom: boolean; // true = nhập tay, false = từ danh sách members
  memberId?: string; // ID trong collection members (nếu isCustom = false)
  potLevel: PotLevel;
  isWoman: boolean;
  categories: TournamentCategory[]; // Các nội dung tham gia
  avatar?: string;
  email?: string;
  phone?: string;
}

export interface TournamentTeam {
  id: string;
  player1: TournamentParticipant;
  player2: TournamentParticipant;
  potLevel: PotLevel; // Trung bình pot của 2 người
  category: TournamentCategory;
}

export interface TournamentGroup {
  id: string;
  name: string; // A, B, C, D
  category: TournamentCategory;
  participants: (TournamentParticipant | TournamentTeam)[];
  matches: TournamentMatch[];
  standings: GroupStanding[];
}

export interface GroupStanding {
  participantId: string;
  participantName: string;
  played: number;
  won: number;
  lost: number;
  points: number; // 2 điểm/thắng, 1 điểm/hòa, 0 điểm/thua
  gamesWon: number;
  gamesLost: number;
  gameDiff: number; // hiệu số games
  position: number;
}

export interface TournamentMatch {
  id: string;
  tournamentId: string;
  category: TournamentCategory;
  round: string; // 'R1', 'R2', 'R16', 'R8', 'QF', 'SF', 'F' (Final)
  matchNumber: number;
  groupId?: string; // Nếu là vòng bảng
  
  // Participants
  participant1?: TournamentParticipant | TournamentTeam | null;
  participant2?: TournamentParticipant | TournamentTeam | null;
  
  // Scheduling
  courtId?: string;
  scheduledDate?: Date;
  scheduledTime?: string;
  
  // Match details
  status: MatchStatus;
  scores: MatchScore[];
  winner?: string; // participant ID
  
  // Bracket info (for single elimination)
  nextMatchId?: string; // Match tiếp theo nếu thắng
  previousMatch1Id?: string; // Match trước (người thắng vào đây)
  previousMatch2Id?: string;
  
  createdAt: Date;
  updatedAt: Date;
}

export interface MatchScore {
  set: number; // 1, 2, 3
  participant1Score: number;
  participant2Score: number;
}

export interface Tournament {
  id: string;
  name: string;
  description?: string;
  format: TournamentFormat;
  categories: TournamentCategory[]; // Các nội dung thi đấu
  
  // Dates
  startDate: Date;
  endDate: Date;
  registrationDeadline: Date;
  
  // Venue
  location: string;
  courtIds: string[]; // Các sân sử dụng
  
  // Participants
  participants: TournamentParticipant[];
  teams: TournamentTeam[]; // Cho các nội dung đôi
  maxParticipants?: number;
  
  // Tournament structure
  groups?: TournamentGroup[]; // Cho round-robin và mixed
  matches: TournamentMatch[];
  
  // Settings
  entryFee?: number;
  rules?: string;
  notes?: string;
  
  // Status
  status: TournamentStatus;
  
  // Metadata
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface BracketNode {
  matchId: string;
  round: string;
  position: number;
  participant1?: TournamentParticipant | TournamentTeam | null;
  participant2?: TournamentParticipant | TournamentTeam | null;
  winner?: string;
  scores?: MatchScore[];
  nextMatchId?: string;
}