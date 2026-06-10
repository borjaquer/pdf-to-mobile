import { createContext, useContext, useState, useCallback, type FC, type ReactNode } from 'react';

interface LoadingState {
  loading: boolean;
  step: string;
}

interface LoadingContextValue extends LoadingState {
  setLoading: (loading: boolean, step?: string) => void;
  setStep: (step: string) => void;
}

const LoadingContext = createContext<LoadingContextValue | null>(null);

export const LoadingProvider: FC<{ children: ReactNode }> = ({ children }) => {
  const [state, setState] = useState<LoadingState>({ loading: false, step: '' });

  const setLoading = useCallback((loading: boolean, step?: string) => {
    setState({ loading, step: step ?? '' });
  }, []);

  const setStep = useCallback((step: string) => {
    setState(prev => ({ ...prev, step }));
  }, []);

  return (
    <LoadingContext.Provider value={{ ...state, setLoading, setStep }}>
      {children}
    </LoadingContext.Provider>
  );
};

export function useLoading(): LoadingContextValue {
  const ctx = useContext(LoadingContext);
  if (!ctx) {
    throw new Error('useLoading debe usarse dentro de un <LoadingProvider>');
  }
  return ctx;
}

export default LoadingContext;
