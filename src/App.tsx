import { useState, useEffect, useCallback, useMemo } from 'react';
import { Toaster, toast } from 'sonner';
import { Navbar, type TabType } from './components/Navbar';
import { KPICards } from './components/KPICards';
import { DashboardView } from './components/DashboardView';
import { ComprasView } from './components/ComprasView';
import { CompraModal } from './components/CompraModal';
import { RelatoriosView } from './components/RelatoriosView';
import { InventarioView } from './components/InventarioView';
import { EquipamentoModal } from './components/EquipamentoModal';
import { TermoResponsabilidadeModal } from './components/TermoResponsabilidadeModal';
import { EtiquetasModal } from './components/EtiquetasModal';
import { GerarEquipamentoCompraModal } from './components/GerarEquipamentoCompraModal';
import { getCompras, deleteCompra, saveCompra } from './services/compras';
import {
  getEquipamentos,
  saveEquipamento,
  deleteEquipamento,
} from './services/equipamentos';
import { supabase } from './services/supabase';
import { calculateDashboardData } from './utils/dashboard';
import type {
  Compra,
  CompraInput,
  DashboardData,
  Equipamento,
  EquipamentoInput,
} from './types';

export default function App() {
  const [abaAtiva, setAbaAtiva] = useState<TabType>('dashboard');
  const [anoSelecionado, setAnoSelecionado] = useState<number>(2026);
  const [compras, setCompras] = useState<Compra[]>([]);
  const [equipamentos, setEquipamentos] = useState<Equipamento[]>([]);
  const [isCarregando, setIsCarregando] = useState<boolean>(true);
  const [isRealtimeConnected, setIsRealtimeConnected] = useState<boolean>(false);

  // Estados dos modais de Compras
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [compraEmEdicao, setCompraEmEdicao] = useState<Compra | null>(null);

  // Estados dos modais de Inventário
  const [compraParaGerarEquipamento, setCompraParaGerarEquipamento] = useState<Compra | null>(null);
  const [isEquipamentoModalOpen, setIsEquipamentoModalOpen] = useState<boolean>(false);
  const [equipamentoEmEdicao, setEquipamentoEmEdicao] = useState<Equipamento | null>(null);
  const [isTermoModalOpen, setIsTermoModalOpen] = useState<boolean>(false);
  const [equipamentoTermo, setEquipamentoTermo] = useState<Equipamento | null>(null);
  const [isEtiquetasModalOpen, setIsEtiquetasModalOpen] = useState<boolean>(false);
  const [equipamentoEtiquetas, setEquipamentoEtiquetas] = useState<Equipamento | null>(null);

  // Carrega compras e equipamentos do Supabase
  const carregarDados = useCallback(async (mostrarLoading: boolean = true) => {
    if (mostrarLoading) {
      setIsCarregando(true);
    }
    try {
      const [comprasData, equipamentosData] = await Promise.all([
        getCompras(),
        getEquipamentos(),
      ]);
      setCompras(comprasData);
      setEquipamentos(equipamentosData);
    } catch (error: any) {
      console.error('Erro ao carregar dados:', error);
      toast.error('Erro ao sincronizar com o Supabase. Verifique a conexão.');
    } finally {
      if (mostrarLoading) {
        setIsCarregando(false);
      }
    }
  }, []);

  useEffect(() => {
    // Carregamento inicial de dados
    carregarDados(true);

    // Supabase Realtime subscription na tabela public:compras
    const comprasChannel = supabase
      .channel('public:compras')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'compras' },
        (payload) => {
          console.log('[Supabase Realtime] Alteração na tabela compras:', payload);
          carregarDados(false);
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          setIsRealtimeConnected(true);
        } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
          setIsRealtimeConnected(false);
        }
      });

    // Supabase Realtime subscription na tabela public:equipamentos
    const equipamentosChannel = supabase
      .channel('public:equipamentos')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'equipamentos' },
        (payload) => {
          console.log('[Supabase Realtime] Alteração na tabela equipamentos:', payload);
          carregarDados(false);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(comprasChannel);
      supabase.removeChannel(equipamentosChannel);
    };
  }, [carregarDados]);

  // Anos disponíveis computados dinamicamente
  const anosDisponiveis = useMemo(() => {
    const anosSet = new Set<number>([2026, 2025, 2024]);
    compras.forEach((c) => {
      if (c.data_compra) {
        const ano = parseInt(c.data_compra.slice(0, 4), 10);
        if (!isNaN(ano)) anosSet.add(ano);
      }
    });
    return Array.from(anosSet).sort((a, b) => b - a);
  }, [compras]);

  // Sugestão do próximo código de patrimônio
  const proximoPatrimonioSugerido = useMemo(() => {
    if (equipamentos.length === 0) return 'PAT-001';
    let maior = 0;
    equipamentos.forEach((e) => {
      const match = e.patrimonio.match(/\d+/);
      if (match) {
        const num = parseInt(match[0], 10);
        if (num > maior) maior = num;
      }
    });
    return `PAT-${String(maior + 1).padStart(3, '0')}`;
  }, [equipamentos]);

  // Métricas calculadas para o Dashboard
  const dashboardData: DashboardData = useMemo(() => {
    return calculateDashboardData(compras, anoSelecionado);
  }, [compras, anoSelecionado]);

  // Handlers de Compras
  const handleNovaCompra = () => {
    setCompraEmEdicao(null);
    setIsModalOpen(true);
  };

  const handleEditarCompra = (compra: Compra) => {
    setCompraEmEdicao(compra);
    setIsModalOpen(true);
  };

  const handleEditarPorId = (id: string) => {
    const compra = compras.find((c) => c.id === id);
    if (compra) {
      handleEditarCompra(compra);
    }
  };

  const handleDuplicarCompra = (compra: Compra) => {
    // Clona os dados da compra removendo IDs antigos e resetando a data para hoje
    const { id: _oldId, criado_em: _c, atualizado_em: _a, ...resto } = compra;
    setCompraEmEdicao({
      ...resto,
      id: '',
      data_compra: new Date().toISOString().split('T')[0],
      link_nf: '',
      nome_arquivo_nf: '',
    } as any);
    setIsModalOpen(true);
    toast.info('Lançamento duplicado com a data de hoje. Ajuste o valor se necessário e confirme.');
  };

  const handleFecharModal = () => {
    setIsModalOpen(false);
    setCompraEmEdicao(null);
  };

  const handleSalvarCompra = async (
    dados: CompraInput | Compra | CompraInput[],
    adicionarInventario?: boolean
  ) => {
    const res = await saveCompra(dados);
    await carregarDados(false);
    if (adicionarInventario) {
      const compraCriada = Array.isArray(res) ? res[0] : res;
      if (compraCriada) {
        setCompraParaGerarEquipamento(compraCriada);
      }
    }
  };

  const handleExcluirCompra = async (id: string) => {
    await deleteCompra(id);
    await carregarDados(false);
  };

  // Handlers de Inventário
  const handleNovoEquipamento = () => {
    setEquipamentoEmEdicao(null);
    setIsEquipamentoModalOpen(true);
  };

  const handleEditarEquipamento = (eq: Equipamento) => {
    setEquipamentoEmEdicao(eq);
    setIsEquipamentoModalOpen(true);
  };

  const handleSalvarEquipamento = async (dados: EquipamentoInput | Equipamento) => {
    await saveEquipamento(dados);
    await carregarDados(false);
  };

  const handleExcluirEquipamento = async (id: string) => {
    await deleteEquipamento(id);
    toast.success('Equipamento excluído com sucesso.');
    await carregarDados(false);
  };

  const handleAbrirTermo = (eq: Equipamento) => {
    setEquipamentoTermo(eq);
    setIsTermoModalOpen(true);
  };

  const handleAbrirEtiquetas = (eq?: Equipamento) => {
    setEquipamentoEtiquetas(eq || null);
    setIsEtiquetasModalOpen(true);
  };

  const handleRecarregar = () => {
    carregarDados(true);
    toast.info('Dados sincronizados com o Supabase.');
  };

  return (
    <div className="min-h-screen bg-slate-50/60 flex flex-col font-sans text-slate-800 antialiased selection:bg-blue-600 selection:text-white">
      <Toaster position="top-right" richColors />

      {/* Barra sutil de carregamento / sincronização no topo */}
      {isCarregando && (
        <div className="w-full bg-blue-100/50 h-0.5 overflow-hidden fixed top-0 left-0 right-0 z-50">
          <div className="h-full bg-blue-600 animate-pulse w-full" />
        </div>
      )}

      {/* Navbar Superior Institucional */}
      <div className="no-print">
        <Navbar
          abaAtiva={abaAtiva}
          onMudarAba={setAbaAtiva}
          anoSelecionado={anoSelecionado}
          anosDisponiveis={anosDisponiveis}
          onMudarAno={setAnoSelecionado}
          onRecarregar={handleRecarregar}
          isCarregando={isCarregando}
          onNovaCompra={handleNovaCompra}
          isRealtimeConnected={isRealtimeConnected}
        />
      </div>

      {/* Conteúdo Principal */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {abaAtiva === 'dashboard' && (
          <div>
            {/* KPI Cards de Indicadores */}
            <KPICards
              totalAno={dashboardData.totalAno}
              ano={anoSelecionado}
              totalMesAtual={dashboardData.totalMesAtual}
              mediaMensal={dashboardData.mediaMensal}
              garantiasVencendoCount={dashboardData.garantiasVencendoCount}
              isCarregando={isCarregando}
            />

            {/* Visão de Gráficos e Painéis do Dashboard */}
            <DashboardView
              ano={anoSelecionado}
              data={dashboardData}
              isCarregando={isCarregando}
              onEditarPorId={handleEditarPorId}
            />
          </div>
        )}

        {abaAtiva === 'compras' && (
          <ComprasView
            compras={compras}
            isCarregando={isCarregando}
            anoSelecionado={anoSelecionado}
            onNovaCompra={handleNovaCompra}
            onEditarCompra={handleEditarCompra}
            onDuplicarCompra={handleDuplicarCompra}
            onExcluirCompra={handleExcluirCompra}
            onGerarEquipamento={(compra) => setCompraParaGerarEquipamento(compra)}
          />
        )}

        {abaAtiva === 'relatorios' && (
          <RelatoriosView
            compras={compras}
            ano={anoSelecionado}
            anosDisponiveis={anosDisponiveis}
            onMudarAno={setAnoSelecionado}
          />
        )}

        {abaAtiva === 'inventario' && (
          <InventarioView
            equipamentos={equipamentos}
            compras={compras}
            onNovoEquipamento={handleNovoEquipamento}
            onEditarEquipamento={handleEditarEquipamento}
            onExcluirEquipamento={handleExcluirEquipamento}
            onAbrirTermo={handleAbrirTermo}
            onAbrirEtiquetas={handleAbrirEtiquetas}
          />
        )}
      </main>

      {/* Rodapé Institucional */}
      <footer className="no-print border-t border-slate-200/80 bg-white py-4 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
          <p>© 2026 Colégio Ágape • Setor de Tecnologia da Informação</p>
          <div className="flex items-center gap-2 sm:gap-3 flex-wrap justify-center">
            <span
              className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium border ${
                isRealtimeConnected
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200/80'
                  : 'bg-amber-50 text-amber-700 border-amber-200/80'
              }`}
            >
              <span
                className={`h-1.5 w-1.5 rounded-full ${
                  isRealtimeConnected ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'
                }`}
              />
              {isRealtimeConnected
                ? 'Sincronização em Tempo Real Ativa'
                : 'Conectando ao Supabase Realtime...'}
            </span>
            <p className="font-mono text-[11px] text-slate-400">
              Ambiente de Produção • Supabase v2 • Recharts
            </p>
          </div>
        </div>
      </footer>

      {/* Modais de Compras */}
      <CompraModal
        isOpen={isModalOpen}
        onClose={handleFecharModal}
        compraEmEdicao={compraEmEdicao}
        onSalvar={handleSalvarCompra}
        comprasExistentes={compras}
      />

      {/* Modais de Inventário de Equipamentos */}
      <EquipamentoModal
        isOpen={isEquipamentoModalOpen}
        onClose={() => setIsEquipamentoModalOpen(false)}
        equipamentoEmEdicao={equipamentoEmEdicao}
        onSalvar={handleSalvarEquipamento}
        compras={compras}
        proximoPatrimonioSugerido={proximoPatrimonioSugerido}
      />

      <TermoResponsabilidadeModal
        isOpen={isTermoModalOpen}
        onClose={() => {
          setIsTermoModalOpen(false);
          setEquipamentoTermo(null);
        }}
        equipamento={equipamentoTermo}
      />

      <EtiquetasModal
        isOpen={isEtiquetasModalOpen}
        onClose={() => {
          setIsEtiquetasModalOpen(false);
          setEquipamentoEtiquetas(null);
        }}
        equipamentos={equipamentos}
        equipamentoSelecionado={equipamentoEtiquetas}
      />

      {/* Modal de Gerar Equipamento a partir da Compra */}
      <GerarEquipamentoCompraModal
        isOpen={!!compraParaGerarEquipamento}
        onClose={() => setCompraParaGerarEquipamento(null)}
        compra={compraParaGerarEquipamento}
        onSalvar={handleSalvarEquipamento}
        proximoPatrimonioSugerido={proximoPatrimonioSugerido}
      />
    </div>
  );
}
