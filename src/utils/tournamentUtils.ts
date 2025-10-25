// src/utils/tournamentUtils.ts

import {
  Tournament,
  TournamentParticipant,
  TournamentTeam,
  TournamentMatch,
  TournamentGroup,
  TournamentCategory,
  PotLevel,
  GroupStanding,
  BracketNode,
} from '../types/tournament';

// ===== POT LEVEL HELPERS =====
export const POT_LEVELS: PotLevel[] = ['Pot 1', 'Pot 2', 'Pot 3', 'Pot 4', 'Pot 5'];

export const getPotValue = (pot: PotLevel): number => {
  return POT_LEVELS.indexOf(pot) + 1;
};

export const getAveragePot = (pot1: PotLevel, pot2: PotLevel): PotLevel => {
  const avg = (getPotValue(pot1) + getPotValue(pot2)) / 2;
  const roundedIndex = Math.round(avg) - 1;
  return POT_LEVELS[Math.min(Math.max(roundedIndex, 0), 4)];
};

// ===== SHUFFLE ARRAY =====
export const shuffleArray = <T>(array: T[]): T[] => {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
};

// ===== TẠO TEAM TỰ ĐỘNG CHO ĐÔI =====
export const generateRandomTeams = (
  participants: TournamentParticipant[],
  category: TournamentCategory
): TournamentTeam[] => {
  // Lọc theo giới tính phù hợp với nội dung
  let filtered = participants.filter(p => p.categories.includes(category));
  
  if (category === 'men-doubles') {
    filtered = filtered.filter(p => !p.isWoman);
  } else if (category === 'women-doubles') {
    filtered = filtered.filter(p => p.isWoman);
  }
  // mixed-doubles thì không filter theo giới tính
  
  if (filtered.length < 2) {
    console.warn(`Không đủ người chơi để tạo teams cho ${category}`);
    return [];
  }
  
  // Shuffle để random
  const shuffled = shuffleArray(filtered);
  
  // Ghép cặp
  const teams: TournamentTeam[] = [];
  for (let i = 0; i < shuffled.length - 1; i += 2) {
    teams.push({
      id: `team_${Date.now()}_${i}`,
      player1: shuffled[i],
      player2: shuffled[i + 1],
      potLevel: getAveragePot(shuffled[i].potLevel, shuffled[i + 1].potLevel),
      category,
    });
  }
  
  return teams;
};

// ===== SEEDING CHO LOẠI TRỰC TIẾP =====
export const seedParticipantsForSingleElimination = (
  participants: (TournamentParticipant | TournamentTeam)[]
): (TournamentParticipant | TournamentTeam)[] => {
  if (participants.length === 0) return [];
  
  // Sắp xếp theo pot (Pot 1 mạnh nhất)
  const sorted = [...participants].sort((a, b) => {
    const potA = getPotValue(a.potLevel);
    const potB = getPotValue(b.potLevel);
    return potA - potB; // Pot 1 = 1, Pot 5 = 5
  });
  
  // Tính số lượng bracket cần (phải là lũy thừa của 2)
  const bracketSize = Math.pow(2, Math.ceil(Math.log2(sorted.length)));
  
  // Seeding theo chuẩn: 1 vs 16, 8 vs 9, 4 vs 13, 5 vs 12, 2 vs 15, 7 vs 10, 3 vs 14, 6 vs 11
  const seeded: (TournamentParticipant | TournamentTeam | null)[] = new Array(bracketSize).fill(null);
  
  // Đặt người chơi theo thứ tự seeding chuẩn
  const seedingPattern = generateSeedingPattern(bracketSize);
  for (let i = 0; i < sorted.length; i++) {
    seeded[seedingPattern[i] - 1] = sorted[i];
  }
  
  return seeded.filter(p => p !== null) as (TournamentParticipant | TournamentTeam)[];
};

// Tạo pattern seeding chuẩn (1,16,8,9,4,13,5,12,2,15,7,10,3,14,6,11,...)
const generateSeedingPattern = (size: number): number[] => {
  if (size === 2) return [1, 2];
  
  const half = size / 2;
  const pattern: number[] = [];
  const previousPattern = generateSeedingPattern(half);
  
  for (const seed of previousPattern) {
    pattern.push(seed);
    pattern.push(size + 1 - seed);
  }
  
  return pattern;
};

// ===== CHIA BẢNG CHO VÒNG TRÒN (SNAKE DRAFT) =====
export const distributeToGroups = (
  participants: (TournamentParticipant | TournamentTeam)[],
  numGroups: number = 4
): TournamentGroup[] => {
  if (participants.length === 0) return [];
  
  // Sắp xếp theo pot
  const sorted = [...participants].sort((a, b) => {
    const potA = getPotValue(a.potLevel);
    const potB = getPotValue(b.potLevel);
    return potA - potB;
  });
  
  // Tạo các bảng A, B, C, D
  const groupNames = ['A', 'B', 'C', 'D'];
  const actualNumGroups = Math.min(numGroups, sorted.length);
  const groups: TournamentGroup[] = groupNames.slice(0, actualNumGroups).map(name => ({
    id: `group_${name}`,
    name,
    category: 'men-singles', // Sẽ được set lại từ bên ngoài
    participants: [],
    matches: [],
    standings: [],
  }));
  
  // Snake draft: A→B→C→D, D→C→B→A, A→B→C→D, ...
  let groupIndex = 0;
  let direction = 1; // 1 = forward, -1 = backward
  
  for (const participant of sorted) {
    groups[groupIndex].participants.push(participant);
    
    groupIndex += direction;
    
    // Đảo chiều khi đến cuối
    if (groupIndex >= actualNumGroups) {
      groupIndex = actualNumGroups - 1;
      direction = -1;
    } else if (groupIndex < 0) {
      groupIndex = 0;
      direction = 1;
    }
  }
  
  return groups;
};

// ===== TẠO TRẬN ĐẤU VÒNG TRÒN =====
export const generateRoundRobinMatches = (
  group: TournamentGroup,
  tournamentId: string,
  category: TournamentCategory
): TournamentMatch[] => {
  const participants = group.participants;
  const matches: TournamentMatch[] = [];
  let matchNumber = 1;
  
  // Mỗi người đấu với tất cả những người khác
  for (let i = 0; i < participants.length; i++) {
    for (let j = i + 1; j < participants.length; j++) {
      matches.push({
        id: `match_${tournamentId}_${group.id}_${matchNumber}`,
        tournamentId,
        category,
        round: 'Group',
        matchNumber,
        groupId: group.id,
        participant1: participants[i],
        participant2: participants[j],
        status: 'pending',
        scores: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      matchNumber++;
    }
  }
  
  return matches;
};

// ===== TẠO BRACKET LOẠI TRỰC TIẾP =====
export const generateSingleEliminationBracket = (
  participants: (TournamentParticipant | TournamentTeam)[],
  tournamentId: string,
  category: TournamentCategory
): TournamentMatch[] => {
  if (participants.length === 0) return [];
  
  // Seeding
  const seeded = seedParticipantsForSingleElimination(participants);
  const bracketSize = Math.pow(2, Math.ceil(Math.log2(seeded.length)));
  
  const matches: TournamentMatch[] = [];
  const rounds = Math.log2(bracketSize);
  
  // Tạo tất cả các trận từ vòng 1 đến chung kết
  let matchId = 1;
  const roundNames = ['R1', 'R2', 'R16', 'R8', 'QF', 'SF', 'F'];
  
  for (let round = 0; round < rounds; round++) {
    const matchesInRound = Math.pow(2, rounds - round - 1);
    const roundName = roundNames[Math.min(round, roundNames.length - 1)];
    
    for (let i = 0; i < matchesInRound; i++) {
      const match: TournamentMatch = {
        id: `match_${tournamentId}_${category}_${roundName}_${i + 1}`,
        tournamentId,
        category,
        round: roundName,
        matchNumber: matchId++,
        status: 'pending',
        scores: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      
      // Vòng 1: Gán participant
      if (round === 0) {
        const p1Index = i * 2;
        const p2Index = i * 2 + 1;
        match.participant1 = p1Index < seeded.length ? seeded[p1Index] : null;
        match.participant2 = p2Index < seeded.length ? seeded[p2Index] : null;
      }
      
      // Link đến match tiếp theo
      if (round < rounds - 1) {
        const nextRoundName = roundNames[Math.min(round + 1, roundNames.length - 1)];
        match.nextMatchId = `match_${tournamentId}_${category}_${nextRoundName}_${Math.floor(i / 2) + 1}`;
      }
      
      matches.push(match);
    }
  }
  
  // Link previousMatch cho các vòng sau
  for (const match of matches) {
    if (match.nextMatchId) {
      const nextMatch = matches.find(m => m.id === match.nextMatchId);
      if (nextMatch) {
        if (!nextMatch.previousMatch1Id) {
          nextMatch.previousMatch1Id = match.id;
        } else {
          nextMatch.previousMatch2Id = match.id;
        }
      }
    }
  }
  
  return matches;
};

// ===== TÍNH BẢNG XẾP HẠNG VÒNG TRÒN =====
export const calculateGroupStandings = (
  group: TournamentGroup
): GroupStanding[] => {
  const standings: Record<string, GroupStanding> = {};
  
  // Khởi tạo
  for (const participant of group.participants) {
    standings[participant.id] = {
      participantId: participant.id,
      participantName: 'player1' in participant 
        ? `${participant.player1.name}/${participant.player2.name}`
        : participant.name,
      played: 0,
      won: 0,
      lost: 0,
      points: 0,
      gamesWon: 0,
      gamesLost: 0,
      gameDiff: 0,
      position: 0,
    };
  }
  
  // Tính toán từ các trận đã đấu
  for (const match of group.matches) {
    if (match.status === 'completed' && match.winner) {
      const p1Id = match.participant1?.id;
      const p2Id = match.participant2?.id;
      
      if (!p1Id || !p2Id) continue;
      
      standings[p1Id].played++;
      standings[p2Id].played++;
      
      // Tính games thắng/thua
      let p1Games = 0, p2Games = 0;
      for (const score of match.scores) {
        if (score.participant1Score > score.participant2Score) p1Games++;
        else p2Games++;
      }
      
      standings[p1Id].gamesWon += p1Games;
      standings[p1Id].gamesLost += p2Games;
      standings[p2Id].gamesWon += p2Games;
      standings[p2Id].gamesLost += p1Games;
      
      // Người thắng
      if (match.winner === p1Id) {
        standings[p1Id].won++;
        standings[p1Id].points += 2;
        standings[p2Id].lost++;
      } else {
        standings[p2Id].won++;
        standings[p2Id].points += 2;
        standings[p1Id].lost++;
      }
    }
  }
  
  // Tính hiệu số
  for (const key in standings) {
    standings[key].gameDiff = standings[key].gamesWon - standings[key].gamesLost;
  }
  
  // Sắp xếp: Điểm → Hiệu số → Games thắng
  const sorted = Object.values(standings).sort((a, b) => {
    if (a.points !== b.points) return b.points - a.points;
    if (a.gameDiff !== b.gameDiff) return b.gameDiff - a.gameDiff;
    return b.gamesWon - a.gamesWon;
  });
  
  // Gán vị trí
  sorted.forEach((standing, index) => {
    standing.position = index + 1;
  });
  
  return sorted;
};

// ===== TẠO KNOCKOUT PHASE TỪ TOP TEAMS CỦA GROUPS =====
export const generateKnockoutFromGroups = (
  groups: TournamentGroup[],
  tournamentId: string,
  category: TournamentCategory
): TournamentMatch[] => {
  console.log('=== GENERATING KNOCKOUT FROM GROUPS ===');
  
  // Lấy top 2 từ mỗi bảng
  const qualifiedTeams: (TournamentParticipant | TournamentTeam)[] = [];
  
  for (const group of groups) {
    const standings = calculateGroupStandings(group);
    console.log(`Group ${group.name} standings:`, standings.map(s => `${s.position}. ${s.participantName}`));
    
    // Lấy top 2
    const top2 = standings.slice(0, 2);
    
    for (const standing of top2) {
      const participant = group.participants.find(p => p.id === standing.participantId);
      if (participant) {
        qualifiedTeams.push(participant);
      }
    }
  }
  
  console.log(`Qualified teams: ${qualifiedTeams.length}`, qualifiedTeams.map(t => 
    'player1' in t ? `${t.player1.name}/${t.player2.name}` : t.name
  ));
  
  if (qualifiedTeams.length === 0) {
    console.warn('No qualified teams found');
    return [];
  }
  
  // Tạo bracket knockout với qualified teams
  // Seeding: Winner Group A vs Runner-up Group B, Winner Group B vs Runner-up Group A, etc.
  const seededTeams: (TournamentParticipant | TournamentTeam)[] = [];
  
  // Pattern: W-A, RU-B, W-B, RU-A, W-C, RU-D, W-D, RU-C
  // Ensures winners don't face their group runner-up immediately
  if (groups.length === 4) {
    seededTeams.push(
      qualifiedTeams[0],  // Winner A
      qualifiedTeams[3],  // Runner-up B
      qualifiedTeams[2],  // Winner B
      qualifiedTeams[1],  // Runner-up A
      qualifiedTeams[4],  // Winner C
      qualifiedTeams[7],  // Runner-up D
      qualifiedTeams[6],  // Winner D
      qualifiedTeams[5],  // Runner-up C
    );
  } else {
    // Fallback: just use order
    seededTeams.push(...qualifiedTeams);
  }
  
  console.log('Seeded teams for knockout:', seededTeams.map(t => 
    'player1' in t ? `${t.player1.name}/${t.player2.name}` : t.name
  ));
  
  // Tạo bracket với seeded teams
  return generateSingleEliminationBracket(seededTeams, tournamentId, category);
};

// ===== CATEGORY HELPERS =====
export const getCategoryName = (category: TournamentCategory): string => {
  const names = {
    'men-singles': 'Đơn Nam',
    'women-singles': 'Đơn Nữ',
    'men-doubles': 'Đôi Nam',
    'women-doubles': 'Đôi Nữ',
    'mixed-doubles': 'Đôi Nam-Nữ',
  };
  return names[category];
};

export const isDoublesCategory = (category: TournamentCategory): boolean => {
  return category.includes('doubles');
};

// ===== VALIDATE MATCH SCORE =====
export const validateMatchScore = (scores: { set: number; p1: number; p2: number }[]): boolean => {
  if (scores.length < 2 || scores.length > 3) return false;
  
  let p1Sets = 0, p2Sets = 0;
  
  for (const score of scores) {
    if (score.p1 < 0 || score.p2 < 0 || score.p1 > 30 || score.p2 > 30) return false;
    
    // Kiểm tra set hợp lệ (phải thắng ít nhất 21, chênh 2 điểm, hoặc 30)
    const diff = Math.abs(score.p1 - score.p2);
    const max = Math.max(score.p1, score.p2);
    
    if (max < 21) return false;
    if (max < 30 && diff < 2) return false;
    if (max > 30) return false;
    
    if (score.p1 > score.p2) p1Sets++;
    else p2Sets++;
  }
  
  // Phải có người thắng 2 set
  return Math.max(p1Sets, p2Sets) >= 2;
};

// ===== BUILD BRACKET TREE =====
export const buildBracketTree = (matches: TournamentMatch[]): BracketNode[] => {
  return matches.map(match => ({
    matchId: match.id,
    round: match.round,
    position: match.matchNumber,
    participant1: match.participant1 || null,
    participant2: match.participant2 || null,
    winner: match.winner,
    scores: match.scores,
    nextMatchId: match.nextMatchId,
  }));
};

export const generateBalancedTeams = (
    participants: TournamentParticipant[],
    category: TournamentCategory
  ): TournamentTeam[] => {
    console.log('=== GENERATING BALANCED TEAMS ===');
    console.log('Category:', category);
    console.log('Participants:', participants.length);

    // Lá»c theo giá»›i tÃ­nh phÃ¹ há»£p vá»›i ná»™i dung
    let filtered = participants.filter(p => p.categories.includes(category));
    
    if (category === 'men-doubles') {
      filtered = filtered.filter(p => !p.isWoman);
    } else if (category === 'women-doubles') {
      filtered = filtered.filter(p => p.isWoman);
    }
    // mixed-doubles thÃ¬ khÃ´ng filter theo giá»›i tÃ­nh
    
    if (filtered.length < 2) {
      console.warn(`KhÃ´ng Ä‘á»§ ngÆ°á»i chÆ¡i Ä‘á»ƒ táº¡o teams cho ${category}`);
      return [];
    }

    // Sáº¯p xáº¿p theo pot (Pot 1 = máº¡nh nháº¥t)
    const sorted = [...filtered].sort((a, b) => {
      return getPotValue(a.potLevel) - getPotValue(b.potLevel);
    });

    console.log('Sorted by pot:', sorted.map(p => `${p.name} (${p.potLevel})`));

    // Chia lÃ m 2 ná»­a: ná»­a trÃªn (máº¡nh) vÃ  ná»­a dÆ°á»›i (yáº¿u)
    const mid = Math.floor(sorted.length / 2);
    const strongHalf = sorted.slice(0, mid); // Pot 1, 2, 3...
    const weakHalf = sorted.slice(mid).reverse(); // Pot 5, 4, 3... (Ä‘áº£o ngÆ°á»£c)

    console.log('Strong half:', strongHalf.map(p => `${p.name} (${p.potLevel})`));
    console.log('Weak half:', weakHalf.map(p => `${p.name} (${p.potLevel})`));

    // GhÃ©p cáº·p: Pot 1 + Pot 5, Pot 2 + Pot 4, Pot 3 + Pot 3
    const teams: TournamentTeam[] = [];
    const maxPairs = Math.min(strongHalf.length, weakHalf.length);

    for (let i = 0; i < maxPairs; i++) {
      const player1 = strongHalf[i];
      const player2 = weakHalf[i];
      
      // TÃ­nh pot trung bÃ¬nh
      const avgPot = Math.round((getPotValue(player1.potLevel) + getPotValue(player2.potLevel)) / 2);
      const teamPot = `Pot ${avgPot}` as PotLevel;

      teams.push({
        id: `team_${Date.now()}_${i}`,
        player1,
        player2,
        potLevel: teamPot,
        category,
      });

      console.log(`Team ${i + 1}: ${player1.name} (${player1.potLevel}) + ${player2.name} (${player2.potLevel}) = ${teamPot}`);
    }

    // Náº¿u cÃ²n ngÆ°á»i láº» (sá»‘ lÆ°á»£ng láº»)
    if (sorted.length % 2 !== 0) {
      console.warn(`CÃ²n 1 ngÆ°á»i láº»: ${sorted[sorted.length - 1].name} - khÃ´ng thá»ƒ ghÃ©p cáº·p`);
    }

    console.log(`âœ“ Generated ${teams.length} balanced teams`);
    return teams;
  };