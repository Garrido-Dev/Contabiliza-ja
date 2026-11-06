// ============================================================
// src/context/AuthContext.jsx
// Contexto de autenticação e perfil corporativo da empresa/profissional.
// Disponibiliza: user, userProfile, loading, profileLoading,
//                signInWithGoogle, signInWithEmail, signUpWithEmail,
//                updateUserProfile, signOut
// ============================================================

import { createContext, useContext, useState, useEffect } from 'react';
import {
  GoogleAuthProvider,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
  signOut as firebaseSignOut,
  onAuthStateChanged,
} from 'firebase/auth';
import {
  doc,
  setDoc,
  onSnapshot,
  serverTimestamp,
  runTransaction,
} from 'firebase/firestore';
import { auth, db } from '../services/firebase';

const AuthContext = createContext(undefined);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [profileLoading, setProfileLoading] = useState(false);

  // Escuta mudanças de autenticação
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  // Escuta documento do perfil do usuário no Firestore em tempo real
  useEffect(() => {
    if (!user) {
      setUserProfile(null);
      setProfileLoading(false);
      return;
    }

    setProfileLoading(true);
    const userDocRef = doc(db, 'users', user.uid);

    const unsubscribeDoc = onSnapshot(
      userDocRef,
      (docSnap) => {
        if (docSnap.exists()) {
          setUserProfile({ id: docSnap.id, ...docSnap.data() });
        } else {
          // Documento inicial caso o usuário tenha entrado via Google pela primeira vez
          const defaultProfile = {
            fullName: user.displayName || '',
            officeName: '',
            cnpj: '',
            phone: '',
            email: user.email || '',
            roleTitle: '',
            crc: '',
            address: '',
            cityState: '',
            website: '',
            logoUrl: user.photoURL || '',
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          };
          runTransaction(db, async (transaction) => {
            const fresh = await transaction.get(userDocRef);
            if (!fresh.exists()) {
              transaction.set(userDocRef, defaultProfile);
            }
          }).catch((err) => {
            console.error('Erro ao inicializar perfil:', err);
          });
        }
        setProfileLoading(false);
      },
      (error) => {
        console.error('Erro ao carregar perfil do Firestore:', error);
        setProfileLoading(false);
      }
    );

    return unsubscribeDoc;
  }, [user]);

  // Login com popup Google
  async function signInWithGoogle() {
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });
    const res = await signInWithPopup(auth, provider);
    return res.user;
  }

  // Login com e-mail e senha
  async function signInWithEmail(email, password) {
    const res = await signInWithEmailAndPassword(auth, email.trim(), password);
    return res.user;
  }

  // Cadastro com e-mail, senha e dados do perfil
  async function signUpWithEmail(email, password, profileData = {}) {
    const res = await createUserWithEmailAndPassword(auth, email.trim(), password);
    const newUser = res.user;

    const fullName = profileData.fullName?.trim() || '';
    if (fullName) {
      try {
        await updateProfile(newUser, { displayName: fullName });
      } catch (e) {
        console.warn('Não foi possível atualizar displayName do Auth:', e);
      }
    }

    const newProfile = {
      fullName: fullName,
      officeName: profileData.officeName?.trim() || '',
      cnpj: profileData.cnpj?.trim() || '',
      phone: profileData.phone?.trim() || '',
      email: newUser.email || email.trim(),
      roleTitle: profileData.roleTitle?.trim() || '',
      crc: profileData.crc?.trim() || '',
      address: profileData.address?.trim() || '',
      cityState: profileData.cityState?.trim() || '',
      website: profileData.website?.trim() || '',
      logoUrl: profileData.logoUrl || '',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    await setDoc(doc(db, 'users', newUser.uid), newProfile);
    setUserProfile({ id: newUser.uid, ...newProfile });
    return newUser;
  }

  // Atualização dos dados do perfil
  async function updateUserProfile(data) {
    if (!user) throw new Error('Usuário não autenticado');

    const cleanData = {
      ...data,
      updatedAt: serverTimestamp(),
    };

    if (data.fullName && data.fullName.trim() !== user.displayName) {
      try {
        await updateProfile(auth.currentUser, { displayName: data.fullName.trim() });
      } catch (e) {
        console.warn('Erro ao atualizar displayName no Firebase Auth:', e);
      }
    }

    await setDoc(doc(db, 'users', user.uid), cleanData, { merge: true });
  }

  // Logout
  async function signOut() {
    await firebaseSignOut(auth);
    setUser(null);
    setUserProfile(null);
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        userProfile,
        loading,
        profileLoading,
        signInWithGoogle,
        signInWithEmail,
        signUpWithEmail,
        updateUserProfile,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (ctx === undefined) throw new Error('useAuth deve ser usado dentro de AuthProvider');
  return ctx;
}
