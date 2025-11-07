import React, { useState, useEffect, useCallback } from 'react'
import { supabase, getCurrentUser, resendConfirmation } from '../lib/supabase'
import { AuthContext } from './AuthContext'
import { apiClient } from '../lib/api'
import { BRAND } from '../utils/brand'

// Define o e-mail de admin a partir de BRAND para manter consistência
const ADMIN_EMAIL = BRAND.adminEmail

const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [userProfile, setUserProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  
  // Timeout de segurança para garantir que loading nunca fique infinito
  React.useEffect(() => {
    const timeout = setTimeout(() => {
      setLoading(false);
    }, 5000); // 5 segundos
    
    return () => clearTimeout(timeout);
  }, [])

  const fetchUserProfile = async (currentUser) => {
    try {
      const basicProfile = {
        id: currentUser.id,
        auth_id: currentUser.id,
        full_name: currentUser?.user_metadata?.full_name || currentUser?.user_metadata?.username || 'Usuário',
        username: currentUser?.user_metadata?.username || '',
        email: currentUser?.email || '',
        avatar_url: currentUser?.user_metadata?.avatar_url || null,
        is_admin: currentUser?.email === ADMIN_EMAIL,
        email_confirmed_at: currentUser?.email === ADMIN_EMAIL ? new Date().toISOString() : currentUser?.email_confirmed_at
      }

      // Primeiro, liberar a UI com perfil básico
      setUserProfile(basicProfile)
      setLoading(false)

      // Em seguida, tentar enriquecer com backend sem bloquear
      const enrich = async () => {
        try {
          const responsePromise = apiClient.get('/users/profile')
          // Timeout curto para evitar telas travadas
          const timeoutPromise = new Promise((resolve) => setTimeout(() => resolve({ timeout: true }), 1800))
          const result = await Promise.race([responsePromise, timeoutPromise])
          if (result && !result.timeout) {
            const backendProfile = result?.data || null
            if (backendProfile) {
              const merged = {
                ...basicProfile,
                ...backendProfile,
                id: backendProfile.id || basicProfile.id,
                auth_id: backendProfile.auth_id || basicProfile.auth_id,
                email: backendProfile.email || basicProfile.email,
                username: backendProfile.username || basicProfile.username,
                full_name: backendProfile.full_name || basicProfile.full_name,
                avatar_url: backendProfile.avatar_url ?? basicProfile.avatar_url
              }
              setUserProfile(merged)
            }
          }
        } catch (e) {
          console.warn('⚠️ Falha ao enriquecer perfil do backend:', e?.message || e)
        }
      }

      // Fire-and-forget
      enrich()
    } catch (error) {
      console.error('❌ Erro ao definir perfil:', error)
      setLoading(false)
    }
  }

  useEffect(() => {
    let mounted = true;
    
    const initializeAuth = async () => {
      try {
        const currentUser = await getCurrentUser();
        const { data: { session } } = await supabase.auth.getSession();
        
        // Propagar token para o apiClient
        if (session?.access_token) {
          apiClient.setAuthToken(session.access_token);
        } else {
          apiClient.clearAuthToken();
        }
        
        if (mounted) {
          if (currentUser) {
            setUser(currentUser);
            await fetchUserProfile(currentUser);
          } else {
            setUser(null);
            setUserProfile(null);
            setLoading(false);
          }
        }
      } catch (error) {
        if (mounted) {
          apiClient.clearAuthToken();
          setUser(null);
          setUserProfile(null);
          setLoading(false);
        }
      }
    };

    initializeAuth();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return;
      
      // Atualizar token em todas as mudanças de auth
      if (session?.access_token) {
        apiClient.setAuthToken(session.access_token);
      } else {
        apiClient.clearAuthToken();
      }
      
      if (session?.user) {
        setUser(session.user);
        await fetchUserProfile(session.user);
      } else {
        setUser(null);
        setUserProfile(null);
        setLoading(false);
      }
    });

    return () => {
      mounted = false;
      subscription?.unsubscribe();
    };
  }, [])

  const refreshUserProfile = useCallback(async () => {
    try {
      const currentUser = await getCurrentUser();
      if (currentUser) {
        const basicProfile = {
          id: currentUser.id,
          auth_id: currentUser.id,
          full_name: currentUser?.user_metadata?.full_name || currentUser?.user_metadata?.username || 'Usuário',
          username: currentUser?.user_metadata?.username || '',
          email: currentUser?.email || '',
          avatar_url: currentUser?.user_metadata?.avatar_url || null,
          is_admin: currentUser?.email === ADMIN_EMAIL,
          email_confirmed_at: currentUser?.email === ADMIN_EMAIL ? new Date().toISOString() : currentUser?.email_confirmed_at
        };

        // Buscar perfil atualizado do backend e mesclar
        try {
          const response = await apiClient.get('/users/profile')
          const backendProfile = response?.data || null
          const merged = backendProfile ? {
            ...basicProfile,
            ...backendProfile,
            id: backendProfile.id || basicProfile.id,
            auth_id: backendProfile.auth_id || basicProfile.auth_id,
            email: backendProfile.email || basicProfile.email,
            username: backendProfile.username || basicProfile.username,
            full_name: backendProfile.full_name || basicProfile.full_name,
            avatar_url: backendProfile.avatar_url ?? basicProfile.avatar_url
          } : basicProfile

          setUser(currentUser)
          setUserProfile(merged)
        } catch (e) {
          console.warn('⚠️ refreshUserProfile: falha ao buscar backend, usando dados básicos:', e?.message || e)
          setUser(currentUser)
          setUserProfile(basicProfile)
        }
      }
    } catch (error) {
      console.warn('⚠️ refreshUserProfile falhou:', error?.message || error);
    }
  }, [user]);

  // Adiciona função de logout centralizada
  const logout = useCallback(async () => {
    try {
      // Evita travamento: limite de tempo para signOut
      await Promise.race([
        supabase.auth.signOut(),
        new Promise(resolve => setTimeout(resolve, 1500))
      ])
    } catch (err) {
      console.warn('Erro ao sair:', err?.message || err)
    } finally {
      try { apiClient.clearAuthToken() } catch {}
      setUser(null)
      setUserProfile(null)
      setLoading(false)
      // Redireciona para login garantindo recarregamento completo de forma assíncrona
      try {
        setTimeout(() => {
          try { window.location.href = '/login' } catch {}
        }, 0)
      } catch {}
    }
  }, [])

  const value = {
    user,
    userProfile,
    loading,
    refreshUserProfile,
    logout,
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export default AuthProvider;