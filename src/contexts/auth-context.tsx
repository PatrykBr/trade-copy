'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { User } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/client'
import type { User as AppUser } from '@/types'

interface AuthContextType {
  user: User | null
  profile: AppUser | null
  loading: boolean
  signUp: (email: string, password: string, fullName?: string) => Promise<{ data: { user: User | null } | null; error: Error | null }>
  signIn: (email: string, password: string) => Promise<{ data: { user: User | null; session: unknown } | null; error: Error | null }>
  signOut: () => Promise<void>
  resetPassword: (email: string) => Promise<{ data: Record<string, unknown> | null; error: Error | null }>
  updateProfile: (updates: Partial<AppUser>) => Promise<{ data: AppUser | null; error: Error | null }>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<AppUser | null>(null)
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  const fetchProfile = async (userId: string) => {
    try {
      console.log('🔍 Fetching profile for user:', userId)
      
      // Check if we have a session
      const { data: { session } } = await supabase.auth.getSession()
      console.log('🔍 Current session:', session ? 'exists' : 'missing')
      console.log('🔍 Access token:', session?.access_token ? 'present' : 'missing')
      
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single()

      if (error) {
        console.error('❌ Profile fetch error:', error)
        throw error
      }
      
      console.log('✅ Profile fetched successfully:', data)
      setProfile(data)
    } catch (error) {
      console.error('Error fetching profile:', error)
    }
  }

  useEffect(() => {
    // Get initial session
    const getSession = async () => {
      console.log('🔍 Getting initial session...')
      const { data: { session }, error } = await supabase.auth.getSession()
      console.log('🔍 Initial session result:', { session: session ? 'exists' : 'null', error })
      
      setUser(session?.user ?? null)
      
      if (session?.user) {
        console.log('🔍 Session user found:', session.user.id)
        await fetchProfile(session.user.id)
      } else {
        console.log('❌ No session user found')
      }
      
      setLoading(false)
    }

    getSession()

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('🔍 Auth state change:', event, session ? 'session exists' : 'no session')
        setUser(session?.user ?? null)
        
        if (session?.user) {
          console.log('🔍 Auth change - fetching profile for:', session.user.id)
          await fetchProfile(session.user.id)
        } else {
          console.log('🔍 Auth change - clearing profile')
          setProfile(null)
        }
        
        setLoading(false)
      }
    )

    return () => subscription.unsubscribe()
  }, [fetchProfile, supabase.auth])

  const signUp: AuthContextType['signUp'] = async (email, password, fullName) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
        },
      },
    })

    return { data, error }
  }

  const signIn: AuthContextType['signIn'] = async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    return { data, error }
  }

  const signOut = async () => {
    const { error } = await supabase.auth.signOut()
    if (error) throw error
  }

  const resetPassword: AuthContextType['resetPassword'] = async (email) => {
    const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    })

    return { data, error }
  }

  const updateProfile: AuthContextType['updateProfile'] = async (updates) => {
    if (!user) throw new Error('No user logged in')

    const { data, error } = await supabase
      .from('users')
      .update(updates)
      .eq('id', user.id)
      .select()
      .single()

    if (error) throw error
    
    setProfile(data)
    return { data, error }
  }

  const value = {
    user,
    profile,
    loading,
    signUp,
    signIn,
    signOut,
    resetPassword,
    updateProfile,
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}