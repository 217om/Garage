import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import { createSeedDatabase } from '@/data/seed';
import * as storage from '@/lib/storage';
import type {
  Database,
  Garage,
  InternalReview,
  OwnerApplication,
  Role,
  User,
} from '@/types';

function uid(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;
}

export interface InternalStats {
  avg: number;
  count: number;
}

interface AppContextValue {
  hydrated: boolean;
  user: User | null;
  garages: Garage[];
  reviews: InternalReview[];
  applications: OwnerApplication[];

  // selectors
  getGarage: (id: string) => Garage | undefined;
  reviewsFor: (garageId: string) => InternalReview[];
  internalStats: (garageId: string) => InternalStats;

  // auth
  signUp: (input: { name: string; email: string; role: Role }) => { ok: boolean; error?: string };
  login: (email: string) => { ok: boolean; error?: string };
  loginAsAdmin: () => void;
  logout: () => void;

  // actions
  addReview: (garageId: string, rating: number, text: string) => { ok: boolean; error?: string };
  submitApplication: (
    garageId: string,
    phone: string,
    note: string
  ) => { ok: boolean; error?: string };
  approveApplication: (applicationId: string) => void;
  rejectApplication: (applicationId: string) => void;

  resetDemo: () => void;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [hydrated, setHydrated] = useState(false);
  const [db, setDb] = useState<Database>(() => createSeedDatabase());
  const [user, setUser] = useState<User | null>(null);

  // Load persisted state once on mount.
  useEffect(() => {
    let active = true;
    (async () => {
      const [savedDb, savedSession] = await Promise.all([
        storage.loadDatabase(),
        storage.loadSession(),
      ]);
      if (!active) return;
      if (savedDb) setDb(savedDb);
      if (savedSession) setUser(savedSession);
      setHydrated(true);
    })();
    return () => {
      active = false;
    };
  }, []);

  // Persist on change (after hydration to avoid clobbering saved data with the seed).
  useEffect(() => {
    if (hydrated) storage.saveDatabase(db);
  }, [db, hydrated]);

  useEffect(() => {
    if (hydrated) storage.saveSession(user);
  }, [user, hydrated]);

  const value = useMemo<AppContextValue>(() => {
    const getGarage = (id: string) => db.garages.find((g) => g.id === id);
    const reviewsFor = (garageId: string) =>
      db.reviews
        .filter((r) => r.garageId === garageId)
        .sort((a, b) => b.createdAt - a.createdAt);
    const internalStats = (garageId: string): InternalStats => {
      const rs = db.reviews.filter((r) => r.garageId === garageId);
      if (rs.length === 0) return { avg: 0, count: 0 };
      const avg = rs.reduce((s, r) => s + r.rating, 0) / rs.length;
      return { avg, count: rs.length };
    };

    const signUp: AppContextValue['signUp'] = ({ name, email, role }) => {
      const cleanEmail = email.trim().toLowerCase();
      const cleanName = name.trim();
      if (!cleanName) return { ok: false, error: 'Please enter your name.' };
      if (!cleanEmail || !cleanEmail.includes('@'))
        return { ok: false, error: 'Please enter a valid email.' };
      const existing = db.users.find((u) => u.email === cleanEmail);
      if (existing) {
        setUser(existing);
        return { ok: true };
      }
      const newUser: User = {
        id: uid('u'),
        name: cleanName,
        email: cleanEmail,
        role,
        ownedGarageId: null,
      };
      setDb((prev) => ({ ...prev, users: [...prev.users, newUser] }));
      setUser(newUser);
      return { ok: true };
    };

    const login: AppContextValue['login'] = (email) => {
      const cleanEmail = email.trim().toLowerCase();
      const found = db.users.find((u) => u.email === cleanEmail);
      if (!found) return { ok: false, error: 'No account with that email. Sign up first.' };
      setUser(found);
      return { ok: true };
    };

    const loginAsAdmin = () => {
      const admin = db.users.find((u) => u.role === 'admin');
      if (admin) setUser(admin);
    };

    const logout = () => setUser(null);

    const addReview: AppContextValue['addReview'] = (garageId, rating, text) => {
      if (!user) return { ok: false, error: 'You must be signed in to write a review.' };
      if (rating < 1 || rating > 5) return { ok: false, error: 'Please choose a star rating.' };
      const review: InternalReview = {
        id: uid('r'),
        garageId,
        userId: user.id,
        userName: user.name,
        rating,
        text: text.trim(),
        createdAt: Date.now(),
      };
      setDb((prev) => ({ ...prev, reviews: [...prev.reviews, review] }));
      return { ok: true };
    };

    const submitApplication: AppContextValue['submitApplication'] = (garageId, phone, note) => {
      if (!user) return { ok: false, error: 'You must be signed in as an owner to apply.' };
      const garage = db.garages.find((g) => g.id === garageId);
      if (!garage) return { ok: false, error: 'Garage not found.' };
      const dupe = db.applications.find(
        (a) => a.garageId === garageId && a.applicantId === user.id && a.status === 'pending'
      );
      if (dupe) return { ok: false, error: 'You already have a pending application for this garage.' };
      const application: OwnerApplication = {
        id: uid('a'),
        garageId,
        garageName: garage.name,
        applicantId: user.id,
        applicantName: user.name,
        phone: phone.trim(),
        note: note.trim(),
        status: 'pending',
        createdAt: Date.now(),
      };
      setDb((prev) => ({ ...prev, applications: [...prev.applications, application] }));
      return { ok: true };
    };

    const approveApplication = (applicationId: string) => {
      setDb((prev) => {
        const app = prev.applications.find((a) => a.id === applicationId);
        if (!app) return prev;
        return {
          ...prev,
          applications: prev.applications.map((a) =>
            a.id === applicationId ? { ...a, status: 'approved' as const } : a
          ),
          garages: prev.garages.map((g) =>
            g.id === app.garageId ? { ...g, verified: true } : g
          ),
          users: prev.users.map((u) =>
            u.id === app.applicantId
              ? { ...u, role: 'owner' as const, ownedGarageId: app.garageId }
              : u
          ),
        };
      });
      // Keep the active session in sync if the approved owner is signed in.
      setUser((cur) => {
        if (!cur) return cur;
        const app = db.applications.find((a) => a.id === applicationId);
        if (app && app.applicantId === cur.id) {
          return { ...cur, role: 'owner', ownedGarageId: app.garageId };
        }
        return cur;
      });
    };

    const rejectApplication = (applicationId: string) => {
      setDb((prev) => ({
        ...prev,
        applications: prev.applications.map((a) =>
          a.id === applicationId ? { ...a, status: 'rejected' as const } : a
        ),
      }));
    };

    const resetDemo = () => {
      const fresh = createSeedDatabase();
      setDb(fresh);
      setUser(null);
      storage.saveDatabase(fresh);
      storage.saveSession(null);
    };

    return {
      hydrated,
      user,
      garages: db.garages,
      reviews: db.reviews,
      applications: db.applications,
      getGarage,
      reviewsFor,
      internalStats,
      signUp,
      login,
      loginAsAdmin,
      logout,
      addReview,
      submitApplication,
      approveApplication,
      rejectApplication,
      resetDemo,
    };
  }, [db, user, hydrated]);

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within an AppProvider');
  return ctx;
}
