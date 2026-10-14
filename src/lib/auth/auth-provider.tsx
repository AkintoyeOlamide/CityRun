"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { User } from "@supabase/supabase-js";
import { isSupabaseConfigured, tryCreateClient } from "@/utils/supabase/client";
import { mergeProfileWithUserMetadata } from "@/lib/auth/profile-metadata";
import type { UserProfile } from "@/lib/city-run/types";
import type { InitialAuthState } from "@/lib/auth/server-auth";

type AuthContextValue = {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  profileLoading: boolean;
  reloadProfile: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

type AuthProviderProps = {
  children: React.ReactNode;
  initialAuthState?: InitialAuthState;
};

export function AuthProvider({ children, initialAuthState }: AuthProviderProps) {
  const hydratedFromServer = initialAuthState !== undefined;
  const initialUser = initialAuthState?.user ?? null;
  const initialProfile = initialAuthState?.profile ?? null;

  const [user, setUser] = useState<User | null>(initialUser);
  const [profile, setProfile] = useState<UserProfile | null>(initialProfile);
  const [loading, setLoading] = useState(!hydratedFromServer);
  const [profileLoading, setProfileLoading] = useState(false);
  const profileInflightRef = useRef<string | null>(null);
  const userRef = useRef(user);
  userRef.current = user;

  const loadProfile = useCallback(async (forUser: User, background = false) => {
    if (profileInflightRef.current === forUser.id) return;
    profileInflightRef.current = forUser.id;

    if (!background) {
      setProfileLoading(true);
    }

    try {
      const res = await fetch("/api/cityrun/profile", { cache: "no-store" });
      if (res.ok) {
        const data = (await res.json()) as UserProfile;
        setProfile(mergeProfileWithUserMetadata(data, forUser));
      } else {
        setProfile((prev) => mergeProfileWithUserMetadata(prev, forUser));
      }
    } finally {
      if (!background) {
        setProfileLoading(false);
      }
      profileInflightRef.current = null;
    }
  }, []);

  const reloadProfile = useCallback(async () => {
    const current = userRef.current;
    if (current) {
      await loadProfile(current, false);
    }
  }, [loadProfile]);

  useEffect(() => {
    if (!isSupabaseConfigured()) {
      setLoading(false);
      return;
    }

    const supabase = tryCreateClient();
    if (!supabase) {
      setLoading(false);
      return;
    }

    if (hydratedFromServer) {
      setLoading(false);
      if (initialUser && !initialProfile) {
        void loadProfile(initialUser, Boolean(mergeProfileWithUserMetadata(null, initialUser)));
      }
    } else {
      supabase.auth.getSession().then(({ data: { session } }) => {
        const current = session?.user ?? null;
        setUser(current);
        setLoading(false);
        if (current) {
          setProfile((prev) => mergeProfileWithUserMetadata(prev, current));
          void loadProfile(current, false);
        }
      });
    }

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      const nextUser = session?.user ?? null;

      if (event === "SIGNED_OUT" || !nextUser) {
        setUser(null);
        setProfile(null);
        setProfileLoading(false);
        setLoading(false);
        return;
      }

      setUser(nextUser);
      setLoading(false);
      setProfile((prev) => mergeProfileWithUserMetadata(prev, nextUser));

      if (event === "INITIAL_SESSION") return;

      const sameAsInitial =
        hydratedFromServer &&
        nextUser.id === initialUser?.id &&
        Boolean(initialProfile);

      if (sameAsInitial) return;

      void loadProfile(nextUser, true);
    });

    return () => subscription.unsubscribe();
  }, [hydratedFromServer, initialUser, initialProfile, loadProfile]);

  const value = useMemo(
    () => ({ user, profile, loading, profileLoading, reloadProfile }),
    [user, profile, loading, profileLoading, reloadProfile],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}
