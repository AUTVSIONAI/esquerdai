import React from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import AuthProvider from './contexts/AuthProvider'
import HomePage from './pages/HomePage'
import Login from './components/auth/Login'
import Logout from './components/auth/Logout'
import UserDashboard from './components/user/UserDashboard'
import AdminDashboard from './components/admin/AdminDashboard'
import ProtectedRoute from './components/auth/ProtectedRoute'
import AdminRoute from './components/auth/AdminRoute'
import PublicRoute from './components/auth/PublicRoute'
import Blog from './pages/Blog'
import BlogPost from './pages/BlogPost'
import Politicians from './pages/Politicians'
import PoliticianProfile from './pages/PoliticianProfile'
import PoliticianRegistration from './pages/PoliticianRegistration'
import PoliticianRanking from './pages/PoliticianRanking'
import AgentChat from './pages/AgentChat'
import Surveys from './pages/Surveys'
import SurveyResults from './pages/SurveyResults'
import SurveyDetail from './pages/SurveyDetail'
import VerdadeOuFake from './pages/VerdadeOuFake'
import ConstitutionQuiz from './components/user/ConstitutionQuiz'
import PoliticianAgentSettings from './pages/PoliticianAgentSettings'

function App() {
  return (
    <AuthProvider>
      <Router
        future={{
          v7_startTransition: true,
          v7_relativeSplatPath: true
        }}
      >
        <div className="min-h-screen bg-gray-50">
          <Routes>
            {/* Landing Page */}
            <Route path="/" element={<HomePage />} />
            
            {/* Rota de login */}
            <Route path="/login" element={<Login />} />
            {/* Rota de logout */}
            <Route path="/logout" element={<Logout />} />
            
            {/* Rotas do usuário */}
            <Route 
              path="/dashboard/*" 
              element={
                <ProtectedRoute>
                  <UserDashboard />
                </ProtectedRoute>
              } 
            />
            
            {/* Rotas do admin */}
            <Route 
              path="/admin/*" 
              element={
                <AdminRoute>
                  <AdminDashboard />
                </AdminRoute>
              } 
            />
            
            {/* Páginas que requerem autenticação */}
            <Route path="/blog" element={<PublicRoute requireAuth={true}><Blog /></PublicRoute>} />
            <Route path="/blog/:slug" element={<BlogPost />} />
            <Route path="/politicos" element={<PublicRoute requireAuth={true}><Politicians /></PublicRoute>} />
            <Route path="/politicos/:id" element={<PoliticianProfile />} />
            <Route path="/cadastro-politico" element={<PoliticianRegistration />} />
            <Route path="/politicos/ranking" element={<PublicRoute requireAuth={true}><PoliticianRanking /></PublicRoute>} />
            <Route path="/agente/:politicianId" element={<AgentChat />} />
            
            {/* Rotas de Pesquisas */}
            <Route path="/pesquisas" element={<PublicRoute requireAuth={true}><Surveys /></PublicRoute>} />
            <Route path="/resultados" element={<PublicRoute requireAuth={true}><SurveyResults /></PublicRoute>} />
            <Route path="/pesquisa/:id" element={<SurveyDetail />} />
            <Route path="/me/politico" element={<PublicRoute requireAuth={true}><PoliticianAgentSettings /></PublicRoute>} />
            
            {/* Rota Verdade ou Fake */}
            <Route path="/verdade-ou-fake" element={<PublicRoute requireAuth={true}><VerdadeOuFake /></PublicRoute>} />
            
            {/* Quiz da Constituição */}
            <Route path="/quiz-constituicao" element={<ConstitutionQuiz />} />
            
            {/* Redirecionamentos para compatibilidade */}
            <Route path="/politicians" element={<Navigate to="/politicos" replace />} />
            <Route path="/politicians/:id" element={<Navigate to="/politicos" replace />} />
          </Routes>
        </div>
      </Router>
    </AuthProvider>
  )
}

export default App