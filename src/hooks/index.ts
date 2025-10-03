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
import { db, auth } from '../config/firebase';
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
    date: stringToDate(data.date),
    createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : new Date(),
    updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate() : new Date(),
  };
};

// Courts hooks
export const useCourts = () => {
  return useQuery({
    // ✅ Thêm userId để mỗi user có cache riêng
    queryKey: ['courts', auth.currentUser?.uid],
    queryFn: async () => {
      const snapshot = await getDocs(collection(db, 'courts'));
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...convertTimestamp(doc.data())
      })) as Court[];
    },
    enabled: !!auth.currentUser,
    staleTime: 5 * 60 * 1000, // 5 minutes
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
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['court', variables.id] });
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
    // ✅ Thêm userId để mỗi user có cache riêng
    queryKey: ['members', auth.currentUser?.uid],
    queryFn: async () => {
      const snapshot = await getDocs(collection(db, 'members'));
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...convertTimestamp(doc.data())
      })) as Member[];
    },
    enabled: !!auth.currentUser,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

export const useMember = (id: string) => {
  return useQuery({
    queryKey: ['member', id],
    queryFn: async () => {
      const docRef = doc(db, 'members', id);
      const snapshot = await getDoc(docRef);
      if (!snapshot.exists()) throw new Error('Member not found');
      return {
        id: snapshot.id,
        ...convertTimestamp(snapshot.data())
      } as Member;
    },
    enabled: !!id,
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
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['member', variables.id] });
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
    // ✅ Thêm userId để mỗi user có cache riêng
    queryKey: ['groups', auth.currentUser?.uid],
    queryFn: async () => {
      const snapshot = await getDocs(collection(db, 'groups'));
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...convertTimestamp(doc.data())
      })) as Group[];
    },
    enabled: !!auth.currentUser,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

export const useGroup = (id: string) => {
  return useQuery({
    queryKey: ['group', id],
    queryFn: async () => {
      const docRef = doc(db, 'groups', id);
      const snapshot = await getDoc(docRef);
      if (!snapshot.exists()) throw new Error('Group not found');
      return {
        id: snapshot.id,
        ...convertTimestamp(snapshot.data())
      } as Group;
    },
    enabled: !!id,
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
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['group', variables.id] });
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

// Sessions hooks - CÓ PHÂN QUYỀN
export const useSessions = () => {
  return useQuery({
    // ✅ QUAN TRỌNG: Thêm userId vào queryKey để mỗi user có cache riêng
    queryKey: ['sessions', auth.currentUser?.uid],
    queryFn: async () => {
      const currentUser = auth.currentUser;
      if (!currentUser) {
        console.log('No current user in useSessions');
        return [];
      }

      console.log('Current user UID:', currentUser.uid);

      // Lấy thông tin user từ Firestore để kiểm tra role
      const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
      const userData = userDoc.data() as User;

      console.log('User role:', userData?.role);

      // Nếu là admin - lấy tất cả sessions
      if (userData?.role === 'admin') {
        console.log('Admin user - fetching all sessions');
        const sessionsQuery = query(collection(db, 'sessions'), orderBy('date', 'desc'));
        const snapshot = await getDocs(sessionsQuery);
        console.log('Admin: Found', snapshot.docs.length, 'sessions');
        return snapshot.docs.map(doc => ({
          id: doc.id,
          ...convertSessionDates(doc.data())
        })) as Session[];
      } else {
        // Nếu là user - lấy tất cả sessions và filter phía client
        console.log('Regular user - fetching and filtering sessions');
        const sessionsQuery = query(collection(db, 'sessions'), orderBy('date', 'desc'));
        const snapshot = await getDocs(sessionsQuery);
        
        console.log('User: Total sessions in DB:', snapshot.docs.length);
        
        // Filter phía client để xử lý cả sessions cũ không có createdBy
        const allSessions = snapshot.docs.map(doc => ({
          id: doc.id,
          ...convertSessionDates(doc.data())
        })) as Session[];

        const userSessions = allSessions.filter(session => {
          // Nếu session không có createdBy, không hiển thị cho user (chỉ admin mới thấy)
          if (!session.createdBy) {
            console.log('Session', session.id, 'has no createdBy');
            return false;
          }
          return session.createdBy === currentUser.uid;
        });

        console.log('User: Filtered to', userSessions.length, 'sessions created by user');
        return userSessions;
      }
    },
    // ✅ Chỉ fetch khi có currentUser
    enabled: !!auth.currentUser,
    // ✅ Không dùng stale cache khi switch user
    staleTime: 0,
  });
};

export const useSession = (id: string) => {
  return useQuery({
    // ✅ Thêm userId vào queryKey
    queryKey: ['session', id, auth.currentUser?.uid],
    queryFn: async () => {
      const currentUser = auth.currentUser;
      if (!currentUser) throw new Error('Unauthorized');

      const docRef = doc(db, 'sessions', id);
      const snapshot = await getDoc(docRef);
      
      if (!snapshot.exists()) throw new Error('Session not found');

      const sessionData = {
        id: snapshot.id,
        ...convertSessionDates(snapshot.data())
      } as Session;

      // Lấy thông tin user để kiểm tra quyền
      const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
      const userData = userDoc.data() as User;

      // Nếu là user và không phải người tạo session => không cho xem
      if (userData?.role !== 'admin' && sessionData.createdBy !== currentUser.uid) {
        throw new Error('Bạn không có quyền xem lịch đánh này');
      }

      return sessionData;
    },
    enabled: !!id && !!auth.currentUser,
    staleTime: 0,
  });
};

export const useCreateSession = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (sessionData: Omit<Session, 'id' | 'createdAt' | 'updatedAt'>) => {
      const currentUser = auth.currentUser;
      if (!currentUser) throw new Error('Unauthorized');

      const docRef = await addDoc(collection(db, 'sessions'), {
        ...sessionData,
        date: dateToString(sessionData.date),
        createdBy: currentUser.uid, // Lưu ID người tạo
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

export const useUpdateSession = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Session> }) => {
      const currentUser = auth.currentUser;
      if (!currentUser) throw new Error('Unauthorized');

      // Kiểm tra quyền trước khi update
      const docRef = doc(db, 'sessions', id);
      const snapshot = await getDoc(docRef);
      
      if (!snapshot.exists()) throw new Error('Session not found');

      const sessionData = snapshot.data() as Session;
      const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
      const userData = userDoc.data() as User;

      // Nếu là user và không phải người tạo => không cho sửa
      if (userData?.role !== 'admin' && sessionData.createdBy !== currentUser.uid) {
        throw new Error('Bạn không có quyền chỉnh sửa lịch đánh này');
      }

      // Prepare data
      const updateData: any = { ...data };
      
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
      const currentUser = auth.currentUser;
      if (!currentUser) throw new Error('Unauthorized');

      // Kiểm tra quyền trước khi xóa
      const docRef = doc(db, 'sessions', id);
      const snapshot = await getDoc(docRef);
      
      if (!snapshot.exists()) throw new Error('Session not found');

      const sessionData = snapshot.data() as Session;
      const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
      const userData = userDoc.data() as User;

      // Nếu là user và không phải người tạo => không cho xóa
      if (userData?.role !== 'admin' && sessionData.createdBy !== currentUser.uid) {
        throw new Error('Bạn không có quyền xóa lịch đánh này');
      }

      await deleteDoc(docRef);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sessions'] });
    },
  });
};

// Users/Admins hooks - CHỈ ADMIN MỚI DÙNG ĐƯỢC
export const useUsers = () => {
  return useQuery({
    // ✅ Thêm userId để mỗi admin có cache riêng
    queryKey: ['users', auth.currentUser?.uid],
    queryFn: async () => {
      const currentUser = auth.currentUser;
      if (!currentUser) throw new Error('Unauthorized');

      const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
      const userData = userDoc.data() as User;

      // Chỉ admin mới có quyền xem danh sách users
      if (userData?.role !== 'admin') {
        throw new Error('Bạn không có quyền truy cập chức năng này');
      }

      const snapshot = await getDocs(collection(db, 'users'));
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...convertTimestamp(doc.data())
      })) as User[];
    },
    enabled: !!auth.currentUser,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

export const useUpdateUser = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<User> }) => {
      const currentUser = auth.currentUser;
      if (!currentUser) throw new Error('Unauthorized');

      const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
      const userData = userDoc.data() as User;

      // Chỉ admin mới có quyền update users
      if (userData?.role !== 'admin') {
        throw new Error('Bạn không có quyền thực hiện thao tác này');
      }

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