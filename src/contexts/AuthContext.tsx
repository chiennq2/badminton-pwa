import React, { createContext, useContext, useEffect, useState } from 'react';
import { 
  User as FirebaseUser, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  updateProfile
} from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { useQueryClient } from '@tanstack/react-query';
import { auth, db } from '../config/firebase';
import { User } from '../types';

interface AuthContextType {
  currentUser: User | null;
  firebaseUser: FirebaseUser | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, displayName: string) => Promise<void>;
  signOut: () => Promise<void>;
  updateUserProfile: (data: Partial<User>) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: React.ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [loading, setLoading] = useState(true);
  
  const queryClient = useQueryClient();

  const createUserDocument = async (firebaseUser: FirebaseUser, additionalData?: any) => {
    if (!firebaseUser) return;

    const userRef = doc(db, 'users', firebaseUser.uid);
    const userDoc = await getDoc(userRef);

    if (!userDoc.exists()) {
      const { displayName, email, photoURL } = firebaseUser;
      const userData: Omit<User, 'id'> = {
        displayName: displayName || 'Người dùng',
        email: email || '',
        role: 'user',
        photoURL: photoURL || '',
        isActive: false, // ✅ Mặc định không kích hoạt khi đăng ký mới
        createdAt: new Date(),
        updatedAt: new Date(),
        ...additionalData,
      };

      try {
        await setDoc(userRef, {
          ...userData,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
        return { id: firebaseUser.uid, ...userData };
      } catch (error) {
        console.error('Error creating user document:', error);
        throw error;
      }
    } else {
      const userData = userDoc.data() as Omit<User, 'id'>;
      return { id: firebaseUser.uid, ...userData };
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      const result = await signInWithEmailAndPassword(auth, email, password);
      
      // ✅ Kiểm tra xem user có tồn tại trong Firestore không
      const userRef = doc(db, 'users', result.user.uid);
      const userDoc = await getDoc(userRef);
      
      if (!userDoc.exists()) {
        // Nếu chưa có document, tạo mới
        await createUserDocument(result.user);
      }
      
      const userData = userDoc.exists() 
        ? { id: result.user.uid, ...userDoc.data() } as User
        : await createUserDocument(result.user);

      // ✅ KIỂM TRA TRẠNG THÁI KÍCH HOẠT
      if (!userData?.isActive) {
        // Đăng xuất ngay lập tức
        await firebaseSignOut(auth);
        throw new Error('Tài khoản của bạn chưa được kích hoạt. Vui lòng liên hệ quản trị viên.');
      }

      setCurrentUser(userData);
      queryClient.clear();
    } catch (error: any) {
      console.error('Sign in error:', error);
  
      // Xử lý các lỗi đặc biệt
      if (error.message.includes('chưa được kích hoạt')) {
        throw error; // Giữ nguyên message về tài khoản chưa kích hoạt
      }
      
      if (error.code === 'auth/network-request-failed') {
        throw new Error('Không thể kết nối đến máy chủ. Vui lòng kiểm tra kết nối internet.');
      } else if (error.code === 'auth/too-many-requests') {
        throw new Error('Quá nhiều lần thử đăng nhập. Vui lòng thử lại sau.');
      } else if (error.code === 'auth/user-not-found') {
        throw new Error('Tài khoản không tồn tại.');
      } else if (error.code === 'auth/wrong-password') {
        throw new Error('Mật khẩu không đúng.');
      } else if (error.code === 'auth/invalid-email') {
        throw new Error('Email không hợp lệ.');
      } else if (error.code === 'auth/user-disabled') {
        throw new Error('Tài khoản đã bị vô hiệu hóa.');
      } else if (error.code === 'auth/invalid-credential') {
        throw new Error('Thông tin đăng nhập không hợp lệ. Vui lòng kiểm tra lại.');
      }
      
      throw new Error(error.message || 'Đăng nhập thất bại. Vui lòng thử lại.');
    }
  };

  const signUp = async (email: string, password: string, displayName: string) => {
    try {
      if (!email || !password || !displayName) {
        throw new Error('Vui lòng điền đầy đủ thông tin.');
      }

      if (password.length < 6) {
        throw new Error('Mật khẩu phải có ít nhất 6 ký tự.');
      }

      const result = await createUserWithEmailAndPassword(auth, email, password);
      
      await updateProfile(result.user, { displayName });
      
      // ✅ Tạo user document với isActive = true (hoặc false nếu cần admin duyệt)
      const userData = await createUserDocument(result.user, { 
        displayName,
        isActive: true // Đổi thành false nếu muốn admin phải kích hoạt thủ công
      });
      
      setCurrentUser(userData);
      queryClient.clear();
    } catch (error: any) {
      console.error('Sign up error:', error);
      
      if (error.code === 'auth/email-already-in-use') {
        throw new Error('Email đã được sử dụng.');
      } else if (error.code === 'auth/invalid-email') {
        throw new Error('Email không hợp lệ.');
      } else if (error.code === 'auth/weak-password') {
        throw new Error('Mật khẩu quá yếu. Vui lòng chọn mật khẩu mạnh hơn.');
      } else if (error.code === 'auth/network-request-failed') {
        throw new Error('Không thể kết nối đến máy chủ. Vui lòng kiểm tra kết nối internet.');
      }
      
      throw new Error(error.message || 'Đăng ký thất bại. Vui lòng thử lại.');
    }
  };

  const signOut = async () => {
    try {
      await firebaseSignOut(auth);
      setCurrentUser(null);
      queryClient.clear();
    } catch (error) {
      console.error('Sign out error:', error);
      throw error;
    }
  };

  const updateUserProfile = async (data: Partial<User>) => {
    if (!firebaseUser) throw new Error('No user logged in');
    
    const userRef = doc(db, 'users', firebaseUser.uid);
    await setDoc(userRef, {
      ...data,
      updatedAt: serverTimestamp(),
    }, { merge: true });
    
    if (currentUser) {
      setCurrentUser({
        ...currentUser,
        ...data,
        updatedAt: new Date(),
      });
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setFirebaseUser(user);
      
      if (user) {
        try {
          const userData = await createUserDocument(user);
          
          // ✅ Kiểm tra trạng thái kích hoạt
          if (!userData?.isActive) {
            await firebaseSignOut(auth);
            setCurrentUser(null);
            setLoading(false);
            return;
          }
          
          setCurrentUser(userData);
        } catch (error) {
          console.error('Error loading user data:', error);
          setCurrentUser(null);
        }
      } else {
        setCurrentUser(null);
      }
      
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const value = {
    currentUser,
    firebaseUser,
    loading,
    signIn,
    signUp,
    signOut,
    updateUserProfile,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};