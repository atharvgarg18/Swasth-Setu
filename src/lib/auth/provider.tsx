'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { User } from '@supabase/supabase-js';
import type { UserRole } from '@/lib/constants';

interface UserProfile {
  id: string;
  full_name: string | null;
  phone: string | null;
  email: string | null;
  preferred_language: string;
  avatar_url: string | null;
}

interface UserRoleRecord {
  role: UserRole;
  facility_id: string | null;
  district: string | null;
}

interface AuthContextValue {
  user: User | null;
  profile: UserProfile | null;
  roles: UserRoleRecord[];
  primaryRole: UserRole | null;
  isLoading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signUp: (email: string, password: string, fullName: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  hasRole: (role: UserRole) => boolean;
  facilityId: string | null;
  district: string | null;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [roles, setRoles] = useState<UserRoleRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const supabase = createClient();

  const fetchUserData = useCallback(
    async (userId: string) => {
      // Fetch profile
      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (profileData) {
        setProfile(profileData);
      }

      // Fetch roles
      const { data: rolesData } = await supabase
        .from('user_roles')
        .select('role, facility_id, district')
        .eq('user_id', userId)
        .eq('is_active', true);

      if (rolesData) {
        setRoles(rolesData as UserRoleRecord[]);
      }
    },
    [supabase]
  );

  useEffect(() => {
    // Get initial session
    const getSession = async () => {
      const {
        data: { user: currentUser },
      } = await supabase.auth.getUser();

      if (currentUser) {
        setUser(currentUser);
        await fetchUserData(currentUser.id);
      }
      setIsLoading(false);
    };

    getSession();

    // Listen for auth state changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        setUser(session.user);
        await fetchUserData(session.user.id);
        // Update realtime auth token
        supabase.realtime.setAuth(session.access_token);
      } else if (event === 'SIGNED_OUT') {
        setUser(null);
        setProfile(null);
        setRoles([]);
      } else if (event === 'TOKEN_REFRESHED' && session) {
        supabase.realtime.setAuth(session.access_token);
      }
    });

    return () => subscription.unsubscribe();
  }, [supabase, fetchUserData]);

  const signIn = useCallback(
    async (email: string, password: string) => {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) return { error: error.message };
      return { error: null };
    },
    [supabase]
  );

  const signUp = useCallback(
    async (email: string, password: string, fullName: string) => {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { full_name: fullName },
        },
      });
      if (error) return { error: error.message };

      // Create profile
      if (data.user) {
        await supabase.from('profiles').upsert({
          id: data.user.id,
          full_name: fullName,
          email,
        });
      }

      return { error: null };
    },
    [supabase]
  );

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    window.location.href = '/login';
  }, [supabase]);

  const hasRole = useCallback(
    (role: UserRole) => roles.some((r) => r.role === role),
    [roles]
  );

  const primaryRole = roles[0]?.role ?? null;
  const facilityId = roles.find((r) => r.facility_id)?.facility_id ?? null;
  const district = roles.find((r) => r.district)?.district ?? null;

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        roles,
        primaryRole,
        isLoading,
        signIn,
        signUp,
        signOut,
        hasRole,
        facilityId,
        district,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

/**
 * Hook to access the current user's auth state, profile, and roles.
 */
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
