// ============================================================
// src/services/firebase.js
// Inicialização do Firebase usando a SDK Modular v9+
// Substitua os valores de firebaseConfig pelos do seu projeto
// no Console do Firebase (Project Settings > Your apps).
// ============================================================

import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { getAnalytics } from 'firebase/analytics';

// Configuração do projeto Firebase via variáveis de ambiente (.env)
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID
};

// Inicializa o App do Firebase
const app = initializeApp(firebaseConfig);

// Instância do Firestore (banco de dados)
export const db = getFirestore(app);

// Instância do Auth (autenticação - configurado para uso futuro)
export const auth = getAuth(app);

export default app;

export const analytics = getAnalytics(app);
