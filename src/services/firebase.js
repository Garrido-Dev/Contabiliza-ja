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
import { getStorage } from 'firebase/storage';

// Configuração do projeto Firebase via variáveis de ambiente (.env)
const firebaseConfig = {
  apiKey: "AIzaSyDoZl82pG0R9RUM4OidoQv_MUrKDdBrn9Y",
  authDomain: "contabiliza-ja.firebaseapp.com",
  projectId: "contabiliza-ja",
  storageBucket: "contabiliza-ja.firebasestorage.app",
  messagingSenderId: "812266285491",
  appId: "1:812266285491:web:1c306b12ddbd6dd6b0c3c6",
  measurementId: "G-K48M2CCLR2"
};

// Inicializa o App do Firebase
const app = initializeApp(firebaseConfig);

// Instância do Firestore (banco de dados)
export const db = getFirestore(app);

// Instância do Auth (autenticação)
export const auth = getAuth(app);

// Instância do Storage (arquivos e documentos)
export const storage = getStorage(app);

export default app;

export const analytics = getAnalytics(app);
