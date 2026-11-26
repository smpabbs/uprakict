'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import type { Profile } from '@/lib/types'

interface AuthCtx {
  session: Session | null
  profile: Profile | null
  loading: boolean
  login: () => Promise<void>
  logout: () => Promise<void>
}

const Ctx = createContext<AuthCtx | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true
    supabase.auth.getSession().then(async ({ data }) => {
      if (!mounted) return
      setSession(data.session ?? null)
      if (data.session?.user) {
        const { data: prof } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', data.session.user.id)
          .maybeSingle()
        if (mounted) setProfile(prof as Profile | null)
      }
      if (mounted) setLoading(false)
    })
    const { data: sub } = supabase.auth.onAuthStateChange((_ev, s) => {
      setSession(s)
      if (!s) setProfile(null)
    })
    return () => {
      mounted = false
      sub.subscription.unsubscribe()
    }
  }, [])

  const logout = useCallback(async () => {
    await supabase.auth.signOut()
  }, [])

  const login = useCallback(async () => {
    // Handled by server action + redirect
  }, [])

  const value = useMemo(
    () => ({ session, profile, loading, login, logout }),
    [session, profile, loading, login, logout],
  )
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useAuth(): AuthCtx {
  const c = useContext(Ctx)
  if (!c) throw new Error('useAuth harus dipakai di dalam AuthProvider')
  return c
}
