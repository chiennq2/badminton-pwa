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
      // Attempt to sign in with email and password
      const result = await signInWithEmailAndPassword(auth, email, password);
      
      // Create user document if sign-in is successful
      const userData = await createUserDocument(result.user);
      setCurrentUser(userData);
    } catch (error: any) {
      console.error('Sign in error:', error);
  
      // Enhanced error handling
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
      
      // General error message
      throw new Error(error.message || 'Đăng nhập thất bại. Vui lòng thử lại.');
    }
  };

  const signUp = async (email: string, password: string, displayName: string) => {
    try {
      // Validate inputs first
      if (!email || !password || !displayName) {
        throw new Error('Vui lòng điền đầy đủ thông tin.');
      }

      if (password.length < 6) {
        throw new Error('Mật khẩu phải có ít nhất 6 ký tự.');
      }

      console.log('Creating user with Firebase Auth...');
      const result = await createUserWithEmailAndPassword(auth, email, password);
      
      console.log('Updating user profile...');
      await updateProfile(result.user, { displayName });
      
      console.log('Creating user document in Firestore...');
      const userData = await createUserDocument(result.user, { displayName });
      setCurrentUser(userData);
      
      console.log('User registration completed successfully');
    } catch (error: any) {
      console.error('Sign up error:', error);
      
      // Enhanced error handling for signup
      if (error.code === 'auth/network-request-failed') {
        throw new Error('Không thể kết nối đến máy chủ Firebase. Vui lòng:\n1. Kiểm tra kết nối internet\n2. Kiểm tra cấu hình Firebase\n3. Thử lại sau vài phút');
      } else if (error.code === 'auth/email-already-in-use') {
        throw new Error('Email này đã được sử dụng cho tài khoản khác.');
      } else if (error.code === 'auth/invalid-email') {
        throw new Error('Email không hợp lệ.');
      } else if (error.code === 'auth/operation-not-allowed') {
        throw new Error('Đăng ký tài khoản chưa được kích hoạt. Vui lòng liên hệ quản trị viên.');
      } else if (error.code === 'auth/weak-password') {
        throw new Error('Mật khẩu quá yếu. Vui lòng chọn mật khẩu mạnh hơn.');
      } else if (error.code === 'auth/too-many-requests') {
        throw new Error('Quá nhiều lần thử. Vui lòng thử lại sau.');
      }
      
      // If it's a custom error we threw, re-throw it
      if (error.message && !error.code) {
        throw error;
      }
      
      throw new Error(`Đăng ký thất bại: ${error.message || 'Lỗi không xác định'}`);
    }
  };

  const signOut = async () => {
    try {
      await firebaseSignOut(auth);
      setCurrentUser(null);
      setFirebaseUser(null);
    } catch (error) {
      console.error('Sign out error:', error);
      throw error;
    }
  };

  const updateUserProfile = async (data: Partial<User>) => {
    if (!currentUser) return;

    try {
      const userRef = doc(db, 'users', currentUser.id);
      await setDoc(userRef, {
        ...data,
        updatedAt: serverTimestamp(),
      }, { merge: true });

      setCurrentUser(prev => prev ? { ...prev, ...data, updatedAt: new Date() } : null);
    } catch (error) {
      console.error('Error updating user profile:', error);
      throw error;
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setLoading(true);
      
      if (firebaseUser) {
        setFirebaseUser(firebaseUser);
        try {
          const userData = await createUserDocument(firebaseUser);
          setCurrentUser(userData);
        } catch (error) {
          console.error('Error loading user data:', error);
          setCurrentUser(null);
        }
      } else {
        setFirebaseUser(null);
        setCurrentUser(null);
      }
      
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const value: AuthContextType = {
    currentUser,
    firebaseUser,
    loading,
    signIn,
    signUp,
    signOut,
    updateUserProfile,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};