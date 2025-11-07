import React, { useEffect, useState } from 'react';
import { apiClient } from '../lib/api';
import { useAuth } from '../hooks/useAuth';
import { Bot, Edit3, BarChart3, MessageCircle, Star, Lightbulb, RefreshCw, Clock, Sparkles } from 'lucide-react';

const PoliticianAgentSettings = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [politician, setPolitician] = useState(null);
  const [agent, setAgent] = useState(null);
  const [stats, setStats] = useState(null);
  const [trainedPrompt, setTrainedPrompt] = useState('');
  const [interactions, setInteractions] = useState([]);
  const [loadingInteractions, setLoadingInteractions] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [generatingSuggestions, setGeneratingSuggestions] = useState(false);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      // Buscar político vinculado ao usuário
      const meResponse = await apiClient.get('/politicians/me');
      if (!meResponse.data?.success || !meResponse.data?.data) {
        setError('Não encontramos um político vinculado ao seu usuário.');
        setLoading(false);
        return;
      }
      const pol = meResponse.data.data;
      setPolitician(pol);
      const ag = pol.politician_agents || null;
      setAgent(ag);
      setTrainedPrompt(ag?.trained_prompt || '');

      // Buscar estatísticas
      const statsResponse = await apiClient.get('/politicians/me/stats');
      if (statsResponse.data?.success) {
        setStats(statsResponse.data.data);
      }

      // Buscar interações recentes do agente
      setLoadingInteractions(true);
      try {
        const interRes = await apiClient.get('/politicians/me/agent/interactions?limit=20');
        if (interRes.data?.success) {
          setInteractions(interRes.data.data || []);
        }
      } catch (interErr) {
        console.error('Erro ao carregar interações do agente:', interErr);
      } finally {
        setLoadingInteractions(false);
      }
    } catch (err) {
      console.error('Erro ao carregar dados do político:', err);
      setError('Erro ao carregar dados.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const savePrompt = async () => {
    if (!trainedPrompt || !agent?.id) return;
    try {
      setSaving(true);
      const response = await apiClient.put('/politicians/me/agent/prompt', { trained_prompt: trainedPrompt });
      if (response.data?.success) {
        setAgent({ ...agent, trained_prompt: trainedPrompt });
      }
    } catch (err) {
      console.error('Erro ao salvar prompt:', err);
      setError('Erro ao salvar prompt do agente.');
    } finally {
      setSaving(false);
    }
  };

  const generateSuggestions = async () => {
    if (!agent?.id) return;
    try {
      setGeneratingSuggestions(true);
      setError(null);
      const res = await apiClient.get('/politicians/me/agent/suggestions');
      if (res.data?.success) {
        setSuggestions(res.data?.data?.suggestions || []);
      } else {
        setSuggestions([]);
      }
    } catch (err) {
      console.error('Erro ao gerar sugestões:', err);
      setError('Erro ao gerar sugestões de prompt.');
    } finally {
      setGeneratingSuggestions(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Carregando...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-6">
        <p className="text-red-600">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm p-6 flex items-center gap-4">
        <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
          <Bot className="w-6 h-6 text-blue-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Configurações do Agente IA</h1>
          <p className="text-gray-600">Edite o prompt do seu agente e veja estatísticas.</p>
        </div>
      </div>

      {/* Informações do político */}
      {politician && (
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-900">Político</h2>
          <div className="mt-2 text-gray-700">
            <div className="flex items-center gap-2">
              <span className="font-medium">{politician.name}</span>
              <span className="text-sm text-gray-500">• {politician.position} • {politician.state} • {politician.party}</span>
            </div>
          </div>
        </div>
      )}

      {/* Prompt do agente */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <Edit3 className="w-5 h-5" />
            Prompt do Agente
          </h2>
          {agent?.id ? (
            <span className="text-xs text-gray-500">Agente #{agent.id}</span>
          ) : (
            <span className="text-xs text-gray-500">Agente não encontrado</span>
          )}
        </div>
        <p className="text-gray-600 text-sm mt-2">Este texto define como seu agente deve se comportar e responder.</p>
        <textarea
          value={trainedPrompt}
          onChange={(e) => setTrainedPrompt(e.target.value)}
          rows={8}
          className="mt-4 w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          placeholder="Descreva diretrizes, tom e conteúdo desejado para suas respostas..."
        />
        <div className="mt-4">
          <button
            onClick={savePrompt}
            disabled={saving || !agent?.id}
            className={`px-4 py-2 rounded-lg text-white ${saving ? 'bg-gray-400' : 'bg-blue-600 hover:bg-blue-700'}`}
          >
            {saving ? 'Salvando...' : 'Salvar Prompt'}
          </button>
        </div>

        {/* Sugestões de Prompt */}
        <div className="mt-6 border-t pt-6">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <Lightbulb className="w-5 h-5 text-yellow-500" />
              Sugestões de Prompt
            </h3>
            <button
              onClick={generateSuggestions}
              disabled={generatingSuggestions || !agent?.id}
              className="flex items-center gap-2 px-3 py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors disabled:opacity-50"
            >
              {generatingSuggestions ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Gerando...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 text-blue-600" />
                  Gerar sugestões
                </>
              )}
            </button>
          </div>
          {suggestions?.length > 0 ? (
            <ul className="mt-3 space-y-2 list-disc list-inside text-gray-800">
              {suggestions.map((sug, idx) => (
                <li key={idx}>{sug}</li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 text-sm text-gray-600">Nenhuma sugestão gerada ainda. Clique em "Gerar sugestões" para obter ideias.</p>
          )}
        </div>
      </div>

      {/* Estatísticas */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          <BarChart3 className="w-5 h-5" />
          Estatísticas do Agente
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
          <div className="border rounded-lg p-4 flex items-center gap-3">
            <MessageCircle className="w-6 h-6 text-blue-600" />
            <div>
              <div className="text-2xl font-bold text-gray-900">{stats?.total_messages || 0}</div>
              <div className="text-sm text-gray-600">Mensagens recebidas</div>
            </div>
          </div>
          <div className="border rounded-lg p-4 flex items-center gap-3">
            <Star className="w-6 h-6 text-yellow-500" />
            <div>
              <div className="text-2xl font-bold text-gray-900">{stats?.total_ratings || 0}</div>
              <div className="text-sm text-gray-600">Avaliações</div>
            </div>
          </div>
          <div className="border rounded-lg p-4">
            <div className="text-sm text-gray-600">Média de avaliação</div>
            <div className="text-2xl font-bold text-gray-900">{stats?.average_rating?.toFixed ? stats.average_rating.toFixed(1) : Number(stats?.average_rating || 0).toFixed(1)}</div>
            <div className="text-xs text-gray-500">{stats?.total_votes || 0} {stats?.total_votes === 1 ? 'voto' : 'votos'}</div>
          </div>
        </div>
      </div>

      {/* Interações recentes do agente */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          <MessageCircle className="w-5 h-5" />
          Interações Recentes
        </h2>
        {loadingInteractions ? (
          <div className="mt-4 text-gray-600 text-sm flex items-center gap-2">
            <RefreshCw className="w-4 h-4 animate-spin" />
            Carregando interações...
          </div>
        ) : interactions?.length > 0 ? (
          <div className="mt-4 space-y-4">
            {interactions.map((conv) => (
              <div key={conv.id} className="border rounded-lg p-4">
                <div className="flex items-center text-xs text-gray-500 gap-1 mb-2">
                  <Clock className="w-3 h-3" />
                  <span>{new Date(conv.created_at).toLocaleString()}</span>
                </div>
                <div className="mb-2">
                  <div className="text-xs text-gray-500">Pergunta do usuário</div>
                  <p className="text-gray-800 whitespace-pre-line">{conv.user_message}</p>
                </div>
                <div>
                  <div className="text-xs text-gray-500">Resposta do agente</div>
                  <p className="text-gray-800 whitespace-pre-line">{conv.agent_response}</p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="mt-3 text-sm text-gray-600">Nenhuma interação encontrada para seu agente.</p>
        )}
      </div>
    </div>
  );
};

export default PoliticianAgentSettings;