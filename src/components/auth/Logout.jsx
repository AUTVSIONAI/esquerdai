import React, { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'

const Logout = () => {
  const { logout } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    let mounted = true

    // Fallback: garante navegação mesmo se logout demorar
    const fallback = setTimeout(() => {
      if (!mounted) return
      try { navigate('/login', { replace: true }) } catch {}
      setTimeout(() => { try { window.location.href = '/login' } catch {} }, 400)
    }, 1500)

    ;(async () => {
      try {
        // Não bloquear indefinidamente: AuthProvider já tem timeout interno
        await logout()
      } catch (err) {
        console.warn('Logout route error:', err)
      } finally {
        // Se já redirecionou pelo AuthProvider, tudo certo; caso contrário o fallback acima cuida
      }
    })()

    return () => { mounted = false; clearTimeout(fallback) }
  }, [logout, navigate])

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-gray-600">Saindo...</p>
      </div>
    </div>
  )
}

export default Logout