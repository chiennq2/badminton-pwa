// services/tournamentService.ts

import {
  collection,
  doc,
  getDocs,
  getDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  Timestamp,
} from 'firebase/firestore';
import { db } from '../config/firebase';
import {
  Tournament,
  TournamentParticipant,
  TournamentMatch,
  TournamentCategory,
} from '../types/tournament';
import {
  generateRoundRobinMatches,
  generateSingleEliminationBracket,
  createRoundRobinGroups,
  generateTeams,
  updateGroupStandings,
} from '../utils/tournamentUtils';

const COLLECTION_NAME = 'tournaments';

/**
 * Chuyển đổi Firestore data sang Tournament object
 */
const convertFirestoreToTournament = (doc: any): Tournament => {
  const data = doc.data();
  return {
    ...data,
    id: doc.id,
    startDate: data.startDate?.toDate(),
    endDate: data.endDate?.toDate(),
    registrationDeadline: data.registrationDeadline?.toDate(),
    createdAt: data.createdAt?.toDate(),
    updatedAt: data.updatedAt?.toDate(),
    participants: data.participants?.map((p: any) => ({
      ...p,
      registeredAt: p.registeredAt?.toDate(),
    })),
    matches: data.matches?.map((m: any) => ({
      ...m,
      scheduledDate: m.scheduledDate?.toDate(),
      createdAt: m.createdAt?.toDate(),
      updatedAt: m.updatedAt?.toDate(),
    })),
  };
};

/**
 * Lấy tất cả giải đấu
 */
export const getTournaments = async (): Promise<Tournament[]> => {
  const q = query(
    collection(db, COLLECTION_NAME),
    orderBy('createdAt', 'desc')
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map(convertFirestoreToTournament);
};

/**
 * Lấy giải đấu theo ID
 */
export const getTournamentById = async (id: string): Promise<Tournament | null> => {
  const docRef = doc(db, COLLECTION_NAME, id);
  const docSnap = await getDoc(docRef);
  
  if (docSnap.exists()) {
    return convertFirestoreToTournament(docSnap);
  }
  return null;
};

/**
 * Tạo giải đấu mới
 */
export const createTournament = async (
  tournament: Omit<Tournament, 'id' | 'createdAt' | 'updatedAt'>
): Promise<string> => {
  const tournamentData = {
    ...tournament,
    startDate: Timestamp.fromDate(tournament.startDate),
    endDate: Timestamp.fromDate(tournament.endDate),
    registrationDeadline: Timestamp.fromDate(tournament.registrationDeadline),
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  };
  
  const docRef = await addDoc(collection(db, COLLECTION_NAME), tournamentData);
  return docRef.id;
};

/**
 * Cập nhật giải đấu
 */
export const updateTournament = async (
  id: string,
  updates: Partial<Tournament>
): Promise<void> => {
  const docRef = doc(db, COLLECTION_NAME, id);
  const updateData: any = {
    ...updates,
    updatedAt: Timestamp.now(),
  };
  
  // Convert dates
  if (updates.startDate) {
    updateData.startDate = Timestamp.fromDate(updates.startDate);
  }
  if (updates.endDate) {
    updateData.endDate = Timestamp.fromDate(updates.endDate);
  }
  if (updates.registrationDeadline) {
    updateData.registrationDeadline = Timestamp.fromDate(updates.registrationDeadline);
  }
  
  await updateDoc(docRef, updateData);
};

/**
 * Xóa giải đấu
 */
export const deleteTournament = async (id: string): Promise<void> => {
  await deleteDoc(doc(db, COLLECTION_NAME, id));
};

/**
 * Đăng ký tham gia giải đấu
 */
export const registerParticipant = async (
  tournamentId: string,
  participant: TournamentParticipant
): Promise<void> => {
  const tournament = await getTournamentById(tournamentId);
  if (!tournament) throw new Error('Tournament not found');
  
  const participants = [...tournament.participants, participant];
  await updateTournament(tournamentId, { participants });
};

/**
 * Hủy đăng ký
 */
export const unregisterParticipant = async (
  tournamentId: string,
  participantId: string
): Promise<void> => {
  const tournament = await getTournamentById(tournamentId);
  if (!tournament) throw new Error('Tournament not found');
  
  const participants = tournament.participants.filter((p) => p.id !== participantId);
  await updateTournament(tournamentId, { participants });
};

/**
 * Tạo lịch thi đấu tự động
 */
export const generateTournamentSchedule = async (
  tournamentId: string,
  category: TournamentCategory
): Promise<void> => {
  const tournament = await getTournamentById(tournamentId);
  if (!tournament) throw new Error('Tournament not found');
  
  const categoryParticipants = tournament.participants.filter((p) =>
    p.categories.includes(category)
  );
  
  if (categoryParticipants.length < 2) {
    throw new Error('Not enough participants for this category');
  }
  
  let newMatches: TournamentMatch[] = [];
  
  // Nội dung đôi: tạo teams trước
  if (category.includes('doubles')) {
    const teams = generateTeams(categoryParticipants, category);
    await updateTournament(tournamentId, {
      teams: [...tournament.teams, ...teams],
    });
  }
  
  if (tournament.format === 'round_robin') {
    // Tạo bảng đấu
    const groups = createRoundRobinGroups(categoryParticipants, category, 4);
    
    // Tạo lịch thi đấu cho từng bảng
    const participantsMap = new Map(
      categoryParticipants.map((p) => [p.id, p])
    );
    
    let matchNumber = tournament.matches.length + 1;
    groups.forEach((group) => {
      const groupMatches = generateRoundRobinMatches(
        tournamentId,
        group,
        participantsMap,
        matchNumber
      );
      newMatches = [...newMatches, ...groupMatches];
      matchNumber += groupMatches.length;
    });
    
    await updateTournament(tournamentId, {
      matches: [...tournament.matches, ...newMatches],
      groups: [...(tournament.groups || []), ...groups],
    });
  } else if (tournament.format === 'single_elimination') {
    newMatches = generateSingleEliminationBracket(
      tournamentId,
      category,
      categoryParticipants
    );
    
    await updateTournament(tournamentId, {
      matches: [...tournament.matches, ...newMatches],
    });
  }
};

/**
 * Cập nhật kết quả trận đấu
 */
export const updateMatchResult = async (
  tournamentId: string,
  matchId: string,
  result: {
    player1Score: number[];
    player2Score: number[];
    winnerId: string;
  }
): Promise<void> => {
  const tournament = await getTournamentById(tournamentId);
  if (!tournament) throw new Error('Tournament not found');
  
  const matchIndex = tournament.matches.findIndex((m) => m.id === matchId);
  if (matchIndex === -1) throw new Error('Match not found');
  
  const updatedMatch: TournamentMatch = {
    ...tournament.matches[matchIndex],
    ...result,
    status: 'completed',
    updatedAt: new Date(),
  };
  
  const matches = [...tournament.matches];
  matches[matchIndex] = updatedMatch;
  
  // Cập nhật standings nếu là round robin
  let updatedGroups = tournament.groups;
  if (tournament.format === 'round_robin' && tournament.groups) {
    const groupIndex = tournament.groups.findIndex((g) =>
      updatedMatch.round.includes(g.name)
    );
    
    if (groupIndex !== -1) {
      const updatedGroup = updateGroupStandings(
        tournament.groups[groupIndex],
        updatedMatch
      );
      updatedGroups = [...tournament.groups];
      updatedGroups[groupIndex] = updatedGroup;
    }
  }
  
  // Nếu là single elimination, cập nhật vòng sau
  if (tournament.format === 'single_elimination') {
    const nextRoundMatch = matches.find(
      (m) =>
        m.round > updatedMatch.round &&
        !m.player1Id &&
        !m.player2Id
    );
    
    if (nextRoundMatch) {
      if (!nextRoundMatch.player1Id) {
        nextRoundMatch.player1Id = result.winnerId;
        nextRoundMatch.player1Name =
          result.winnerId === updatedMatch.player1Id
            ? updatedMatch.player1Name
            : updatedMatch.player2Name;
      } else if (!nextRoundMatch.player2Id) {
        nextRoundMatch.player2Id = result.winnerId;
        nextRoundMatch.player2Name =
          result.winnerId === updatedMatch.player1Id
            ? updatedMatch.player1Name
            : updatedMatch.player2Name;
      }
    }
  }
  
  await updateTournament(tournamentId, {
    matches,
    groups: updatedGroups,
  });
};

/**
 * Gán sân và thời gian cho trận đấu
 */
export const scheduleMatch = async (
  tournamentId: string,
  matchId: string,
  schedule: {
    courtId: string;
    scheduledDate: Date;
    scheduledTime: string;
  }
): Promise<void> => {
  const tournament = await getTournamentById(tournamentId);
  if (!tournament) throw new Error('Tournament not found');
  
  const matchIndex = tournament.matches.findIndex((m) => m.id === matchId);
  if (matchIndex === -1) throw new Error('Match not found');
  
  const matches = [...tournament.matches];
  matches[matchIndex] = {
    ...matches[matchIndex],
    ...schedule,
    updatedAt: new Date(),
  };
  
  await updateTournament(tournamentId, { matches });
};