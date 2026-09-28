// ============================================================
// src/context/ClientContext.jsx
// Contexto global para gerenciar lista de orçamentos e estado.
// Usa a Context API do React para evitar prop drilling.
// ============================================================

import { createContext, useContext, useState, useCallback } from 'react';

// 1. Criação do contexto com valor padrão undefined
//    para detectar uso fora do Provider.
const ClientContext = createContext(undefined);

// ============================================================
// Provider do Contexto
// Envolve a aplicação e disponibiliza o estado global.
// ============================================================
export function ClientProvider({ children }) {
  // Lista de orçamentos criados na sessão atual
  const [quotes, setQuotes] = useState([]);
  // Orçamento recém-criado (para exibir o link do WhatsApp)
  const [lastCreatedQuote, setLastCreatedQuote] = useState(null);
  // Estado de carregamento global
  const [loading, setLoading] = useState(false);
  // Mensagem de erro global
  const [error, setError] = useState(null);

  // Adiciona um novo orçamento à lista local após criação no Firestore
  const addQuote = useCallback((quote) => {
    setQuotes((prev) => [quote, ...prev]);
    setLastCreatedQuote(quote);
  }, []);

  // Limpa o último orçamento criado (ex: ao criar um novo)
  const clearLastQuote = useCallback(() => {
    setLastCreatedQuote(null);
  }, []);

  // Valor exposto pelo contexto para todos os componentes filhos
  const contextValue = {
    quotes,
    lastCreatedQuote,
    loading,
    setLoading,
    error,
    setError,
    addQuote,
    clearLastQuote,
  };

  return (
    <ClientContext.Provider value={contextValue}>
      {children}
    </ClientContext.Provider>
  );
}

// ============================================================
// Hook customizado useClientContext
// Encapsula o useContext e garante que só seja usado
// dentro de um componente filho do ClientProvider.
// ============================================================
export function useClientContext() {
  const context = useContext(ClientContext);

  // Tratamento de erro: lança exceção se usado fora do Provider
  if (context === undefined) {
    throw new Error(
      'useClientContext deve ser usado dentro de um <ClientProvider>. ' +
      'Certifique-se de que o componente está envolvido pelo ClientProvider em App.jsx.'
    );
  }

  return context;
}
