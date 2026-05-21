import React, { useState, useEffect, useMemo } from 'react';
import {
  LayoutDashboard,
  Droplets,
  Thermometer,
  Sprout,
  Wind,
  Activity,
  AlertTriangle,
  Menu,
  Plus,
  LogOut,
  Map,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  UserCheck,
  Building,
  Layers,
  Trash2
} from 'lucide-react';

// --- CONFIGURAÇÃO DAS APIS DO DOCKER ---
const API_URLS = {
  identity: 'http://localhost:5001/api',
  property: 'http://localhost:5002/api',
  ingestion: 'http://localhost:5003/api',
  alert: 'http://localhost:5004/api'
};

const CULTURAS = ['Soja', 'Milho', 'Trigo', 'Algodão', 'Tomate', 'Cana-de-Açúcar'];

const App = () => {
  // --- ESTADOS DE AUTENTICAÇÃO E NAVEGAÇÃO ---
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('agro_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [token, setToken] = useState(() => localStorage.getItem('agro_token') || '');

  const [authForm, setAuthForm] = useState({ email: '', password: '', name: '', isRegister: false });
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  // --- ESTADOS DE DADOS REAIS DAS APIS ---
  const [properties, setProperties] = useState([]);
  const [fields, setFields] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // --- ESTADOS DOS FORMULÁRIOS DE CADASTRO ---
  const [newProperty, setNewProperty] = useState({ name: '', location: '' });
  const [newField, setNewField] = useState({ name: '', cropType: 'Soja', areaHectares: '', propertyId: '' });

  // --- ESTADO DO SIMULADOR IOT (KAFKA PRODUCER) ---
  const [simulationParams, setSimulationParams] = useState({
    fieldId: '',
    soilHumidity: 45.0, // Começa com um valor amigável/saudável
    temperature: 24.0,
    precipitationLevel: 0
  });

  // --- DERIVAÇÃO INTELIGENTE DE ESTADOS (ESTADO REAL VS HISTÓRICO) ---
  const criticalAlertsCount = useMemo(() => {
    // Conta quantos talhões estão ATUALMENTE em alerta de seca (última leitura = alerta)
    let count = 0;
    fields.forEach(field => {
      const fieldAlerts = alerts.filter(a => Number(a.fieldId) === Number(field.id));
      if (fieldAlerts.length > 0) {
        // Ordena para garantir que o primeiro é o mais recente
        const sorted = [...fieldAlerts].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        if (sorted[0].severity === "Alerta de Seca") {
          count++;
        }
      }
    });
    return count;
  }, [alerts, fields]);

  // --- EFEITOS E SINCRO DE DADOS ---
  useEffect(() => {
    if (user) {
      loadAllData();
    }
  }, [user]);

  const loadAllData = async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      // 1. Obter propriedades e respetivos talhões do PropertyService (Porta 5002)
      const propResponse = await fetch(`${API_URLS.property}/Properties`);
      if (propResponse.ok) {
        const props = await propResponse.json();
        setProperties(props);

        // Achatar todos os talhões para exibição no Dashboard principal
        const allFields = props.reduce((acc, current) => {
          const fieldsWithPropName = current.fields.map(f => ({
            ...f,
            propertyName: current.name
          }));
          return [...acc, ...fieldsWithPropName];
        }, []);
        setFields(allFields);

        // Define o primeiro talhão como padrão no simulador
        if (allFields.length > 0 && !simulationParams.fieldId) {
          setSimulationParams(prev => ({ ...prev, fieldId: allFields[0].id }));
        }

        // Define a primeira propriedade como padrão no formulário de talhões
        if (props.length > 0 && !newField.propertyId) {
          setNewField(prev => ({ ...prev, propertyId: props[0].id }));
        }
      } else {
        throw new Error('Falha ao descarregar as propriedades do servidor.');
      }

      // 2. Obter alertas e eventos de telemetria do AlertService (Porta 5004)
      try {
        const alertResponse = await fetch(`${API_URLS.alert}/Alerts`);
        if (alertResponse.ok) {
          const activeAlerts = await alertResponse.json();
          setAlerts(activeAlerts);
        }
      } catch (e) {
        console.warn('O microsserviço de Alertas ainda está em inicialização ou sem CORS ativo.');
      }

    } catch (err) {
      setErrorMsg('Erro na ligação aos microsserviços do Docker. Garanta que o Docker-Compose está ativo.');
    } finally {
      setLoading(false);
    }
  };

  // --- LÓGICA DE LOGIN E REGISTO ---
  const handleAuth = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setLoading(true);

    try {
      if (authForm.isRegister) {
        // Registo de novo utilizador no IdentityService (Porta 5001)
        const response = await fetch(`${API_URLS.identity}/Identity/register`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: authForm.email,
            passwordHash: authForm.password,
            name: authForm.name
          })
        });

        if (response.ok) {
          setSuccessMsg('Registo efetuado com sucesso! Insira os dados para fazer login.');
          setAuthForm({ ...authForm, isRegister: false });
        } else {
          setErrorMsg('Erro ao efetuar o registo. Tente novamente.');
        }
      } else {
        // Autenticação com geração de token JWT físico
        const response = await fetch(`${API_URLS.identity}/Identity/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: authForm.email,
            password: authForm.password
          })
        });

        if (response.ok) {
          const data = await response.json();
          const userData = { email: authForm.email, name: data.user || 'Produtor Cooperado' };

          setUser(userData);
          setToken(data.token);

          localStorage.setItem('agro_user', JSON.stringify(userData));
          localStorage.setItem('agro_token', data.token);
        } else {
          setErrorMsg('Credenciais de acesso incorretas.');
        }
      }
    } catch (err) {
      setErrorMsg('Não foi possível estabelecer ligação com o serviço de autenticação.');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    setUser(null);
    setToken('');
    localStorage.removeItem('agro_user');
    localStorage.removeItem('agro_token');
  };

  // --- CRIAÇÃO DE PROPRIEDADE RURAL ---
  const handleCreateProperty = async (e) => {
    e.preventDefault();
    if (!newProperty.name || !newProperty.location) return;

    setLoading(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const response = await fetch(`${API_URLS.property}/Properties`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newProperty)
      });

      if (response.ok) {
        setSuccessMsg('Propriedade rural registada com sucesso no Postgres!');
        setNewProperty({ name: '', location: '' });
        await loadAllData();
      } else {
        setErrorMsg('Falha ao registar a propriedade.');
      }
    } catch (err) {
      setErrorMsg('Falha na comunicação com o PropertyServiceApi.');
    } finally {
      setLoading(false);
    }
  };

  // --- CRIAÇÃO DE TALHÃO AGRÍCOLA ---
  const handleCreateField = async (e) => {
    e.preventDefault();
    if (!newField.name || !newField.areaHectares || !newField.propertyId) return;

    setLoading(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const response = await fetch(`${API_URLS.property}/Properties/${newField.propertyId}/fields`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newField.name,
          cropType: newField.cropType,
          areaHectares: parseFloat(newField.areaHectares)
        })
      });

      if (response.ok) {
        setSuccessMsg('Novo talhão adicionado com sucesso!');
        setNewField({ ...newField, name: '', areaHectares: '' });
        await loadAllData();
      } else {
        setErrorMsg('Falha ao registar o talhão.');
      }
    } catch (err) {
      setErrorMsg('Falha na ligação com o PropertyServiceApi.');
    } finally {
      setLoading(false);
    }
  };

  // --- ELIMINAÇÃO INDIVIDUAL DE ALERTA DO HISTÓRICO ---
  const handleDeleteAlert = async (id) => {
    setLoading(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const response = await fetch(`${API_URLS.alert}/Alerts/${id}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        setSuccessMsg('Registo de atividade eliminado com sucesso da base de dados!');
        setAlerts(prev => prev.filter(a => a.id !== id));
      } else {
        setErrorMsg('Falha ao eliminar o registo de alerta.');
      }
    } catch (err) {
      setErrorMsg('Erro de rede: Impossível conectar ao serviço de Alertas.');
    } finally {
      setLoading(false);
    }
  };

  // --- LÓGICA DE SIMULAÇÃO DIRETA (QUICK-SIM) POR ID DE TALHÃO ---
  const handleDirectSimulation = async (fieldId, scenario) => {
    setLoading(true);
    setErrorMsg('');
    setSuccessMsg('');

    let payload = {
      fieldId: Number(fieldId),
      soilHumidity: scenario === 'critico' ? 18.5 : 45.0,
      temperature: scenario === 'critico' ? 34.0 : 24.5,
      precipitationLevel: 0
    };

    try {
      const response = await fetch(`${API_URLS.ingestion}/Ingestion/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        const result = await response.json();
        setSuccessMsg(`Telemetria enviada para o Talhão #${fieldId}! Fila Kafka atualizada (Offset: ${result.offset}).`);

        // Sincroniza dados após 2 segundos
        setTimeout(loadAllData, 2000);
      } else {
        setErrorMsg('Erro ao submeter telemetria direta para a API.');
      }
    } catch (err) {
      setErrorMsg('Erro de rede: Impossível conectar ao serviço de Ingestão do Docker.');
    } finally {
      setLoading(false);
    }
  };

  // --- DISPARO DE TELEMETRIA TRADICIONAL PELO FORMULÁRIO ---
  const handleInjestSimulation = async (scenario) => {
    if (!simulationParams.fieldId) {
      setErrorMsg('Por favor, adicione uma propriedade e um talhão primeiro!');
      return;
    }

    setLoading(true);
    setErrorMsg('');
    setSuccessMsg('');

    let payload = { ...simulationParams };

    if (scenario === 'critico') {
      payload.soilHumidity = 18.5; // Disparará "Alerta de Seca"
      payload.temperature = 34.0;
      setSimulationParams(prev => ({ ...prev, soilHumidity: 18.5, temperature: 34.0 }));
    } else if (scenario === 'normal') {
      payload.soilHumidity = 45.0; // Disparará "Informativo" (verde)
      payload.temperature = 24.5;
      setSimulationParams(prev => ({ ...prev, soilHumidity: 45.0, temperature: 24.5 }));
    }

    try {
      const response = await fetch(`${API_URLS.ingestion}/Ingestion/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        const result = await response.json();
        setSuccessMsg(`Leitura processada! Mensagem publicada no Kafka (Offset: ${result.offset}).`);

        // Recarregar os dados após 2 segundos para dar tempo do Kafka ler e atualizar o banco
        setTimeout(loadAllData, 2000);
      } else {
        setErrorMsg('Erro ao submeter telemetria para o IngestionService.');
      }
    } catch (err) {
      setErrorMsg('Erro de rede: Impossível conectar ao serviço de Ingestão do Docker.');
    } finally {
      setLoading(false);
    }
  };

  // --- VIEW: LOGIN / REGISTO ---
  if (!user) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-slate-800 rounded-3xl shadow-2xl p-8 border border-slate-700 text-white">
          <div className="flex flex-col items-center mb-8">
            <div className="bg-emerald-500 p-3 rounded-2xl mb-4 shadow-lg shadow-emerald-500/20">
              <Sprout className="text-white" size={32} />
            </div>
            <h1 className="text-2xl font-bold tracking-tight">AgroSolutions</h1>
            <p className="text-slate-400 text-sm mt-1">Plataforma IoT Integrada à Rede Docker</p>
          </div>

          {errorMsg && (
            <div className="mb-4 p-3 bg-rose-500/10 border border-rose-500/30 text-rose-400 rounded-xl text-xs flex items-center gap-2">
              <AlertCircle size={14} className="shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="mb-4 p-3 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 rounded-xl text-xs flex items-center gap-2">
              <UserCheck size={14} className="shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          <form onSubmit={handleAuth} className="space-y-4">
            {authForm.isRegister && (
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Nome Completo</label>
                <input
                  type="text"
                  required
                  className="w-full bg-slate-700 border border-slate-600 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all text-white"
                  placeholder="Nome do Produtor"
                  value={authForm.name}
                  onChange={e => setAuthForm({ ...authForm, name: e.target.value })}
                />
              </div>
            )}
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">E-mail Corporativo</label>
              <input
                type="email"
                required
                className="w-full bg-slate-700 border border-slate-600 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all text-white"
                placeholder="nome@empresa.com"
                value={authForm.email}
                onChange={e => setAuthForm({ ...authForm, email: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Palavra-passe</label>
              <input
                type="password"
                required
                className="w-full bg-slate-700 border border-slate-600 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all text-white"
                placeholder="••••••••"
                value={authForm.password}
                onChange={e => setAuthForm({ ...authForm, password: e.target.value })}
              />
            </div>
            <button type="submit" disabled={loading} className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold py-3.5 rounded-xl shadow-lg transition-all transform hover:-translate-y-0.5">
              {loading ? 'A processar...' : authForm.isRegister ? 'Criar Conta' : 'Aceder ao Sistema'}
            </button>
          </form>

          <div className="mt-6 text-center">
            <button
              onClick={() => setAuthForm({ ...authForm, isRegister: !authForm.isRegister })}
              className="text-emerald-400 hover:text-emerald-300 text-xs font-semibold transition-colors"
            >
              {authForm.isRegister ? 'Já tem conta? Faça Login' : 'Novo por aqui? Crie uma conta de produtor'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // --- VIEW: CONTEXTO PRINCIPAL ---
  return (
    <div className="flex h-screen bg-slate-50 text-slate-900 overflow-hidden font-sans">
      {/* Sidebar */}
      <aside className={`${isSidebarOpen ? 'w-64' : 'w-20'} bg-slate-900 transition-all duration-300 flex flex-col p-4 z-20`}>
        <div className="flex items-center space-x-3 mb-10 px-2 overflow-hidden">
          <div className="bg-emerald-500 p-2 rounded-lg shrink-0">
            <Sprout className="text-white" size={24} />
          </div>
          <h1 className={`${!isSidebarOpen && 'opacity-0'} text-white font-bold text-xl tracking-tight transition-opacity whitespace-nowrap`}>
            Agro<span className="text-emerald-400">Solutions</span>
          </h1>
        </div>

        <nav className="flex-1 space-y-2">
          {[
            { id: 'dashboard', icon: LayoutDashboard, label: 'Dashboard' },
            { id: 'management', icon: Map, label: 'Propriedades' },
            { id: 'sensors', icon: Activity, label: 'Sensores IoT' },
          ].map(item => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center space-x-3 p-3 rounded-xl transition-all ${activeTab === item.id ? 'bg-emerald-600 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-800'
                }`}
            >
              <item.icon size={20} />
              <span className={`${!isSidebarOpen && 'hidden'} font-medium`}>{item.label}</span>
            </button>
          ))}
        </nav>

        <button
          onClick={handleLogout}
          className="mt-auto flex items-center space-x-3 p-3 text-slate-400 hover:text-rose-400 transition-colors"
        >
          <LogOut size={20} />
          <span className={`${!isSidebarOpen && 'hidden'} font-medium`}>Sair</span>
        </button>
      </aside>

      <main className="flex-1 overflow-y-auto flex flex-col">
        {/* Top Header */}
        <header className="bg-white border-b border-slate-100 p-4 sticky top-0 z-10 flex justify-between items-center shadow-sm">
          <div className="flex items-center gap-4">
            <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-2 hover:bg-slate-50 rounded-lg">
              <Menu size={20} />
            </button>
            <button onClick={loadAllData} className="p-2 hover:bg-slate-50 rounded-lg flex items-center gap-1 text-xs text-slate-500 font-semibold">
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
              <span>Sincronizar APIs</span>
            </button>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right hidden sm:block">
              <p className="text-sm font-bold text-slate-800">{user.name}</p>
              <p className="text-xs text-slate-500">Função: Produtor Agrícola</p>
            </div>
            <div className="w-10 h-10 rounded-full bg-emerald-100 border border-emerald-200 flex items-center justify-center font-bold text-emerald-700">
              {user.name.substring(0, 2).toUpperCase()}
            </div>
          </div>
        </header>

        {/* Notificações e Mensagens */}
        {errorMsg && (
          <div className="m-6 p-4 bg-rose-50 border border-rose-200 text-rose-700 rounded-2xl text-sm flex items-center gap-3 shadow-sm">
            <AlertCircle size={20} className="shrink-0 text-rose-500" />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="m-6 p-4 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-2xl text-sm flex items-center gap-3 shadow-sm">
            <CheckCircle2 size={20} className="shrink-0 text-emerald-500" />
            <span>{successMsg}</span>
          </div>
        )}

        <div className="p-6 max-w-7xl mx-auto w-full space-y-6">

          {/* TAB: DASHBOARD */}
          {activeTab === 'dashboard' && (
            <>
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-bold">Monitorização Integrada</h2>
                  <p className="text-slate-500 text-sm">Controlo de telemetria IoT proveniente da infraestrutura Docker-Kafka.</p>
                </div>
              </div>

              {/* Status Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-slate-500 text-sm font-medium">Talhões Monitorizados</span>
                    <Droplets className="text-blue-500" size={20} />
                  </div>
                  <h3 className="text-3xl font-bold text-slate-800">{fields.length}</h3>
                  <p className="text-xs text-slate-400 mt-2">Registados na base de dados PostgreSQL</p>
                </div>
                <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-slate-500 text-sm font-medium">Métricas Ativas</span>
                    <Wind className="text-cyan-500" size={20} />
                  </div>
                  <h3 className="text-3xl font-bold text-slate-800">04</h3>
                  <p className="text-xs text-emerald-600 mt-2 font-semibold">Expostas para o Prometheus (Porta 9090)</p>
                </div>
                <div className={`bg-white p-6 rounded-2xl shadow-sm border transition-all duration-300 ${criticalAlertsCount > 0 ? 'border-rose-200 bg-rose-50/50 shadow-rose-100/50 shadow-md' : 'border-slate-100'
                  }`}>
                  <div className="flex items-center justify-between mb-2">
                    <span className={`text-sm font-bold ${criticalAlertsCount > 0 ? 'text-rose-700' : 'text-slate-500'}`}>Alertas de Seca Ativos</span>
                    <AlertTriangle className={criticalAlertsCount > 0 ? 'text-rose-500' : 'text-slate-400'} size={20} />
                  </div>
                  <h3 className={`text-3xl font-bold ${criticalAlertsCount > 0 ? 'text-rose-800' : 'text-slate-700'}`}>
                    {criticalAlertsCount.toString().padStart(2, '0')}
                  </h3>
                  <p className="text-xs mt-2">Talhões atualmente hídricos em estado crítico (&lt; 30%)</p>
                </div>
              </div>

              {/* Tabelas de Detalhe e Timeline */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Timeline de Eventos de Telemetria e Alertas */}
                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden lg:col-span-2">
                  <div className="p-4 border-b bg-slate-50 flex justify-between items-center">
                    <h3 className="font-bold text-sm flex items-center gap-2 text-slate-700">
                      <Activity size={16} className="text-emerald-600" />
                      Histórico Físico de Atividades (Base de Dados - Alerts)
                    </h3>
                  </div>
                  <div className="divide-y max-h-96 overflow-y-auto">
                    {alerts.length === 0 ? (
                      <div className="p-8 text-center text-slate-400 text-sm">
                        Nenhuma atividade ou telemetria registada. Utilize o simulador IoT para disparar pacotes.
                      </div>
                    ) : (
                      alerts.map(alert => {
                        const isCritical = alert.severity === "Alerta de Seca";
                        return (
                          <div key={alert.id} className={`p-4 flex items-center justify-between transition-colors ${isCritical ? 'bg-rose-50/30 hover:bg-rose-50/50' : 'bg-emerald-50/10 hover:bg-emerald-50/20'
                            }`}>
                            <div>
                              <p className={`font-bold text-sm ${isCritical ? 'text-rose-950' : 'text-emerald-950'}`}>Talhão ID: {alert.fieldId}</p>
                              <p className="text-xs text-slate-600 font-medium">{alert.message}</p>
                            </div>
                            <div className="flex items-center gap-4 text-right">
                              <div>
                                <span className={`text-[10px] px-2.5 py-1 rounded-full font-bold uppercase tracking-wider ${isCritical ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-700'
                                  }`}>
                                  {alert.severity}
                                </span>
                                <p className="text-[10px] text-slate-400 mt-1">{new Date(alert.createdAt).toLocaleString()}</p>
                              </div>
                              <button
                                onClick={() => handleDeleteAlert(alert.id)}
                                className="text-slate-400 hover:text-rose-500 p-1.5 rounded-lg hover:bg-rose-50 transition-colors"
                                title="Eliminar Alerta"
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>

                {/* Status por Talhão */}
                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                  <div className="p-4 border-b bg-slate-50">
                    <h3 className="font-bold text-sm text-slate-700">Estado Atual dos Campos</h3>
                  </div>
                  <div className="divide-y max-h-96 overflow-y-auto">
                    {fields.length === 0 ? (
                      <div className="p-8 text-center text-slate-400 text-sm">
                        Nenhum talhão registado. Aceda ao menu "Propriedades" para configurar o mapa agrícola.
                      </div>
                    ) : (
                      fields.map(field => {
                        // Garantimos ordenação para capturar o log absoluto mais recente (independentemente de ser alerta ou informativo)
                        const fieldAlerts = alerts.filter(a => Number(a.fieldId) === Number(field.id));
                        const sortedAlerts = [...fieldAlerts].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
                        const lastAlert = sortedAlerts.length > 0 ? sortedAlerts[0] : null;

                        // O talhão só fica vermelho se a ÚLTIMA atividade registada dele for um Alerta de Seca
                        const hasCriticalSeca = lastAlert && lastAlert.severity === "Alerta de Seca";

                        return (
                          <div key={field.id} className="p-4 flex items-center justify-between hover:bg-slate-50/50 transition-colors">
                            <div>
                              <p className="font-bold text-slate-800 text-sm">{field.name}</p>
                              <p className="text-xs text-slate-500">{field.cropType} • {field.areaHectares} ha</p>
                            </div>
                            <div className="flex items-center gap-3">
                              <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider transition-colors duration-300 ${hasCriticalSeca ? 'bg-rose-100 text-rose-700 animate-pulse font-extrabold' : 'bg-emerald-100 text-emerald-700 font-semibold'
                                }`}>
                                {hasCriticalSeca ? 'Seca Detectada' : 'Saudável'}
                              </span>
                              {/* Simulação Rápida e Direta de Telemetria no Talhão */}
                              <div className="flex gap-1">
                                <button
                                  onClick={() => handleDirectSimulation(field.id, 'normal')}
                                  className="p-1 text-emerald-600 hover:bg-emerald-50 rounded border border-emerald-100 transition-colors"
                                  title="Simular Solo Saudável neste talhão"
                                  disabled={loading}
                                >
                                  <Droplets size={14} />
                                </button>
                                <button
                                  onClick={() => handleDirectSimulation(field.id, 'critico')}
                                  className="p-1 text-rose-600 hover:bg-rose-50 rounded border border-rose-100 transition-colors"
                                  title="Simular Seca Crítica neste talhão"
                                  disabled={loading}
                                >
                                  <AlertTriangle size={14} />
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              </div>
            </>
          )}

          {/* TAB: PROPERTIES */}
          {activeTab === 'management' && (
            <div className="space-y-6">

              {/* Formulários de Registo */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                {/* Cadastro de Propriedade */}
                <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-4">
                  <div className="flex items-center gap-2 border-b pb-3 border-slate-100">
                    <Building className="text-emerald-500" size={20} />
                    <h3 className="text-md font-bold text-slate-800">Nova Propriedade Agrícola</h3>
                  </div>
                  <form onSubmit={handleCreateProperty} className="space-y-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Nome da Herdade/Fazenda</label>
                      <input
                        type="text"
                        required
                        placeholder="Ex: Herdade do Vale Verde"
                        className="w-full p-3 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500 text-sm text-slate-800"
                        value={newProperty.name}
                        onChange={e => setNewProperty({ ...newProperty, name: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Localização / Distrito</label>
                      <input
                        type="text"
                        required
                        placeholder="Ex: Beja, Portugal"
                        className="w-full p-3 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500 text-sm text-slate-800"
                        value={newProperty.location}
                        onChange={e => setNewProperty({ ...newProperty, location: e.target.value })}
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold py-3 rounded-xl transition-all shadow-md flex items-center justify-center gap-2 text-sm"
                    >
                      <Plus size={16} />
                      <span>Registar Propriedade</span>
                    </button>
                  </form>
                </div>

                {/* Cadastro de Talhão */}
                <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-4">
                  <div className="flex items-center gap-2 border-b pb-3 border-slate-100">
                    <Layers className="text-emerald-500" size={20} />
                    <h3 className="text-md font-bold text-slate-800">Novo Talhão / Parcela</h3>
                  </div>
                  <form onSubmit={handleCreateField} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Nome do Talhão</label>
                        <input
                          type="text"
                          required
                          placeholder="Ex: Zona Norte - Soja"
                          className="w-full p-3 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500 text-sm text-slate-800"
                          value={newField.name}
                          onChange={e => setNewField({ ...newField, name: e.target.value })}
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Herdade de Destino</label>
                        <select
                          className="w-full p-3 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500 text-sm text-slate-800"
                          value={newField.propertyId}
                          onChange={e => setNewField({ ...newField, propertyId: e.target.value })}
                        >
                          {properties.length === 0 && <option>Sem propriedades criadas</option>}
                          {properties.map(p => (
                            <option key={p.id} value={p.id}>{p.name}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Cultura Agrícola</label>
                        <select
                          className="w-full p-3 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500 text-sm text-slate-800"
                          value={newField.cropType}
                          onChange={e => setNewField({ ...newField, cropType: e.target.value })}
                        >
                          {CULTURAS.map(c => (
                            <option key={c} value={c}>{c}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Área (Hectares)</label>
                        <input
                          type="number"
                          required
                          step="0.1"
                          placeholder="Ex: 24.5"
                          className="w-full p-3 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500 text-sm text-slate-800"
                          value={newField.areaHectares}
                          onChange={e => setNewField({ ...newField, areaHectares: e.target.value })}
                        />
                      </div>
                    </div>
                    <button
                      type="submit"
                      disabled={loading || properties.length === 0}
                      className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold py-3 rounded-xl transition-all shadow-md flex items-center justify-center gap-2 text-sm"
                    >
                      <Plus size={16} />
                      <span>Adicionar Talhão</span>
                    </button>
                  </form>
                </div>
              </div>

              {/* Grid das Propriedades Cadastradas */}
              <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
                <h3 className="text-lg font-bold mb-4 text-slate-800">Áreas de Cultivo Ativas (Postgres - Property DB)</h3>

                {properties.length === 0 ? (
                  <div className="p-8 text-center text-slate-400 text-sm">
                    Nenhuma herdade ou talhão registado no sistema. Utilize os formulários acima para começar.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-6">
                    {properties.map(prop => (
                      <div key={prop.id} className="bg-slate-55 rounded-2xl border border-slate-100 overflow-hidden">
                        <div className="p-4 bg-slate-100 flex justify-between items-center border-b border-slate-200">
                          <div>
                            <h4 className="font-bold text-slate-800 text-md">{prop.name}</h4>
                            <p className="text-xs text-slate-500">{prop.location}</p>
                          </div>
                          <span className="text-xs bg-slate-200 px-3 py-1 rounded-full font-mono text-slate-600 font-bold">Herdade #{prop.id}</span>
                        </div>
                        <div className="p-0">
                          <table className="w-full text-left">
                            <thead className="bg-slate-50 text-slate-400 text-[10px] uppercase font-bold tracking-widest">
                              <tr>
                                <th className="px-6 py-3">ID Físico</th>
                                <th className="px-6 py-3">Nome do Talhão</th>
                                <th className="px-6 py-3">Cultura Alvo</th>
                                <th className="px-6 py-3">Área de Cultivo</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y bg-white">
                              {prop.fields && prop.fields.length === 0 ? (
                                <tr>
                                  <td colSpan="4" className="px-6 py-4 text-center text-xs text-slate-400">Esta herdade ainda não possui talhões de plantio.</td>
                                </tr>
                              ) : (
                                prop.fields.map(field => (
                                  <tr key={field.id} className="hover:bg-slate-50 transition-colors">
                                    <td className="px-6 py-3 text-xs font-mono text-slate-400">#{field.id}</td>
                                    <td className="px-6 py-3 font-bold text-sm text-slate-700">{field.name}</td>
                                    <td className="px-6 py-3 text-sm text-slate-600">
                                      <span className="flex items-center gap-2">
                                        <div className="w-2 h-2 rounded-full bg-emerald-400"></div>
                                        {field.cropType}
                                      </span>
                                    </td>
                                    <td className="px-6 py-3 text-sm text-slate-600">{field.areaHectares} Hectares</td>
                                  </tr>
                                ))
                              )}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB: SENSORES IOT (SIMULADOR) */}
          {activeTab === 'sensors' && (
            <div className="max-w-2xl mx-auto space-y-6">
              <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-xl">
                <div className="text-center mb-6">
                  <div className="bg-cyan-100 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <Activity className="text-cyan-600 animate-pulse" size={32} />
                  </div>
                  <h2 className="text-2xl font-bold text-slate-800">Painel do Simulador IoT</h2>
                  <p className="text-slate-500 mt-2 text-sm">Dispare pacotes de telemetria diretamente contra o Docker Broker do Kafka. O ecossistema de microsserviços gerenciará o fluxo asssíncrono.</p>
                </div>

                <div className="space-y-6">
                  {/* Seletor do Talhão Alvo */}
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Talhão Agrícola Alvo</label>
                    <select
                      className="w-full p-3 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-emerald-500 text-sm text-slate-800 font-medium"
                      value={simulationParams.fieldId}
                      onChange={e => setSimulationParams({ ...simulationParams, fieldId: parseInt(e.target.value) })}
                    >
                      {fields.length === 0 && <option>Nenhum talhão cadastrado no sistema</option>}
                      {fields.map(f => (
                        <option key={f.id} value={f.id}>{f.name} (Propriedade: {f.propertyName})</option>
                      ))}
                    </select>
                  </div>

                  {/* AJUSTES MANUAIS DE SENSORES */}
                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 space-y-4">
                    <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Ajuste Fino de Telemetria Manual</h4>
                    <div className="space-y-4">
                      <div>
                        <div className="flex justify-between text-xs font-semibold text-slate-600 mb-1">
                          <span>Humidade do Solo</span>
                          <span className="text-emerald-600 font-bold">{simulationParams.soilHumidity}%</span>
                        </div>
                        <input
                          type="range"
                          min="5"
                          max="95"
                          step="0.5"
                          className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                          value={simulationParams.soilHumidity}
                          onChange={e => setSimulationParams({ ...simulationParams, soilHumidity: parseFloat(e.target.value) })}
                        />
                      </div>
                      <div>
                        <div className="flex justify-between text-xs font-semibold text-slate-600 mb-1">
                          <span>Temperatura Ambiente</span>
                          <span className="text-cyan-600 font-bold">{simulationParams.temperature}°C</span>
                        </div>
                        <input
                          type="range"
                          min="10"
                          max="45"
                          step="0.5"
                          className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-cyan-500"
                          value={simulationParams.temperature}
                          onChange={e => setSimulationParams({ ...simulationParams, temperature: parseFloat(e.target.value) })}
                        />
                      </div>
                    </div>
                    <button
                      onClick={() => handleInjestSimulation('custom')}
                      disabled={fields.length === 0 || loading}
                      className="w-full bg-cyan-600 hover:bg-cyan-500 text-white font-bold py-3 rounded-xl transition-all shadow-md flex items-center justify-center gap-2 text-sm"
                    >
                      <Activity size={16} />
                      <span>Enviar Telemetria Customizada</span>
                    </button>
                  </div>

                  {/* Corpo da Requisição Visual */}
                  <div className="p-4 bg-slate-900 rounded-2xl border border-slate-800 text-slate-300 font-mono text-xs shadow-inner">
                    <div className="flex justify-between items-center mb-2 text-slate-500 border-b border-slate-800 pb-2">
                      <span>POST http://localhost:5003/api/Ingestion/send</span>
                      <span className="bg-emerald-500/10 text-emerald-400 px-1.5 py-0.5 rounded text-[10px] font-bold">JSON</span>
                    </div>
                    {`{
  "fieldId": ${simulationParams.fieldId || 0},
  "soilHumidity": ${simulationParams.soilHumidity},
  "temperature": ${simulationParams.temperature},
  "precipitationLevel": ${simulationParams.precipitationLevel}
}`}
                  </div>

                  {/* Disparo de Telemetrias Rápidas */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <button
                      onClick={() => handleInjestSimulation('normal')}
                      disabled={fields.length === 0 || loading}
                      className="p-4 border-2 border-emerald-100 disabled:opacity-50 rounded-2xl hover:bg-emerald-50/50 transition-all flex flex-col items-center text-center gap-2 group shadow-sm"
                    >
                      <CheckCircle2 size={24} className="text-emerald-500 group-hover:scale-110 transition-transform" />
                      <div>
                        <span className="text-xs font-bold text-slate-800 block">Cenário Saudável</span>
                        <span className="text-[10px] text-slate-400 block mt-0.5">Força Humidade: 45% (Gera Log Verde)</span>
                      </div>
                    </button>
                    <button
                      onClick={() => handleInjestSimulation('critico')}
                      disabled={fields.length === 0 || loading}
                      className="p-4 border-2 border-rose-100 disabled:opacity-50 rounded-2xl hover:bg-rose-50/50 transition-all flex flex-col items-center text-center gap-2 group shadow-sm"
                    >
                      <AlertTriangle size={24} className="text-rose-500 group-hover:scale-110 transition-transform animate-bounce-slow" />
                      <div>
                        <span className="text-xs font-bold text-rose-800 block">Cenário Crítico</span>
                        <span className="text-[10px] text-slate-400 block mt-0.5">Força Humidade: 18.5% (Gera Alerta Vermelho)</span>
                      </div>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

        </div>
      </main>
    </div>
  );
};

export default App;