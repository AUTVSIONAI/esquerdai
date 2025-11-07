import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { signIn, signUp } from '../../lib/supabase'
import { Flag, Shield, Users, ArrowLeft } from 'lucide-react'
import { BRAND } from '../../utils/brand'
import { apiClient } from '../../lib/api'

const Login = () => {
  const [isLogin, setIsLogin] = useState(true)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [username, setUsername] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      if (isLogin) {
        const signInPromise = signIn(email, password)
        const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('Tempo de login excedido, tente novamente.')), 6000))
        const { data, error } = await Promise.race([signInPromise, timeoutPromise])
        if (error) throw error

        // Tentativa extra: se race estourou mas sessão existe, segue
        if (!data?.user) {
          try {
            const { data: { session } } = await import('../../lib/supabase').then(m => m.supabase.auth.getSession())
            if (session?.user) {
              // Sessão válida mesmo sem data.user
            } else {
              throw new Error('Falha ao obter sessão de login.')
            }
          } catch (sessErr) {
            throw sessErr
          }
        }
        
        // Redirecionamento por papel
        if (data?.user?.email === BRAND.adminEmail) {
          navigate('/admin')
        } else {
          // Verificar se o usuário é um político e tem agente vinculado
          try {
            const meResponse = await apiClient.get('/politicians/me')
            if (meResponse?.data?.success && meResponse?.data?.data) {
              navigate('/me/politico')
            } else {
              navigate('/dashboard')
            }
          } catch (checkErr) {
            // Em caso de falha na verificação, seguir para dashboard
            navigate('/dashboard')
          }
        }
      } else {
        const userData = { username, plan: 'gratuito', role: 'user' }
        const signUpPromise = signUp(email, password, userData)
        const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('Tempo de cadastro excedido, tente novamente.')), 6000))
        const { data, error } = await Promise.race([signUpPromise, timeoutPromise])
        if (error) throw error
        alert('Cadastro realizado! Verifique seu email para confirmar a conta.')
        setIsLogin(true)
      }
    } catch (error) {
      setError(error.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 to-progressive-50">
      <div className="max-w-md w-full space-y-8 p-8">
        <div className="text-center">
          <div className="flex justify-between items-center mb-4">
            <button
              onClick={() => navigate('/')}
              className="flex items-center space-x-2 text-gray-600 hover:text-primary-600 transition-colors"
            >
              <ArrowLeft className="h-5 w-5" />
              <span className="text-sm">Voltar para Site</span>
            </button>
            <div className="flex items-center space-x-2">
              <Flag className="h-8 w-8 text-primary-600" />
              <h1 className="text-3xl font-bold text-gray-900">{BRAND.domain}</h1>
            </div>
            <div className="w-24"></div> {/* Spacer for centering */}
          </div>
          <h2 className="text-xl text-gray-600">
            {isLogin ? 'Entre na Central da Esquerda' : 'Junte-se ao Movimento Progressista'}
          </h2>
        </div>

        <div className="card">
          <form onSubmit={handleSubmit} className="space-y-6">
            {!isLogin && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nome de Usuário
                </label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  required
                />
              </div>
            )}
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Senha
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                required
                autoComplete="current-password"
              />
            </div>

            {error && (
              <div className="text-red-600 text-sm text-center">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full btn-primary disabled:opacity-50"
            >
              {loading ? 'Carregando...' : (isLogin ? 'Entrar' : 'Cadastrar')}
            </button>
          </form>

          <div className="mt-6 text-center">
            <button
              onClick={() => setIsLogin(!isLogin)}
              className="text-primary-600 hover:text-primary-700 text-sm"
            >
              {isLogin ? 'Não tem conta? Cadastre-se' : 'Já tem conta? Entre'}
            </button>
          </div>


        </div>
      </div>
    </div>
  )
}

export default Login