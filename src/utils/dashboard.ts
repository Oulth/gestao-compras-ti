import type {
  Compra,
  DashboardData,
  MonthlyTotal,
  CategoryTotal,
  TopSupplier,
  UpcomingWarranty,
} from '../types';

const MONTH_LABELS = [
  'Jan',
  'Fev',
  'Mar',
  'Abr',
  'Mai',
  'Jun',
  'Jul',
  'Ago',
  'Set',
  'Out',
  'Nov',
  'Dez',
];

export function calculateDashboardData(
  compras: Compra[],
  ano: number
): DashboardData {
  const anoStr = String(ano);
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonthIdx = now.getMonth(); // 0-indexed

  // Filtrar compras pertencentes ao ano selecionado
  const comprasDoAno = compras.filter((c) => {
    if (!c.data_compra) return false;
    return c.data_compra.startsWith(anoStr);
  });

  // 1. Total no Ano
  const totalAno = comprasDoAno.reduce((acc, curr) => acc + (Number(curr.valor) || 0), 0);

  // 2. Total no Mês Atual
  // Se o ano selecionado for o ano corrente, soma o mês corrente.
  // Se for outro ano, considera o último mês com movimentação ou 0.
  let totalMesAtual = 0;
  if (ano === currentYear) {
    const prefixMesAtual = `${anoStr}-${String(currentMonthIdx + 1).padStart(2, '0')}`;
    totalMesAtual = comprasDoAno
      .filter((c) => c.data_compra && c.data_compra.startsWith(prefixMesAtual))
      .reduce((acc, curr) => acc + (Number(curr.valor) || 0), 0);
  } else {
    // Para anos passados/futuros, pega o total de dezembro ou média
    const prefixUltimoMes = `${anoStr}-12`;
    totalMesAtual = comprasDoAno
      .filter((c) => c.data_compra && c.data_compra.startsWith(prefixUltimoMes))
      .reduce((acc, curr) => acc + (Number(curr.valor) || 0), 0);
  }

  // 3. Média Mensal (base anual / 12)
  const mediaMensal = totalAno > 0 ? totalAno / 12 : 0;

  // 4. Totais Mensais (12 meses)
  const monthlyTotals: MonthlyTotal[] = MONTH_LABELS.map((mes, idx) => {
    const monthNumber = String(idx + 1).padStart(2, '0');
    const monthPrefix = `${anoStr}-${monthNumber}`;

    const itemsDoMes = comprasDoAno.filter(
      (c) => c.data_compra && c.data_compra.startsWith(monthPrefix)
    );

    let mesTotal = 0;
    let produtos = 0;
    let servicos = 0;

    for (const item of itemsDoMes) {
      const val = Number(item.valor) || 0;
      mesTotal += val;
      if (item.tipo === 'Produto') {
        produtos += val;
      } else {
        servicos += val;
      }
    }

    return {
      mes,
      total: mesTotal,
      produtos,
      servicos,
    };
  });

  // 5. Despesas por Categoria
  const categoryMap = new Map<string, number>();
  for (const item of comprasDoAno) {
    const cat = item.categoria?.trim() || 'Outros';
    const val = Number(item.valor) || 0;
    categoryMap.set(cat, (categoryMap.get(cat) || 0) + val);
  }

  const categoryTotals: CategoryTotal[] = Array.from(categoryMap.entries())
    .map(([categoria, total]) => ({
      categoria,
      total,
      percent: totalAno > 0 ? (total / totalAno) * 100 : 0,
    }))
    .sort((a, b) => b.total - a.total);

  // 6. Principais Fornecedores (Top Suppliers)
  const supplierMap = new Map<string, { total: number; cnpj: string | null }>();
  for (const item of comprasDoAno) {
    const fornecedor = item.fornecedor?.trim() || 'Fornecedor não informado';
    const val = Number(item.valor) || 0;
    const existing = supplierMap.get(fornecedor);

    if (existing) {
      existing.total += val;
      if (!existing.cnpj && item.cnpj) {
        existing.cnpj = item.cnpj;
      }
    } else {
      supplierMap.set(fornecedor, {
        total: val,
        cnpj: item.cnpj || null,
      });
    }
  }

  const topSuppliers: TopSupplier[] = Array.from(supplierMap.entries())
    .map(([fornecedor, data]) => ({
      fornecedor,
      cnpj: data.cnpj,
      total: data.total,
      percent: totalAno > 0 ? (data.total / totalAno) * 100 : 0,
    }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 5);

  // 7. Garantias / Licenças vencendo em até 60 dias (verificar em todas as compras ativas)
  const todayMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const upcomingWarranties: UpcomingWarranty[] = [];

  for (const item of compras) {
    if (!item.garantia) continue;

    // Normalizar data de garantia (YYYY-MM-DD)
    const gDateStr = item.garantia.split('T')[0];
    const parts = gDateStr.split('-');
    if (parts.length !== 3) continue;

    const gDate = new Date(
      parseInt(parts[0], 10),
      parseInt(parts[1], 10) - 1,
      parseInt(parts[2], 10)
    );

    if (isNaN(gDate.getTime())) continue;

    const diffMs = gDate.getTime() - todayMidnight.getTime();
    const diasRestantes = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

    // Considera garantias que vencem nos próximos 60 dias (inclui vencidas recentemente nos últimos 15 dias para alerta crítico)
    if (diasRestantes >= -15 && diasRestantes <= 60) {
      upcomingWarranties.push({
        id: item.id,
        fornecedor: item.fornecedor,
        descricao: item.descricao,
        garantia: gDateStr,
        diasRestantes,
      });
    }
  }

  upcomingWarranties.sort((a, b) => a.diasRestantes - b.diasRestantes);

  return {
    totalAno,
    totalMesAtual,
    mediaMensal,
    garantiasVencendoCount: upcomingWarranties.length,
    monthlyTotals,
    categoryTotals,
    topSuppliers,
    upcomingWarranties,
  };
}
