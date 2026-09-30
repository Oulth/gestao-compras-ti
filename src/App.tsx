import { useState, useEffect, useCallback, useMemo } from 'react';
import { Toaster, toast } from 'sonner';
import { Navbar, type TabType } from './components/Navbar';
import { KPICards } from './components/KPICards';
import { DashboardView } from './components/DashboardView';
import { ComprasView } from './components/ComprasView';
import { CompraModal } from './components/CompraModal';
import { RelatoriosView } from './components/RelatoriosView';
import { getCompras, deleteCompra, saveCompra } from './services/compras';
import { calculateDashboardData } from './utils/dashboard';
import type { Compra, CompraInput, DashboardData } from './types';

export default function App() {
  const [abaAtiva, setAbaAtiva] = useState<TabType>('dashboard');
  const [anoSelecionado, setAnoSelecionado] = useState<number>(2026);
  const [compras, setCompras] = useState<Compra[]>([]);
  const [isCarregando, setIsCarregando] = useState<boolean>(true);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [compraEmEdicao, setCompraEmEdicao] = useState<Compra | null>(null);

  // Carrega compras do Supabase
  const carregarDados = useCallback(async () => {
    setIsCarregando(true);
    try {
      // Carregamos todas as compras para permitir análise de garantias e anos
      const data = await getCompras();
      setCompras(data);
    } catch (error: any) {
      console.error('Erro ao carregar dados:', error);
      toast.error('Erro ao carregar dados do Supabase. Verifique a conexão.');
    } finally {
      setIsCarregando(false);
    }
  }, []);

  useEffect(() => {
    carregarDados();
  }, [carregarDados]);

  // Anos disponíveis computados dinamicamente com base nas compras cadastradas + anos padrão
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

  // Métricas calculadas para o Dashboard
  const dashboardData: DashboardData = useMemo(() => {
    return calculateDashboardData(compras, anoSelecionado);
  }, [compras, anoSelecionado]);

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

  const handleFecharModal = () => {
    setIsModalOpen(false);
    setCompraEmEdicao(null);
  };

  const handleSalvarCompra = async (dadosCompra: CompraInput | Compra) => {
    try {
      const resultado = await saveCompra(dadosCompra);
      const isEdit = Boolean('id' in dadosCompra && dadosCompra.id);
      const identificador = resultado.codigo_ti || resultado.descricao || 'Registro';
      toast.success(
        isEdit
          ? `Lançamento atualizado com sucesso! (${identificador})`
          : `Nova compra cadastrada com sucesso! (${identificador})`
      );
      await carregarDados();
    } catch (error: any) {
      console.error('Erro ao salvar compra:', error);
      toast.error(error.message || 'Falha ao salvar lançamento.');
      throw error;
    }
  };

  const handleExcluirCompra = async (id: string) => {
    try {
      await deleteCompra(id);
      toast.success('Compra excluída com sucesso!');
      await carregarDados();
    } catch (error: any) {
      console.error('Erro ao excluir compra:', error);
      toast.error(error.message || 'Falha ao excluir compra.');
      throw error;
    }
  };

  const handleRecarregar = () => {
    toast.promise(carregarDados(), {
      loading: 'Sincronizando com o Supabase...',
      success: 'Dados atualizados com sucesso!',
      error: 'Falha ao sincronizar dados.',
    });
  };

  return (
    <div className="min-h-screen bg-slate-50/70 text-slate-900 flex flex-col font-sans antialiased">
      <Toaster position="top-right" richColors />

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
            onExcluirCompra={handleExcluirCompra}
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
      </main>

      {/* Rodapé Institucional */}
      <footer className="no-print border-t border-slate-200/80 bg-white py-4 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-500">
          <p>© 2026 Colégio Ágape • Setor de Tecnologia da Informação</p>
          <p className="font-mono text-[11px] text-slate-400">
            Ambiente de Produção • Supabase v2 • Recharts
          </p>
        </div>
      </footer>

      {/* Modal de Cadastro / Edição de Compras */}
      <CompraModal
        isOpen={isModalOpen}
        onClose={handleFecharModal}
        compraEmEdicao={compraEmEdicao}
        onSalvar={handleSalvarCompra}
      />
    </div>
  );
}
