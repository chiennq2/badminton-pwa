// types/tournament.ts

export type TournamentFormat = 'single_elimination' | 'round_robin' | 'mixed';
export type TournamentCategory = 'men_singles' | 'women_singles' | 'men_doubles' | 'women_doubles' | 'mixed_doubles';
export type TournamentStatus = 'draft' | 'registration' | 'ongoing' | 'completed' | 'cancelled';
export type MatchStatus = 'scheduled' | 'ongoing' | 'completed' | 'cancelled';
export type PotLevel = 1 | 2 | 3 | 4 | 5;

export interface TournamentParticipant {
  id: string;
  memberId: string;
  memberName: string;
  potLevel: PotLevel; // Trình độ: 1 (cao nhất) -> 5 (thấp nhất)
  email?: string;
  phone?: string;
  registeredAt: Date;
  categories: TournamentCategory[]; // Các nội dung đăng ký
}

export interface TournamentTeam {
  id: string;
  player1Id: string;
  player1Name: string;
  player2Id: string;
  player2Name: string;
  potLevel: PotLevel; // Trung bình pot của 2 người
  category: TournamentCategory;
}

export interface TournamentMatch {
  id: string;
  tournamentId: string;
  category: TournamentCategory;
  round: string; // 'R1', 'R2', 'QF', 'SF', 'F' hoặc 'Group A Match 1'
  matchNumber: number;
  courtId?: string;
  scheduledDate?: Date;
  scheduledTime?: string;
  
  // Đơn
  player1Id?: string;
  player1Name?: string;
  player1Score?: number[];
  
  player2Id?: string;
  player2Name?: string;
  player2Score?: number[];
  
  // Đôi
  team1Id?: string;
  team1Player1Name?: string;
  team1Player2Name?: string;
  team1Score?: number[];
  
  team2Id?: string;
  team2Player1Name?: string;
  team2Player2Name?: string;
  team2Score?: number[];
  
  winnerId?: string;
  status: MatchStatus;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface TournamentGroup {
  id: string;
  name: string; // 'Group A', 'Group B'
  category: TournamentCategory;
  participants: string[]; // IDs của participants hoặc teams
  standings: {
    participantId: string;
    played: number;
    won: number;
    lost: number;
    gamesWon: number;
    gamesLost: number;
    points: number; // 2 điểm thắng, 1 điểm hòa, 0 điểm thua
  }[];
}

export interface Tournament {
  id: string;
  name: string;
  description?: string;
  format: TournamentFormat;
  categories: TournamentCategory[];
  startDate: Date;
  endDate: Date;
  registrationDeadline: Date;
  venue: string;
  courtIds: string[];
  
  // Participants
  participants: TournamentParticipant[];
  teams: TournamentTeam[]; // Cho các nội dung đôi
  
  // Matches & Groups
  matches: TournamentMatch[];
  groups?: TournamentGroup[]; // Chỉ dùng cho round-robin
  
  // Settings
  maxParticipantsPerCategory?: number;
  registrationFee?: number;
  prizeMoney?: {
    category: TournamentCategory;
    first: number;
    second: number;
    third: number;
  }[];
  
  status: TournamentStatus;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface TournamentSchedule {
  date: Date;
  courts: {
    courtId: string;
    courtName: string;
    matches: TournamentMatch[];
  }[];
}

export interface BracketNode {
  id: string;
  round: string;
  matchNumber: number;
  participant1?: {
    id: string;
    name: string;
    seed?: number;
  };
  participant2?: {
    id: string;
    name: string;
    seed?: number;
  };
  winner?: {
    id: string;
    name: string;
  };
  nextMatchId?: string;
  status: MatchStatus;
}