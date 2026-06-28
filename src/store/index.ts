import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { AuthUser, PresenceUser, SyncStatus } from "@/types";

interface AuthState {
  user: AuthUser | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  setUser: (user: AuthUser | null) => void;
  setAccessToken: (token: string | null) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      accessToken: null,
      isAuthenticated: false,
      setUser: (user) => set({ user, isAuthenticated: !!user }),
      setAccessToken: (accessToken) => set({ accessToken }),
      logout: () =>
        set({ user: null, accessToken: null, isAuthenticated: false }),
    }),
    { name: "auth-storage" },
  ),
);

interface SyncState {
  status: SyncStatus;
  isOnline: boolean;
  pendingCount: number;
  failedCount: number;
  setStatus: (status: SyncStatus) => void;
  setOnline: (online: boolean) => void;
  setQueueCounts: (pending: number, failed: number) => void;
}

export const useSyncStore = create<SyncState>((set) => ({
  status: "completed",
  isOnline: true,
  pendingCount: 0,
  failedCount: 0,
  setStatus: (status) => set({ status }),
  setOnline: (isOnline) => set({ isOnline }),
  setQueueCounts: (pendingCount, failedCount) =>
    set({ pendingCount, failedCount }),
}));

interface PresenceState {
  users: PresenceUser[];
  setUsers: (users: PresenceUser[]) => void;
  addUser: (user: PresenceUser) => void;
  removeUser: (userId: string) => void;
  updateCursor: (userId: string, cursor: { from: number; to: number }) => void;
  setTyping: (userId: string, isTyping: boolean) => void;
}

export const usePresenceStore = create<PresenceState>((set) => ({
  users: [],
  setUsers: (users) => set({ users }),
  addUser: (user) =>
    set((state) => ({
      users: [...state.users.filter((u) => u.userId !== user.userId), user],
    })),
  removeUser: (userId) =>
    set((state) => ({
      users: state.users.filter((u) => u.userId !== userId),
    })),
  updateCursor: (userId, cursor) =>
    set((state) => ({
      users: state.users.map((u) =>
        u.userId === userId ? { ...u, cursor } : u,
      ),
    })),
  setTyping: (userId, isTyping) =>
    set((state) => ({
      users: state.users.map((u) =>
        u.userId === userId ? { ...u, isTyping } : u,
      ),
    })),
}));

interface EditorState {
  documentId: string | null;
  isSaving: boolean;
  lastSaved: number | null;
  showComments: boolean;
  showAI: boolean;
  showVersionHistory: boolean;
  setDocumentId: (id: string | null) => void;
  setSaving: (saving: boolean) => void;
  setLastSaved: (time: number) => void;
  toggleComments: () => void;
  toggleAI: () => void;
  toggleVersionHistory: () => void;
}

export const useEditorStore = create<EditorState>((set) => ({
  documentId: null,
  isSaving: false,
  lastSaved: null,
  showComments: false,
  showAI: false,
  showVersionHistory: false,
  setDocumentId: (documentId) => set({ documentId }),
  setSaving: (isSaving) => set({ isSaving }),
  setLastSaved: (lastSaved) => set({ lastSaved, isSaving: false }),
  toggleComments: () => set((s) => ({ showComments: !s.showComments })),
  toggleAI: () => set((s) => ({ showAI: !s.showAI })),
  toggleVersionHistory: () =>
    set((s) => ({ showVersionHistory: !s.showVersionHistory })),
}));

interface UIState {
  sidebarOpen: boolean;
  theme: "light" | "dark" | "system";
  toggleSidebar: () => void;
  setTheme: (theme: "light" | "dark" | "system") => void;
}

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      sidebarOpen: true,
      theme: "system",
      toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
      setTheme: (theme) => set({ theme }),
    }),
    { name: "ui-storage" },
  ),
);
