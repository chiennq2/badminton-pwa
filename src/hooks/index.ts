import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  collection,
  getDocs,
  doc,
  getDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
  Timestamp
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { Court, Member, Group, Session, User } from '../types';
import { convertFirestoreTimestamp } from '../utils';
import { dateToString, stringToDate } from '../utils/dateUtils';

// Utility function to convert Firestore timestamps
const convertTimestamp = (data: any) => {
  const converted = { ...data };
  Object.keys(converted).forEach(key => {
    if (converted[key] instanceof Timestamp) {
      converted[key] = converted[key].toDate();
    }
  });
  return converted;
};

const convertSessionDates = (data: any) => {
  return {
    ...data,
    date: stringToDate(data.date), // Convert string -> Date
    createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : new Date(),
    updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate() : new Date(),
  };
};

// Courts hooks
export const useCourts = () => {
  return useQuery({
    queryKey: ['courts'],
    queryFn: async () => {
      const snapshot = await getDocs(collection(db, 'courts'));
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...convertTimestamp(doc.data())
      })) as Court[];
    },
  });
};

export const useCourt = (id: string) => {
  return useQuery({
    queryKey: ['court', id],
    queryFn: async () => {
      const docRef = doc(db, 'courts', id);
      const snapshot = await getDoc(docRef);
      if (!snapshot.exists()) throw new Error('Court not found');
      return {
        id: snapshot.id,
        ...convertTimestamp(snapshot.data())
      } as Court;
    },
    enabled: !!id,
  });
};

export const useCreateCourt = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (courtData: Omit<Court, 'id' | 'createdAt' | 'updatedAt'>) => {
      const docRef = await addDoc(collection(db, 'courts'), {
        ...courtData,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      return docRef.id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['courts'] });
    },
  });
};

export const useUpdateCourt = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Court> }) => {
      const docRef = doc(db, 'courts', id);
      await updateDoc(docRef, {
        ...data,
        updatedAt: serverTimestamp(),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['courts'] });
    },
  });
};

export const useDeleteCourt = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      await deleteDoc(doc(db, 'courts', id));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['courts'] });
    },
  });
};

// Members hooks
export const useMembers = () => {
  return useQuery({
    queryKey: ['members'],
    queryFn: async () => {
      const snapshot = await getDocs(
        query(collection(db, 'members'), orderBy('name'))
      );
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...convertTimestamp(doc.data())
      })) as Member[];
    },
  });
};

export const useCreateMember = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (memberData: Omit<Member, 'id' | 'createdAt' | 'updatedAt'>) => {
      const docRef = await addDoc(collection(db, 'members'), {
        ...memberData,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      return docRef.id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['members'] });
    },
  });
};

export const useUpdateMember = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Member> }) => {
      const docRef = doc(db, 'members', id);
      await updateDoc(docRef, {
        ...data,
        updatedAt: serverTimestamp(),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['members'] });
    },
  });
};

export const useDeleteMember = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      await deleteDoc(doc(db, 'members', id));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['members'] });
    },
  });
};

// Groups hooks
export const useGroups = () => {
  return useQuery({
    queryKey: ['groups'],
    queryFn: async () => {
      const snapshot = await getDocs(collection(db, 'groups'));
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...convertTimestamp(doc.data())
      })) as Group[];
    },
  });
};

export const useCreateGroup = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (groupData: Omit<Group, 'id' | 'createdAt' | 'updatedAt'>) => {
      const docRef = await addDoc(collection(db, 'groups'), {
        ...groupData,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      return docRef.id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['groups'] });
    },
  });
};

export const useUpdateGroup = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Group> }) => {
      const docRef = doc(db, 'groups', id);
      await updateDoc(docRef, {
        ...data,
        updatedAt: serverTimestamp(),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['groups'] });
    },
  });
};

export const useDeleteGroup = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      await deleteDoc(doc(db, 'groups', id));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['groups'] });
    },
  });
};

// Sessions hooks
// ✅ QUAN TRỌNG: Convert date ngay khi fetch từ Firestore
export const useSessions = () => {
  return useQuery({
    queryKey: ['sessions'],
    queryFn: async () => {
      const snapshot = await getDocs(collection(db, 'sessions'));
      
      return snapshot.docs.map(doc => {
        const data = doc.data();
        const converted = convertSessionDates(data);
        
        return {
          id: doc.id,
          ...converted,
        } as Session;
      });
    },
  });
};

// useSession: Đọc từ Firebase
export const useSession = (id: string) => {
  return useQuery({
    queryKey: ['session', id],
    queryFn: async () => {
      const docRef = doc(db, 'sessions', id);
      const docSnap = await getDoc(docRef);
      
      if (!docSnap.exists()) {
        throw new Error('Session not found');
      }
      
      const data = docSnap.data();
      const converted = convertSessionDates(data);
      
      return {
        id: docSnap.id,
        ...converted,
      } as Session;
    },
    enabled: !!id,
  });
};

// useCreateSession: Lưu vào Firebase
export const useCreateSession = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (sessionData: Omit<Session, 'id' | 'createdAt' | 'updatedAt'>) => {
      const docRef = await addDoc(collection(db, 'sessions'), {
        ...sessionData,
        date: dateToString(sessionData.date), // Convert Date -> string
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      return docRef.id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sessions'] });
    },
  });
};

// useUpdateSession: Lưu vào Firebase
export const useUpdateSession = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Session> }) => {
      const docRef = doc(db, 'sessions', id);
      
      // Prepare data
      const updateData: any = { ...data };
      
      // Convert date nếu có
      if (data.date) {
        updateData.date = dateToString(data.date);
      }
      
      updateData.updatedAt = serverTimestamp();
      
      await updateDoc(docRef, updateData);
      return id;
    },
    onSuccess: (sessionId) => {
      queryClient.invalidateQueries({ queryKey: ['session', sessionId] });
      queryClient.invalidateQueries({ queryKey: ['sessions'] });
    },
  });
};

export const useDeleteSession = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      await deleteDoc(doc(db, 'sessions', id));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sessions'] });
    },
  });
};

// Users/Admins hooks
export const useUsers = () => {
  return useQuery({
    queryKey: ['users'],
    queryFn: async () => {
      const snapshot = await getDocs(collection(db, 'users'));
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...convertTimestamp(doc.data())
      })) as User[];
    },
  });
};

export const useUpdateUser = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<User> }) => {
      const docRef = doc(db, 'users', id);
      await updateDoc(docRef, {
        ...data,
        updatedAt: serverTimestamp(),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });
};