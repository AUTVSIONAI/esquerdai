import React, { useEffect, useMemo, useState } from 'react';
import { apiClient } from '../lib/api';
import { Star, MessageSquare, TrendingUp } from 'lucide-react';

const periodOptions = [
  { value: 'week', label: 'Última semana' },
  { value: 'month', label: 'Último mês' },
  { value: 'all', label: 'Todo período' },
];

export default function PoliticianRanking() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [states, setStates] = useState([]);
  const [selectedState, setSelectedState] = useState('all');
  const [selectedPeriod, setSelectedPeriod] = useState('week');
  const [ranking, setRanking] = useState([]);

  const fetchStates = async () => {
    try {
      const res = await apiClient.get('/politicians/states');
      const data = res?.data?.data ?? null;
      const list = Array.isArray(data) ? data : [];
      setStates(list);
    } catch (e) {
      console.warn('Falha ao buscar estados:', e?.message || e);
    }
  };

  const fetchRanking = async () => {
    setLoading(true);
    setError('');
    try {
      const params = { period: selectedPeriod };
      if (selectedState && selectedState !== 'all') params.state = selectedState;
      const res = await apiClient.get('/politicians/ranking', { params });
      const data = res?.data?.rankings ?? res?.data?.data ?? null;
      const list = Array.isArray(data) ? data : [];
      setRanking(list);
    } catch (e) {
      setError(e?.response?.data?.error || e?.message || 'Erro ao carregar ranking');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStates();
  }, []);

  useEffect(() => {
    fetchRanking();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedState, selectedPeriod]);

  const headerTitle = useMemo(() => {
    const periodLabel = periodOptions.find(p => p.value === selectedPeriod)?.label || 'Período';
    const stateLabel = selectedState === 'all' ? 'Brasil' : selectedState;
    return `Ranking de Políticos — ${periodLabel} · ${stateLabel}`;
  }, [selectedPeriod, selectedState]);

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold text-gray-800 flex items-center gap-2">
          <TrendingUp className="w-6 h-6 text-primary-600" />
          {headerTitle}
        </h1>
        <div className="flex gap-3">
          <select
            className="border rounded-md px-3 py-2 text-sm"
            value={selectedPeriod}
            onChange={e => setSelectedPeriod(e.target.value)}
          >
            {periodOptions.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
          <select
            className="border rounded-md px-3 py-2 text-sm"
            value={selectedState}
            onChange={e => setSelectedState(e.target.value)}
          >
            <option value="all">Todos os estados</option>
            {states.map(st => (
              <option key={st} value={st}>{st}</option>
            ))}
          </select>
        </div>
      </div>

      {loading && (
        <div className="flex items-center justify-center py-10 text-gray-600">Carregando ranking...</div>
      )}
      {error && (
        <div className="bg-red-50 text-red-700 border border-red-200 rounded-md p-4 mb-4">{error}</div>
      )}

      {!loading && !error && (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full">
            <thead>
              <tr className="bg-gray-50 text-left text-gray-600">
                <th className="px-4 py-3">#</th>
                <th className="px-4 py-3">Político</th>
                <th className="px-4 py-3">Cargo</th>
                <th className="px-4 py-3">Estado</th>
                <th className="px-4 py-3">Mensagens</th>
                <th className="px-4 py-3">Votos</th>
                <th className="px-4 py-3">Média</th>
                <th className="px-4 py-3">Atividade</th>
              </tr>
            </thead>
            <tbody>
              {ranking.length === 0 && (
                <tr>
                  <td className="px-4 py-8 text-center text-gray-500" colSpan={8}>
                    Nenhum político encontrado para os filtros selecionados.
                  </td>
                </tr>
              )}
              {ranking.map((item, idx) => {
                const politician = item.politician || item;
                const name = politician.name || politician.full_name || '—';
                const state = politician.state || '—';
                const position = politician.position || politician.office || '—';
                const messages = item.messages_count ?? 0;
                const votes = item.total_votes ?? 0;
                const avg = (item.average_rating ?? politician.average_rating ?? 0).toFixed(1);
                const score = (item.activity_score ?? 0).toFixed(2);

                return (
                  <tr key={politician.id || idx} className="border-t hover:bg-gray-50">
                    <td className="px-4 py-3 w-12 text-gray-700">{idx + 1}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        {politician.photo_url ? (
                          <img src={politician.photo_url} alt={name} className="w-10 h-10 rounded-full object-cover" />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center text-gray-600">
                            {name.charAt(0).toUpperCase()}
                          </div>
                        )}
                        <div>
                          <div className="font-medium text-gray-800">{name}</div>
                          <div className="text-sm text-gray-500">{politician.party || 'Sem partido'}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-700">{position}</td>
                    <td className="px-4 py-3 text-gray-700">{state}</td>
                    <td className="px-4 py-3 text-gray-700">
                      <div className="flex items-center gap-2">
                        <MessageSquare className="w-4 h-4 text-blue-600" />
                        {messages}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-700">{votes}</td>
                    <td className="px-4 py-3 text-gray-700">
                      <div className="flex items-center gap-2">
                        <Star className="w-4 h-4 text-yellow-500" />
                        {avg}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-700">{score}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}