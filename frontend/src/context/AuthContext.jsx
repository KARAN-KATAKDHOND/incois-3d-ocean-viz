import { createContext, useContext, useState, useEffect } from 'react';
import {
  signInWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
  onAuthStateChanged,
} from 'firebase/auth';

import { auth } from '../firebase';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser) {
        const userData = {
          uid: firebaseUser.uid,
          name: firebaseUser.displayName || 'INCOIS User',
          email: firebaseUser.email,
          photoURL: firebaseUser.photoURL || null,
          role: 'Operational Forecaster',
        };

        setUser(userData);
      } else {
        setUser(null);
      }

      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const login = async (email, password) => {
    const userCredential = await signInWithEmailAndPassword(
      auth,
      email,
      password
    );

    const firebaseUser = userCredential.user;

    const userData = {
      uid: firebaseUser.uid,
      name: firebaseUser.displayName || 'INCOIS User',
      email: firebaseUser.email,
      photoURL: firebaseUser.photoURL || null,
      role: 'Operational Forecaster',
    };

    setUser(userData);

    return userData;
  };

  const loginWithGoogle = async () => {
    const provider = new GoogleAuthProvider();

    const userCredential = await signInWithPopup(auth, provider);

    const firebaseUser = userCredential.user;

    const userData = {
      uid: firebaseUser.uid,
      name: firebaseUser.displayName || 'Google User',
      email: firebaseUser.email,
      photoURL: firebaseUser.photoURL || null,
      role: 'Operational Forecaster',
    };

    setUser(userData);

    return userData;
  };

  const logout = async () => {
    await signOut(auth);
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        login,
        loginWithGoogle,
        logout,
        loading,
        isAuthenticated: !!user,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);