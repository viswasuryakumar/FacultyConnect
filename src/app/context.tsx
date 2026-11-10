import { createContext, useContext } from 'react';
import type { AppState, Profile } from '../domain/types';

export interface AppContextValue {
  state: AppState;
  user: Profile;
  notify: (message: string) => void;
  explain: (title: string, body: string) => void;
}
export const AppContext = createContext<AppContextValue | null>(null);
export function useApp() {
  const value = useContext(AppContext);
  if (!value) throw new Error('App context is missing.');
  return value;
}
