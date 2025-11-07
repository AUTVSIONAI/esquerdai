import React, { useState, useEffect } from 'react';
import { 
  Search, 
  Filter, 
  MoreVertical, 
  Edit, 
  Ban, 
  Mail, 
  Phone, 
  MapPin, 
  Calendar,
  Crown,
  Shield,
  User,
  Download,
  Plus,
  Eye,
  Trash2,
  Loader2
} from 'lucide-react';
import { AdminService } from '../../../services/admin';

const UserManagement = () => {
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedPlan, setSelectedPlan] = useState('all')
  const [selectedStatus, setSelectedStatus] = useState('all')
  const [showUserModal, setShowUserModal] = useState(false)
  const [selectedUser, setSelectedUser] = useState(null)
  const [showActions, setShowActions] = useState(null)
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [showEditModal, setShowEditModal] = useState(false)
  const [editingUser, setEditingUser] = useState(null)
  const [isUpdating, setIsUpdating] = useState(false)
  const [stats, setStats] = useState({ total: 0, active: 0, premium: 0, banned: 0 })
  const [isCreatingNewUser, setIsCreatingNewUser] = useState(false)
  const [modalFeedback, setModalFeedback] = useState(null)

  // Admin access management state
  const [adminPermissions, setAdminPermissions] = useState([])
  const [adminForm, setAdminForm] = useState({
    hasAdmin: false,
    isAdminEnabled: false,
    role: 'support',
    department: '',
    permissions: [],
    loadingAdminMeta: false,
    userType: 'cidadao',
  })

  const handleAdminFormChange = (field, value) => setAdminForm(prev => ({ ...prev, [field]: value }))

  const toggleAdminPermission = (permId) => {
    setAdminForm(prev => {
      const next = new Set(prev.permissions || [])
      if (next.has(permId)) next.delete(permId)
      else next.add(permId)
      return { ...prev, permissions: Array.from(next) }
    })
  }

  const ROLE_MAPPING = {
    politico: 'politico',
    partido: 'partido',
    jornalista: 'jornalista',
    cidadao: null,
  }

  const TYPE_DESCRIPTIONS = {
    politico: 'Acessa dados de interação do público, avaliações, sugestões e pode editar o prompt do agente.',
    partido: 'Acompanha desempenho dos políticos do partido, eventos e análises agregadas.',
    jornalista: 'Consulta e modera conteúdo, acessa análises e material para pautas.',
    cidadao: 'Acesso padrão sem privilégios administrativos.',
  }

  const buildPermissionsForType = (type, allPerms) => {
    const perms = Array.isArray(allPerms) ? allPerms : []
    const pick = (predicate) => perms.filter(predicate).map(p => p.id || p.name).filter(Boolean)
    switch (type) {
      case 'politico': {
        const analyticsRead = pick(p => p.resource === 'analytics' && (p.action === 'read'))
        const aiManage = pick(p => p.resource === 'ai' && (p.action === 'manage' || p.action === 'update'))
        const usersRead = pick(p => p.resource === 'users' && (p.action === 'read'))
        return Array.from(new Set([...analyticsRead, ...aiManage, ...usersRead]))
      }
      case 'partido': {
        const analyticsRead = pick(p => p.resource === 'analytics' && (p.action === 'read'))
        const eventsManage = pick(p => p.resource === 'events' && (['manage','create','update'].includes(p.action)))
        const contentManage = pick(p => p.resource === 'content' && (p.action === 'manage'))
        return Array.from(new Set([...analyticsRead, ...eventsManage, ...contentManage]))
      }
      case 'jornalista': {
        const contentModerate = pick(p => p.resource === 'content' && (p.action === 'moderate' || p.action === 'read'))
        const analyticsRead = pick(p => p.resource === 'analytics' && (p.action === 'read'))
        return Array.from(new Set([...contentModerate, ...analyticsRead]))
      }
      default:
        return []
    }
  }

  const handleUserTypeChange = (type) => {
    const resolvedType = type || 'cidadao'
    const mappedRole = ROLE_MAPPING[resolvedType]
    const enabled = resolvedType !== 'cidadao'
    const autoPerms = enabled ? buildPermissionsForType(resolvedType, adminPermissions) : []
    setAdminForm(prev => ({
      ...prev,
      userType: resolvedType,
      isAdminEnabled: enabled,
      role: mappedRole || prev.role || 'politico',
      permissions: autoPerms
    }))
  }

  // Função para carregar usuários
  const loadUsers = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const filters = {};
      if (selectedPlan !== 'all') filters.plan = selectedPlan;
      if (selectedStatus !== 'all') filters.status = selectedStatus;
      if (searchTerm) filters.search = searchTerm;
      
      const response = await AdminService.getUsers(filters);
      const list = Array.isArray(response) ? response : (response?.users ?? response?.data?.users ?? []);
      const normalized = Array.isArray(list) ? list : [];
      setUsers(normalized);
      return normalized;
    } catch (err) {
      setError('Erro ao carregar usuários');
      console.error('Erro ao carregar usuários:', err);
    } finally {
      setLoading(false);
    }
  };

  // Função para carregar estatísticas reais (com fallback local)
  const loadStats = async (listParam) => {
    try {
      const ds = await AdminService.getDashboardStats();
      const u = ds?.users || {};
      const baseUsers = Array.isArray(listParam) ? listParam : users;
      const activeCount = u.active_month ?? u.active_week ?? u.active_today ?? baseUsers.filter(x => x.status === 'active').length;
      const premiumCount = (u.by_plan && typeof u.by_plan === 'object') ? (u.by_plan.premium ?? 0) : baseUsers.filter(x => x.plan === 'premium').length;
      const bannedCount = baseUsers.filter(x => x.status === 'banned').length;
      const totalCount = u.total ?? baseUsers.length;
      setStats({ total: totalCount, active: activeCount, premium: premiumCount, banned: bannedCount });
    } catch (err) {
      const baseUsers = Array.isArray(listParam) ? listParam : users;
      setStats({
        total: baseUsers.length,
        active: baseUsers.filter(u => u.status === 'active').length,
        premium: baseUsers.filter(u => u.plan === 'premium').length,
        banned: baseUsers.filter(u => u.status === 'banned').length
      })
    }
  }

  // Carregar usuários ao montar e, em seguida, estatísticas
  useEffect(() => {
    (async () => {
      const list = await loadUsers();
      await loadStats(list);
    })();
  }, []);

  // Recarregar quando filtros mudarem
  useEffect(() => {
    const timeoutId = setTimeout(async () => {
      const list = await loadUsers();
      await loadStats(list);
    }, 500); // Debounce de 500ms
    
    return () => clearTimeout(timeoutId);
  }, [selectedPlan, selectedStatus, searchTerm]);

  // Carregar permissões e dados admin ao abrir modal de edição
  useEffect(() => {
    if (showEditModal && editingUser?.id) {
      (async () => {
        setAdminForm(p => ({ ...p, loadingAdminMeta: true }));
        try {
          const [permsRes, adminRes] = await Promise.allSettled([
            AdminService.getPermissions(),
            AdminService.getAdminUser(editingUser.id),
          ]);

          if (permsRes.status === 'fulfilled' && Array.isArray(permsRes.value)) {
            setAdminPermissions(permsRes.value);
          } else {
            setAdminPermissions([]);
          }

          if (adminRes.status === 'fulfilled' && adminRes.value) {
            const a = adminRes.value;
            handleAdminFormChange('hasAdmin', true);
            handleAdminFormChange('isAdminEnabled', a?.is_active !== false);
            const mappedType = a?.role === 'moderator' ? 'jornalista' : a?.role === 'admin' ? 'partido' : a?.role === 'support' ? 'politico' : a?.role || 'cidadao';
            handleAdminFormChange('userType', mappedType);
            handleAdminFormChange('role', a?.role || 'politico');
            handleAdminFormChange('department', a?.department || '');
            const perms = Array.isArray(a?.permissions)
              ? a.permissions.map(p => (typeof p === 'string' ? p : p?.id)).filter(Boolean)
              : [];
            handleAdminFormChange('permissions', perms);
          } else {
            handleAdminFormChange('hasAdmin', false);
            handleAdminFormChange('isAdminEnabled', false);
            handleAdminFormChange('userType', 'cidadao');
            handleAdminFormChange('role', 'support');
            handleAdminFormChange('department', '');
            handleAdminFormChange('permissions', []);
          }
        } catch (e) {
          handleAdminFormChange('hasAdmin', false);
          handleAdminFormChange('isAdminEnabled', false);
        } finally {
          setAdminForm(p => ({ ...p, loadingAdminMeta: false }));
        }
      })();
    }
  }, [showEditModal, editingUser?.id]);



  const getPlanBadge = (plan) => {
    const badges = {
      gratuito: { color: 'bg-gray-100 text-gray-800', icon: User, label: 'Gratuito' },
      engajado: { color: 'bg-blue-100 text-blue-800', icon: Shield, label: 'Engajado' },
      premium: { color: 'bg-yellow-100 text-yellow-800', icon: Crown, label: 'Premium' }
    }
    return badges[plan] || badges.gratuito
  }

  const getStatusBadge = (status) => {
    const badges = {
      active: { color: 'bg-green-100 text-green-800', label: 'Ativo' },
      inactive: { color: 'bg-gray-100 text-gray-800', label: 'Inativo' },
      banned: { color: 'bg-red-100 text-red-800', label: 'Banido' }
    }
    return badges[status] || badges.active
  }

  const filteredUsers = users.filter(user => {
    const matchesSearch = (user.full_name?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
                         (user.email?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
                         (user.username?.toLowerCase() || '').includes(searchTerm.toLowerCase())
    const matchesPlan = selectedPlan === 'all' || user.plan === selectedPlan
    const matchesStatus = selectedStatus === 'all' || user.status === selectedStatus
    
    return matchesSearch && matchesPlan && matchesStatus
  })

  const handleViewUser = (user) => {
    setSelectedUser(user)
    setShowUserModal(true)
  }

  const handleCreateNewUser = async () => {
    setIsCreatingNewUser(true)
    setModalFeedback(null)
    setEditingUser({
      id: null,
      full_name: '',
      username: '',
      email: '',
      plan: 'gratuito',
      city: '',
      state: ''
    })
    setAdminForm({
      hasAdmin: false,
      isAdminEnabled: false,
      role: 'support',
      department: '',
      permissions: [],
      loadingAdminMeta: true,
      userType: 'cidadao',
    })
    setShowEditModal(true)
    try {
      const perms = await AdminService.getPermissions().catch(() => [])
      setAdminPermissions(Array.isArray(perms) ? perms : [])
    } finally {
      setAdminForm((p) => ({ ...p, loadingAdminMeta: false }))
      setIsCreatingNewUser(false)
    }
  }

  const handleEditUser = (user) => {
    setEditingUser({
      id: user.id,
      full_name: user.full_name || '',
      username: user.username || '',
      email: user.email || '',
      plan: user.plan || 'gratuito',
      city: user.city || '',
      state: user.state || ''
    })
    setShowEditModal(true)
    setShowActions(null)
  }

  const handleUpdateUser = async (e) => {
    e.preventDefault()
    
    if (!editingUser.full_name || !editingUser.email) {
      alert('Nome e email são obrigatórios')
      return
    }

    try {
      setIsUpdating(true)

      let targetUserId = editingUser.id
      const isNew = !editingUser.id
      const shouldEnableAdmin = adminForm.isAdminEnabled && adminForm.userType !== 'cidadao'

      if (targetUserId) {
        await AdminService.updateUser(editingUser.id, {
          full_name: editingUser.full_name,
          username: editingUser.username,
          email: editingUser.email,
          city: editingUser.city,
          state: editingUser.state,
          plan: editingUser.plan
        })
      } else {
        // Criação de novo usuário, incluindo metadados administrativos se habilitado
        const payload = {
          full_name: editingUser.full_name,
          username: editingUser.username || undefined,
          email: editingUser.email,
          city: editingUser.city || undefined,
          state: editingUser.state || undefined,
          plan: editingUser.plan || 'gratuito'
        }
        if (shouldEnableAdmin) {
          Object.assign(payload, {
            role: adminForm.role,
            department: adminForm.department || undefined,
            permissions: adminForm.permissions || [],
            is_active: true,
          })
        }
        const created = await AdminService.createUser(payload)
        targetUserId = created?.id || created?.user?.id || created?.data?.id
        if (!targetUserId) {
          try {
            const found = await AdminService.getUsers({ search: editingUser.email, limit: 1 })
            const list = Array.isArray(found) ? found : (found?.users ?? found?.data?.users ?? [])
            if (Array.isArray(list) && list.length > 0) {
              targetUserId = list[0].id
            }
          } catch {}
        }
      }

      // Aplicar acesso administrativo apenas para usuários existentes
      // Para novos usuários, já aplicamos na criação quando habilitado
      try {
        if (!isNew) {
          if (shouldEnableAdmin && targetUserId) {
            if (adminForm.hasAdmin) {
              await AdminService.updateAdminUser(targetUserId, {
                role: adminForm.role,
                department: adminForm.department || undefined,
                permissions: adminForm.permissions || [],
                is_active: true,
              })
            } else {
              await AdminService.createAdminUser({
                user_id: targetUserId,
                role: adminForm.role,
                department: adminForm.department || undefined,
                permissions: adminForm.permissions || [],
              })
            }
          } else if (adminForm.hasAdmin && targetUserId) {
            await AdminService.updateAdminUser(targetUserId, { is_active: false })
          }
        }
      } catch (adminErr) {
        console.error('Erro ao aplicar acesso admin:', adminErr)
      }
      
      // Atualizar a lista de usuários
      await loadUsers()
      
      setModalFeedback({ type: 'success', message: editingUser.id ? 'Usuário atualizado com sucesso!' : 'Usuário criado com sucesso!' })
      // Fecha modal após pequeno delay para o usuário ver o feedback
      setTimeout(() => {
        setShowEditModal(false)
        setEditingUser(null)
        setModalFeedback(null)
      }, 800)
    } catch (err) {
      console.error('Erro ao salvar usuário:', err)
      setModalFeedback({ type: 'error', message: 'Erro ao salvar usuário. Tente novamente.' })
    } finally {
      setIsUpdating(false)
    }
  }

  const handleEditInputChange = (field, value) => {
    setEditingUser(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const handleBanUser = async (user) => {
    if (window.confirm(`Tem certeza que deseja banir o usuário ${user.full_name || user.email}?`)) {
      try {
        setShowActions(null) // Fechar menu imediatamente
        await AdminService.banUser(user.id)
        
        // Atualizar o usuário localmente primeiro para feedback imediato
        setUsers(prevUsers => 
          prevUsers.map(u => 
            u.id === user.id 
              ? { ...u, status: 'banned', banned: true }
              : u
          )
        )
        
        // Recarregar lista completa
        await loadUsers()
        alert('Usuário banido com sucesso!')
      } catch (error) {
        console.error('Erro ao banir usuário:', error)
        alert('Erro ao banir usuário. Tente novamente.')
        // Recarregar lista em caso de erro para garantir consistência
        await loadUsers()
      }
    }
  }

  const handleDeleteUser = async (user) => {
    if (window.confirm(`Tem certeza que deseja excluir permanentemente o usuário ${user.full_name || user.email}? Esta ação não pode ser desfeita.`)) {
      try {
        setShowActions(null) // Fechar menu imediatamente
        await AdminService.deleteUser(user.id)
        
        // Remover usuário localmente primeiro para feedback imediato
        setUsers(prevUsers => prevUsers.filter(u => u.id !== user.id))
        
        // Recarregar lista completa
        await loadUsers()
        alert('Usuário excluído com sucesso!')
      } catch (error) {
        console.error('Erro ao excluir usuário:', error)
        alert('Erro ao excluir usuário. Tente novamente.')
        // Recarregar lista em caso de erro para garantir consistência
        await loadUsers()
      }
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Gerenciamento de Usuários</h2>
          <p className="text-gray-600">Gerencie todos os usuários da plataforma</p>
        </div>
        <div className="mt-4 sm:mt-0 flex space-x-3">
          <button className="btn-secondary flex items-center">
            <Download className="h-4 w-4 mr-2" />
            Exportar
          </button>
          <button className="btn-primary flex items-center" onClick={handleCreateNewUser} disabled={isCreatingNewUser}>
            {isCreatingNewUser ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Plus className="h-4 w-4 mr-2" />
            )}
            {isCreatingNewUser ? 'Abrindo...' : 'Novo Usuário'}
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total de Usuários</p>
              <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
            </div>
            <User className="h-8 w-8 text-blue-500" />
          </div>
        </div>
        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Usuários Ativos</p>
              <p className="text-2xl font-bold text-gray-900">
                {stats.active}
              </p>
            </div>
            <Shield className="h-8 w-8 text-green-500" />
          </div>
        </div>
        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Usuários Premium</p>
              <p className="text-2xl font-bold text-gray-900">
                {stats.premium}
              </p>
            </div>
            <Crown className="h-8 w-8 text-yellow-500" />
          </div>
        </div>
        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Usuários Banidos</p>
              <p className="text-2xl font-bold text-gray-900">
                {stats.banned}
              </p>
            </div>
            <Ban className="h-8 w-8 text-red-500" />
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="card">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0 lg:space-x-4">
          {/* Search */}
          <div className="flex-1 max-w-md">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar usuários..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-progressive-500 focus:border-progressive-500"
              />
            </div>
          </div>

          {/* Filters */}
          <div className="flex space-x-4">
            <select
              value={selectedPlan}
              onChange={(e) => setSelectedPlan(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-progressive-500 focus:border-progressive-500"
            >
              <option value="all">Todos os Planos</option>
              <option value="gratuito">Gratuito</option>
              <option value="engajado">Engajado</option>
              <option value="premium">Premium</option>
            </select>

            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-progressive-500 focus:border-progressive-500"
            >
              <option value="all">Todos os Status</option>
              <option value="active">Ativo</option>
              <option value="inactive">Inativo</option>
              <option value="banned">Banido</option>
            </select>
          </div>
        </div>
      </div>

      {/* Users Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Usuário
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Contato
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Plano
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Atividade
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Estatísticas
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Ações
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading && (
                <tr>
                  <td colSpan="7" className="px-6 py-12 text-center">
                    <div className="flex items-center justify-center">
                      <Loader2 className="h-6 w-6 animate-spin text-progressive-600 mr-2" />
                      <span className="text-gray-500">Carregando usuários...</span>
                    </div>
                  </td>
                </tr>
              )}
              {!loading && error && (
                <tr>
                  <td colSpan="7" className="px-6 py-12 text-center">
                    <div className="text-red-600">
                      <p className="mb-2">{error}</p>
                      <button
                        onClick={loadUsers}
                        className="btn-primary"
                      >
                        Tentar Novamente
                      </button>
                    </div>
                  </td>
                </tr>
              )}
              {!loading && !error && filteredUsers.length === 0 && (
                <tr>
                  <td colSpan="7" className="px-6 py-12 text-center text-gray-500">
                    Nenhum usuário encontrado
                  </td>
                </tr>
              )}
              {!loading && !error && filteredUsers.length > 0 && filteredUsers.map((user) => {
                const planBadge = getPlanBadge(user.plan)
                const statusBadge = getStatusBadge(user.status)
                const PlanIcon = planBadge.icon

                return (
                  <tr key={user.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="w-10 h-10 bg-progressive-100 rounded-full flex items-center justify-center">
                          <span className="text-progressive-600 font-medium text-sm">
                            {(user.full_name || user.email || 'U').charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">{user.full_name || 'Nome não informado'}</div>
                          <div className="text-sm text-gray-500">@{user.username || 'username'}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900 flex items-center">
                        <Mail className="h-4 w-4 mr-1 text-gray-400" />
                        {user.email || 'Email não informado'}
                      </div>
                      <div className="text-sm text-gray-500 flex items-center mt-1">
                        <MapPin className="h-4 w-4 mr-1 text-gray-400" />
                        {user.city && user.state ? `${user.city}, ${user.state}` : 'Localização não informada'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${planBadge.color}`}>
                        <PlanIcon className="h-3 w-3 mr-1" />
                        {planBadge.label}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${statusBadge.color}`}>
                        {statusBadge.label}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <div>Entrou: {user.created_at ? new Date(user.created_at).toLocaleDateString('pt-BR') : 'Data não informada'}</div>
                      <div>Último acesso: {user.last_login ? new Date(user.last_login).toLocaleDateString('pt-BR') : 'Nunca'}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <div>{user.points || 0} pontos</div>
                      <div>{user.stats?.checkins || 0} check-ins</div>
                      <div>{user.stats?.conversations || 0} conversas IA</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="relative">
                        <button
                          onClick={() => setShowActions(showActions === user.id ? null : user.id)}
                          className="text-gray-400 hover:text-gray-600"
                        >
                          <MoreVertical className="h-5 w-5" />
                        </button>
                        
                        {showActions === user.id && (
                          <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg z-10 border border-gray-200">
                            <div className="py-1">
                              <button
                                onClick={() => handleViewUser(user)}
                                className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                              >
                                <Eye className="h-4 w-4 mr-3" />
                                Ver Detalhes
                              </button>
                              <button
                                onClick={() => handleEditUser(user)}
                                className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                              >
                                <Edit className="h-4 w-4 mr-3" />
                                Editar
                              </button>
                              {user.status !== 'banned' && (
                                <button
                                  onClick={() => handleBanUser(user)}
                                  className="flex items-center w-full px-4 py-2 text-sm text-red-700 hover:bg-red-50"
                                >
                                  <Ban className="h-4 w-4 mr-3" />
                                  Banir
                                </button>
                              )}
                              <button
                                onClick={() => handleDeleteUser(user)}
                                className="flex items-center w-full px-4 py-2 text-sm text-red-700 hover:bg-red-50"
                              >
                                <Trash2 className="h-4 w-4 mr-3" />
                                Excluir
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* User Details Modal */}
      {showUserModal && selectedUser && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-11/12 md:w-3/4 lg:w-1/2 shadow-lg rounded-md bg-white">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Detalhes do Usuário</h3>
              <button
                onClick={() => setShowUserModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                ×
              </button>
            </div>
            
            <div className="space-y-4">
              <div className="flex items-center space-x-4">
                <div className="w-16 h-16 bg-progressive-100 rounded-full flex items-center justify-center">
                  <span className="text-progressive-600 font-bold text-xl">
                    {(selectedUser.full_name || selectedUser.email || 'U').charAt(0).toUpperCase()}
                  </span>
                </div>
                <div>
                  <h4 className="text-xl font-semibold text-gray-900">{selectedUser.full_name || 'Nome não informado'}</h4>
                  <p className="text-gray-600">@{selectedUser.username || 'username'}</p>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Email</label>
                  <p className="text-sm text-gray-900">{selectedUser.email || 'Email não informado'}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Telefone</label>
                  <p className="text-sm text-gray-900">{selectedUser.phone || 'Telefone não informado'}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Localização</label>
                  <p className="text-sm text-gray-900">{selectedUser.location || 'Localização não informada'}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Data de Cadastro</label>
                  <p className="text-sm text-gray-900">
                    {selectedUser.joinDate ? new Date(selectedUser.joinDate).toLocaleDateString('pt-BR') : 'Data não informada'}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Pontos</label>
                  <p className="text-sm text-gray-900">{selectedUser.points || 0}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Check-ins</label>
                  <p className="text-sm text-gray-900">{selectedUser.checkins || 0}</p>
                </div>
              </div>
            </div>
            
            <div className="mt-6 flex justify-end space-x-3">
              <button
                onClick={() => setShowUserModal(false)}
                className="btn-secondary"
              >
                Fechar
              </button>
              <button className="btn-primary">
                Editar Usuário
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit User Modal */}
      {showEditModal && editingUser && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-11/12 md:w-3/4 lg:w-1/2 shadow-lg rounded-md bg-white">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">{editingUser?.id ? 'Editar Usuário' : 'Novo Usuário'}</h3>
              <button
                onClick={() => {
                  setShowEditModal(false)
                  setEditingUser(null)
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                ×
              </button>
            </div>

            {modalFeedback && (
              <div className={`mb-4 p-3 rounded-md border ${modalFeedback.type === 'error' ? 'border-red-300 bg-red-50 text-red-700' : 'border-green-300 bg-green-50 text-green-700'}`}>
                {modalFeedback.message}
              </div>
            )}
            
            <form onSubmit={handleUpdateUser} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Nome Completo</label>
                  <input
                    type="text"
                    value={editingUser.full_name}
                    onChange={(e) => handleEditInputChange('full_name', e.target.value)}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-progressive-500 focus:border-progressive-500"
                    placeholder="Nome completo do usuário"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">Nome de Usuário</label>
                  <input
                    type="text"
                    value={editingUser.username}
                    onChange={(e) => handleEditInputChange('username', e.target.value)}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-progressive-500 focus:border-progressive-500"
                    placeholder="Nome de usuário"
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700">Email</label>
                <input
                  type="email"
                  value={editingUser.email}
                  onChange={(e) => handleEditInputChange('email', e.target.value)}
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-progressive-500 focus:border-progressive-500"
                  placeholder="Email do usuário"
                  required
                />
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Cidade</label>
                  <input
                    type="text"
                    value={editingUser.city}
                    onChange={(e) => handleEditInputChange('city', e.target.value)}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-progressive-500 focus:border-progressive-500"
                    placeholder="Cidade"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">Estado</label>
                  <input
                    type="text"
                    value={editingUser.state}
                    onChange={(e) => handleEditInputChange('state', e.target.value)}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-progressive-500 focus:border-progressive-500"
                    placeholder="Estado"
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700">Plano</label>
                <select
                  value={editingUser.plan}
                  onChange={(e) => handleEditInputChange('plan', e.target.value)}
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-progressive-500 focus:border-progressive-500"
                >
                  <option value="gratuito">Gratuito</option>
                  <option value="engajado">Engajado</option>
                  <option value="premium">Premium</option>
                </select>
              </div>

              {/* Admin Access Section */}
              <div className="mt-6 border-t pt-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-medium text-gray-900">Acesso Administrativo</h4>
                    <p className="text-xs text-gray-500">Conceda ou ajuste acesso administrativo para este usuário.</p>
                  </div>
                  <label className="inline-flex items-center gap-2">
                    <span className="text-sm">Ativo</span>
                    <input
                      type="checkbox"
                      className="h-4 w-4"
                      checked={!!adminForm.isAdminEnabled}
                      onChange={(e) => handleAdminFormChange('isAdminEnabled', e.target.checked)}
                    />
                  </label>
                </div>

                <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Tipo de Usuário</label>
                    <select
                      className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-progressive-500 focus:border-progressive-500"
                      value={adminForm.userType}
                      onChange={(e) => handleUserTypeChange(e.target.value)}
                    >
                      <option value="cidadao">Cidadão comum</option>
                      <option value="politico">Político</option>
                      <option value="partido">Partido Político</option>
                      <option value="jornalista">Jornalista</option>
                    </select>
                    <p className="mt-1 text-xs text-gray-500">{TYPE_DESCRIPTIONS[adminForm.userType]}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Papel administrativo (interno)</label>
                    <select
                      className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-progressive-500 focus:border-progressive-500"
                      disabled={true}
                      value={adminForm.role}
                      onChange={(e) => handleAdminFormChange('role', e.target.value)}
                    >
                      <option value="super_admin">Super Admin</option>
                      <option value="admin">Admin</option>
                      <option value="moderator">Moderador</option>
                      <option value="support">Suporte</option>
                    </select>
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Departamento (opcional)</label>
                    <input
                      type="text"
                      className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-progressive-500 focus:border-progressive-500"
                      disabled={!adminForm.isAdminEnabled}
                      value={adminForm.department}
                      onChange={(e) => handleAdminFormChange('department', e.target.value)}
                    />
                  </div>
                </div>

                <div className="mt-4">
                  <label className="block text-sm font-medium text-gray-700">Permissões</label>
                  <div className="mt-2 max-h-48 overflow-auto border rounded-md p-2">
                    {adminForm.loadingAdminMeta ? (
                      <div className="py-6 text-center text-sm text-gray-500">Carregando permissões…</div>
                    ) : adminPermissions.length === 0 ? (
                      <div className="py-6 text-center text-sm text-gray-500">Nenhuma permissão disponível.</div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        {adminPermissions.map((perm) => (
                          <label key={perm.id || perm.name} className="flex items-start gap-2 p-1 rounded hover:bg-gray-50">
                            <input
                              type="checkbox"
                              className="mt-1"
                              disabled={!adminForm.isAdminEnabled}
                              checked={adminForm.permissions?.includes(perm.id || perm.name)}
                              onChange={() => toggleAdminPermission(perm.id || perm.name)}
                            />
                            <span>
                              <span className="block text-sm font-medium">{perm.name}</span>
                              {perm.description && <span className="block text-xs text-gray-500">{perm.description}</span>}
                            </span>
                          </label>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
              
              <div className="mt-6 flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowEditModal(false)
                    setEditingUser(null)
                  }}
                  className="btn-secondary"
                  disabled={isUpdating}
                >
                  Cancelar
                </button>
                <button 
                  type="submit"
                  className="btn-primary flex items-center"
                  disabled={isUpdating}
                >
                  {isUpdating ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Salvando...
                    </>
                  ) : (
                    'Salvar Alterações'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default UserManagement