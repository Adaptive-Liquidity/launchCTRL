import { create } from 'zustand';

interface WorkspaceStore {
  activeWorkspaceId: string | null;
  setActiveWorkspace: (id: string | null) => void;
  token: string | null;
  setToken: (token: string | null) => void;
  user: { id: string; telegramFirstName: string; telegramUsername: string | null } | null;
  setUser: (user: WorkspaceStore['user']) => void;
}

export const useWorkspaceStore = create<WorkspaceStore>((set) => ({
  activeWorkspaceId: null,
  setActiveWorkspace: (id) => set({ activeWorkspaceId: id }),
  token: null,
  setToken: (token) => set({ token }),
  user: null,
  setUser: (user) => set({ user }),
}));
