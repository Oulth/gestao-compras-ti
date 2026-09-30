import { useState, useEffect, useCallback, useMemo } from 'react';
import { Toaster, toast } from 'sonner';
import { Navbar, type TabType } from './components/Navbar';
import { KPICards } from './components/KPICards';
import { DashboardView } from './components/DashboardView';
import { getCompras } from './services/compras';
import { calculateDashboardData } from './utils/dashboard';
import type { Compra, DashboardData } from './types';
import { ShoppingCart, FileSpreadsheet } from 'lucide-react';

export default function App() {
  const [abaAtiva, setAbaAtiva] = useState<TabType>('dashboard');
  const [anoSelecionado, setAnoSelecionado] = useState<number>(2026);
  const [compras, setCompras] = useState<Compra[]>([]);
  const [isCarregando, setIsCarregando] = useState<boolean>(true);

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
    toast.info('Modal de Nova Compra será integrado na próxima etapa!');
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
            />
          </div>
        )}

        {abaAtiva === 'compras' && (
          <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center shadow-xs">
            <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center mx-auto mb-3">
              <ShoppingCart className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-slate-800">
              Módulo de Compras & Despesas
            </h3>
            <p className="text-sm text-slate-500 mt-1 max-w-md mx-auto">
              A tabela interativa com filtros, paginação, busca e exportação para Excel será ativada no próximo módulo.
            </p>
          </div>
        )}

        {abaAtiva === 'relatorios' && (
          <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center shadow-xs">
            <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center mx-auto mb-3">
              <FileSpreadsheet className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-slate-800">
              Módulo de Relatórios & Exportação
            </h3>
            <p className="text-sm text-slate-500 mt-1 max-w-md mx-auto">
              Emissão de relatórios gerenciais consolidados em PDF e planilhas estruturadas .XLSX.
            </p>
          </div>
        )}
      </main>

      {/* Rodapé Institucional */}
      <footer className="border-t border-slate-200/80 bg-white py-4 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-500">
          <p>© 2026 Colégio Ágape • Setor de Tecnologia da Informação</p>
          <p className="font-mono text-[11px] text-slate-400">
            Ambiente de Produção • Supabase v2 • Recharts
          </p>
        </div>
      </footer>
    </div>
  );
}
