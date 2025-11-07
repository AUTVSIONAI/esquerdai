import React, { useState, useEffect } from 'react';
import { Download, CheckCircle, BookOpen, Award } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { GamificationService } from '../../services/gamification';
import { ConstitutionService } from '../../services/constitution';
import { apiClient } from '../../lib/api';
import { useGamification } from '../../hooks/useGamification'

const ConstitutionDownload = () => {
  const { userProfile } = useAuth();
  const { refreshData } = useGamification()
  const [isDownloaded, setIsDownloaded] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isLoadingStatus, setIsLoadingStatus] = useState(true);
  const [showSuccess, setShowSuccess] = useState(false);
  const [userPoints, setUserPoints] = useState(null);
  const [resolvedUserId, setResolvedUserId] = useState(null);

  // Fallback imediato: usar localStorage para evitar mostrar o card como disponível no reload
  useEffect(() => {
    const flag = localStorage.getItem('constituicao_baixada');
    if (flag === 'true') {
      setIsDownloaded(true);
    }
  }, []);

  useEffect(() => {
    const init = async () => {
      if (!userProfile?.id) return;
      try {
        // Resolver o userId correto da tabela public.users via backend
        const profileRes = await apiClient.get('/users/profile');
        const id = profileRes?.data?.id || profileRes?.data?.userId || profileRes?.data?.data?.id;
        const finalId = id || userProfile.id;
        setResolvedUserId(finalId);
      } catch (e) {
        setResolvedUserId(userProfile.id);
      }
    };
    init();
  }, [userProfile]);

  useEffect(() => {
    if (resolvedUserId) {
      checkDownloadStatus();
      fetchUserPoints();
    }
  }, [resolvedUserId]);

  const checkDownloadStatus = async () => {
    setIsLoadingStatus(true);
    try {
      const idToCheck = resolvedUserId || userProfile?.id;
      if (!idToCheck) return;
      const status = await ConstitutionService.getDownloadStatus(idToCheck);
      setIsDownloaded(!!status?.hasDownloaded);
    } catch (error) {
      console.error('Erro ao verificar status de download:', error);
      const downloaded = localStorage.getItem('constituicao_baixada');
      if (downloaded === 'true') setIsDownloaded(true);
    } finally {
      setIsLoadingStatus(false);
    }
  };

  // Buscar pontos do usuário usando o id da tabela users obtido via backend
  const fetchUserPoints = async () => {
    try {
      const profileRes = await apiClient.get('/users/profile')
      const userId = profileRes?.data?.id || profileRes?.data?.userId || profileRes?.data?.data?.id
      const points = await GamificationService.getUserPoints(userId)
      setUserPoints(points)
    } catch (error) {
      console.error('Erro ao buscar pontos:', error)
      setUserPoints({ total: 0, level: 1, nextLevelPoints: 100 })
    }
  };

  const handleDownload = async () => {
    if (!userProfile) {
      alert('Você precisa estar logado para baixar a Constituição!');
      return;
    }
    if (isDownloaded) {
      alert('Você já baixou a Constituição anteriormente!');
      return;
    }
    if (!resolvedUserId) {
      alert('Não foi possível identificar seu usuário. Tente novamente.');
      return;
    }
    setIsDownloading(true);
    try {
      const result = await ConstitutionService.registerDownload(resolvedUserId);
      // Se o backend retornar sucesso, seguir com o fluxo de download
      ConstitutionService.downloadPDF();
      setIsDownloaded(true);
      localStorage.setItem('constituicao_baixada', 'true');
      await fetchUserPoints();
      await refreshData();
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 5000);
    } catch (error) {
      console.error('Erro ao baixar Constituição:', error);
      const msg = String(error?.message || '').toLowerCase();
      // Se já baixou, refletir o estado corretamente no frontend
      if (msg.includes('já baixou') || msg.includes('download já registrado')) {
        setIsDownloaded(true);
        localStorage.setItem('constituicao_baixada', 'true');
        alert('Você já baixou a Constituição anteriormente.');
      } else if (msg.includes('failed to fetch')) {
        alert('Erro de conexão. Verifique sua internet e tente novamente.');
      } else if (msg.includes('403')) {
        alert('Erro de autenticação. Faça login novamente.');
      } else {
        alert('Erro ao processar download. Tente novamente mais tarde.');
      }
    } finally {
      setIsDownloading(false);
    }
  };

  if (!userProfile) {
    return null; // Não mostrar para usuários não logados
  }

  // Evitar mostrar o card como disponível até confirmar status
  if (isLoadingStatus && !isDownloaded) {
    return null;
  }

  if (isDownloaded) {
    return (
      <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-lg p-4 mb-6">
        <div className="flex items-center space-x-3">
          <div className="flex-shrink-0">
            <CheckCircle className="h-8 w-8 text-green-600" />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-green-800">
              ✅ Constituição baixada
            </h3>
            <p className="text-sm text-green-600">
              Missão "Verdade na Palma da Mão" concluída! Você ganhou 100 pontos.
            </p>
          </div>
          <div className="flex-shrink-0">
            <div className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-medium">
              +100 pontos
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Mensagem de sucesso */}
      {showSuccess && (
        <div className="fixed top-4 right-4 z-50 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg flex items-center space-x-2 animate-pulse">
          <Award className="h-5 w-5" />
          <span className="font-medium">
            ✅ Parabéns! Você ganhou 100 pontos por baixar a Constituição!
          </span>
        </div>
      )}

      {/* Card de download */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-6 mb-6 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="flex-shrink-0">
              <div className="bg-blue-100 p-3 rounded-full">
                <BookOpen className="h-8 w-8 text-blue-600" />
              </div>
            </div>
            <div className="flex-1">
              <h3 className="text-xl font-bold text-blue-900 mb-1">
                📘 Baixe a Constituição e ganhe 100 pontos!
              </h3>
              <p className="text-blue-700 text-sm mb-2">
                Missão: "Verdade na Palma da Mão"
              </p>
              <p className="text-blue-600 text-sm">
                Baixe gratuitamente a Constituição Federal do Brasil e ganhe pontos no sistema de gamificação.
              </p>
            </div>
          </div>
          <div className="flex-shrink-0">
            <button
              onClick={handleDownload}
              disabled={isDownloading || isLoadingStatus}
              className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white px-6 py-3 rounded-lg font-medium flex items-center space-x-2 transition-colors duração-200 shadow-md hover:shadow-lg"
            >
              {isDownloading ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  <span>Baixando...</span>
                </>
              ) : (
                <>
                  <Download className="h-5 w-5" />
                  <span>Baixar PDF</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Informações de pontuação */}
        {userPoints && (
          <div className="mt-4 pt-4 border-t border-blue-200">
            <div className="flex items-center justify-between text-sm">
              <div className="text-blue-600">
                Seus pontos atuais: <span className="font-semibold">{userPoints.total || 0}</span>
              </div>
              <div className="text-blue-600">
                Nível: <span className="font-semibold">{userPoints.level || 1}</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default ConstitutionDownload;