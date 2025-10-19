// utils/tournamentUtils.ts

import {
  TournamentParticipant,
  TournamentTeam,
  TournamentMatch,
  TournamentGroup,
  TournamentCategory,
  PotLevel,
  BracketNode,
} from '../types/tournament';

/**
 * Shuffle array ngẫu nhiên
 */
export const shuffleArray = <T,>(array: T[]): T[] => {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
};

/**
 * Chia participants vào các Pot theo trình độ
 */
export const divideIntoPots = (
  participants: TournamentParticipant[]
): Map<PotLevel, TournamentParticipant[]> => {
  const pots = new Map<PotLevel, TournamentParticipant[]>();
  
  [1, 2, 3, 4, 5].forEach((level) => {
    pots.set(level as PotLevel, []);
  });
  
  participants.forEach((p) => {
    const pot = pots.get(p.potLevel);
    if (pot) {
      pot.push(p);
    }
  });
  
  return pots;
};

/**
 * Seeding - Xếp hạt giống cân bằng cho vòng loại trực tiếp
 * Đảm bảo người chơi mạnh không gặp nhau từ sớm
 */
export const seedParticipants = (
  participants: TournamentParticipant[]
): TournamentParticipant[] => {
  // Sắp xếp theo pot (trình độ cao -> thấp)
  const sorted = [...participants].sort((a, b) => a.potLevel - b.potLevel);
  
  // Lấy số lượng gần nhất là lũy thừa 2
  const nextPowerOf2 = Math.pow(2, Math.ceil(Math.log2(sorted.length)));
  
  // Tạo bracket seeding chuẩn (1 vs 16, 8 vs 9, 4 vs 13, ...)
  const seeded: TournamentParticipant[] = [];
  const mid = Math.floor(nextPowerOf2 / 2);
  
  for (let i = 0; i < mid; i++) {
    if (sorted[i]) seeded.push(sorted[i]);
    if (sorted[sorted.length - 1 - i]) seeded.push(sorted[sorted.length - 1 - i]);
  }
  
  return seeded.filter(Boolean);
};

/**
 * Tạo bảng đấu Round Robin
 */
export const createRoundRobinGroups = (
  participants: TournamentParticipant[],
  category: TournamentCategory,
  numberOfGroups: number = 4
): TournamentGroup[] => {
  const pots = divideIntoPots(participants);
  const groups: TournamentGroup[] = [];
  
  // Tạo các bảng trống
  for (let i = 0; i < numberOfGroups; i++) {
    groups.push({
      id: `group_${category}_${String.fromCharCode(65 + i)}`,
      name: `Bảng ${String.fromCharCode(65 + i)}`,
      category,
      participants: [],
      standings: [],
    });
  }
  
  // Phân bổ từng pot vào các bảng (snake draft)
  let groupIndex = 0;
  let direction = 1; // 1: forward, -1: backward
  
  [1, 2, 3, 4, 5].forEach((potLevel) => {
    const pot = pots.get(potLevel as PotLevel) || [];
    const shuffled = shuffleArray(pot);
    
    shuffled.forEach((participant) => {
      groups[groupIndex].participants.push(participant.id);
      
      groupIndex += direction;
      
      if (groupIndex >= numberOfGroups || groupIndex < 0) {
        direction *= -1;
        groupIndex += direction;
      }
    });
  });
  
  // Khởi tạo standings
  groups.forEach((group) => {
    group.standings = group.participants.map((pId) => ({
      participantId: pId,
      played: 0,
      won: 0,
      lost: 0,
      gamesWon: 0,
      gamesLost: 0,
      points: 0,
    }));
  });
  
  return groups;
};

/**
 * Tạo lịch thi đấu Round Robin cho một bảng
 */
export const generateRoundRobinMatches = (
  tournamentId: string,
  group: TournamentGroup,
  participantsMap: Map<string, TournamentParticipant>,
  startMatchNumber: number = 1
): TournamentMatch[] => {
  const matches: TournamentMatch[] = [];
  const participants = group.participants;
  let matchNum = startMatchNumber;
  
  for (let i = 0; i < participants.length; i++) {
    for (let j = i + 1; j < participants.length; j++) {
      const p1 = participantsMap.get(participants[i]);
      const p2 = participantsMap.get(participants[j]);
      
      if (p1 && p2) {
        matches.push({
          id: `match_${tournamentId}_${group.id}_${matchNum}`,
          tournamentId,
          category: group.category,
          round: `${group.name} - Trận ${matchNum}`,
          matchNumber: matchNum,
          player1Id: p1.id,
          player1Name: p1.memberName,
          player2Id: p2.id,
          player2Name: p2.memberName,
          status: 'scheduled',
          createdAt: new Date(),
          updatedAt: new Date(),
        });
        matchNum++;
      }
    }
  }
  
  return matches;
};

/**
 * Tạo bracket Single Elimination
 */
export const generateSingleEliminationBracket = (
  tournamentId: string,
  category: TournamentCategory,
  participants: TournamentParticipant[]
): TournamentMatch[] => {
  const seeded = seedParticipants(participants);
  const matches: TournamentMatch[] = [];
  
  // Số vòng = log2(số người)
  const numRounds = Math.ceil(Math.log2(seeded.length));
  let matchNum = 1;
  
  // Round 1
  const roundNames = ['R1', 'R2', 'QF', 'SF', 'F'];
  let currentRoundMatches: string[] = [];
  
  for (let i = 0; i < seeded.length; i += 2) {
    const p1 = seeded[i];
    const p2 = seeded[i + 1];
    
    const matchId = `match_${tournamentId}_${category}_${matchNum}`;
    currentRoundMatches.push(matchId);
    
    matches.push({
      id: matchId,
      tournamentId,
      category,
      round: roundNames[0] || 'R1',
      matchNumber: matchNum,
      player1Id: p1?.id,
      player1Name: p1?.memberName,
      player2Id: p2?.id,
      player2Name: p2?.memberName,
      status: 'scheduled',
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    
    matchNum++;
  }
  
  // Các vòng tiếp theo (tạo placeholder)
  for (let round = 1; round < numRounds; round++) {
    const nextRoundMatches: string[] = [];
    const numMatchesInRound = Math.ceil(currentRoundMatches.length / 2);
    
    for (let i = 0; i < numMatchesInRound; i++) {
      const matchId = `match_${tournamentId}_${category}_${matchNum}`;
      nextRoundMatches.push(matchId);
      
      matches.push({
        id: matchId,
        tournamentId,
        category,
        round: roundNames[round] || `R${round + 1}`,
        matchNumber: matchNum,
        status: 'scheduled',
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      
      matchNum++;
    }
    
    currentRoundMatches = nextRoundMatches;
  }
  
  return matches;
};

/**
 * Tạo teams cho nội dung đôi
 */
export const generateTeams = (
  participants: TournamentParticipant[],
  category: TournamentCategory
): TournamentTeam[] => {
  const teams: TournamentTeam[] = [];
  
  // Shuffle để tạo cặp ngẫu nhiên
  const shuffled = shuffleArray(participants);
  
  for (let i = 0; i < shuffled.length - 1; i += 2) {
    const p1 = shuffled[i];
    const p2 = shuffled[i + 1];
    
    if (p1 && p2) {
      teams.push({
        id: `team_${category}_${i / 2 + 1}`,
        player1Id: p1.id,
        player1Name: p1.memberName,
        player2Id: p2.id,
        player2Name: p2.memberName,
        potLevel: Math.round((p1.potLevel + p2.potLevel) / 2) as PotLevel,
        category,
      });
    }
  }
  
  return teams;
};

/**
 * Tạo bracket visualization data
 */
export const createBracketNodes = (matches: TournamentMatch[]): BracketNode[] => {
  return matches.map((match) => ({
    id: match.id,
    round: match.round,
    matchNumber: match.matchNumber,
    participant1: match.player1Id
      ? {
          id: match.player1Id,
          name: match.player1Name || '',
        }
      : undefined,
    participant2: match.player2Id
      ? {
          id: match.player2Id,
          name: match.player2Name || '',
        }
      : undefined,
    winner: match.winnerId
      ? {
          id: match.winnerId,
          name: match.winnerId === match.player1Id ? match.player1Name || '' : match.player2Name || '',
        }
      : undefined,
    status: match.status,
  }));
};

/**
 * Cập nhật standings sau khi có kết quả trận đấu
 */
export const updateGroupStandings = (
  group: TournamentGroup,
  match: TournamentMatch
): TournamentGroup => {
  if (!match.winnerId || !match.player1Score || !match.player2Score) {
    return group;
  }
  
  const standings = [...group.standings];
  const p1Standing = standings.find((s) => s.participantId === match.player1Id);
  const p2Standing = standings.find((s) => s.participantId === match.player2Id);
  
  if (p1Standing && p2Standing) {
    p1Standing.played++;
    p2Standing.played++;
    
    const p1Games = match.player1Score.reduce((a, b) => a + b, 0);
    const p2Games = match.player2Score.reduce((a, b) => a + b, 0);
    
    p1Standing.gamesWon += p1Games;
    p1Standing.gamesLost += p2Games;
    p2Standing.gamesWon += p2Games;
    p2Standing.gamesLost += p1Games;
    
    if (match.winnerId === match.player1Id) {
      p1Standing.won++;
      p2Standing.lost++;
      p1Standing.points += 2;
    } else {
      p2Standing.won++;
      p1Standing.lost++;
      p2Standing.points += 2;
    }
    
    // Sắp xếp lại standings
    standings.sort((a, b) => {
      if (b.points !== a.points) return b.points - a.points;
      const aDiff = a.gamesWon - a.gamesLost;
      const bDiff = b.gamesWon - b.gamesLost;
      if (bDiff !== aDiff) return bDiff - aDiff;
      return b.gamesWon - a.gamesWon;
    });
  }
  
  return {
    ...group,
    standings,
  };
};

/**
 * Tính số trận đấu cho round robin
 */
export const calculateRoundRobinMatches = (numParticipants: number): number => {
  return (numParticipants * (numParticipants - 1)) / 2;
};

/**
 * Tính số trận đấu cho single elimination
 */
export const calculateSingleEliminationMatches = (numParticipants: number): number => {
  return numParticipants - 1;
};