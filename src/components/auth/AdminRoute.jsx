import React, { useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { apiClient } from '../../lib/api'
import { Loader2, Shield } from 'lucide-react'
import { BRAND } from '../../utils/brand'

export default function AdminRoute({ children }) {
  const { user, userProfile, loading } = useAuth()
  const [isAdminUser, setIsAdminUser] = useState(false)
  const [checking, setChecking] = useState(true)

  useEffect(() => {
    let isMounted = true

    async function checkAdmin() {
      // Evitar checar enquanto o auth ainda está carregando
      if (loading) {
        setChecking(true)
        return
      }

      // Se não há usuário autenticado, não é admin
      if (!user) {
        if (isMounted) {
          setIsAdminUser(false)
          setChecking(false)
        }
        return
      }

      setChecking(true)
      try {
        // Preferir role do backend; fallback para checagens locais
        const res = await apiClient.get('/users/profile')
        const role = res?.data?.role || res?.data?.data?.role
        const backendIsAdmin = role === 'admin' || role === 'super_admin'

        const clientIsAdmin = !!userProfile?.is_admin || (user?.email === BRAND.adminEmail)
        const finalIsAdmin = backendIsAdmin || clientIsAdmin

        if (isMounted) {
          setIsAdminUser(finalIsAdmin)
        }
      } catch (err) {
        const clientIsAdmin = !!userProfile?.is_admin || (user?.email === BRAND.adminEmail)
        if (isMounted) {
          setIsAdminUser(clientIsAdmin)
        }
      } finally {
        if (isMounted) setChecking(false)
      }
    }

    checkAdmin()
    return () => {
      isMounted = false
    }
  // Dependências específicas para evitar rechecagens desnecessárias
  }, [loading, user?.email, userProfile?.is_admin])

  // Enquanto carregamos/checamos, mostrar um loader discreto
  if (loading || checking) {
    return (
      <div className="flex items-center justify-center py-10 text-gray-600">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
        <span>Verificando acesso admin...</span>
      </div>
    )
  }

  if (!isAdminUser) return <Navigate to="/" replace />

  return children
}