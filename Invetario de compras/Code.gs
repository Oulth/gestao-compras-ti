/**
 * SISTEMA DE GESTÃO DE COMPRAS E DESPESAS DE T.I
 * Colégio Ágape - gestao.ti@colegioagape.com.br
 *
 * Backend Google Apps Script
 */

const SHEET_NAME_COMPRAS = 'Compras';
const SHEET_NAME_CONFIG = 'Configuracoes';
const FOLDER_NAME_NFS = 'Gestão TI - Notas Fiscais e Comprovantes';

/**
 * Ponto de entrada do Web App
 */
function doGet() {
  return HtmlService.createTemplateFromFile('Index')
    .evaluate()
    .setTitle('Gestão de Compras T.I - Colégio Ágape')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1, shrink-to-fit=no')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

/**
 * Inclui arquivos parciais no HTML (CSS, JS)
 */
function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

/**
 * Inicializa a estrutura da planilha caso ainda não exista
 */
function setupDatabase() {
  const ss = SpreadsheetApp.getActiveSpreadsheet() || SpreadsheetApp.create('Gestão de Compras T.I - Colégio Ágape');
  
  // 1. Aba de Compras
  let sheetCompras = ss.getSheetByName(SHEET_NAME_COMPRAS);
  if (!sheetCompras) {
    sheetCompras = ss.insertSheet(SHEET_NAME_COMPRAS);
    const headers = [
      'ID',
      'Data da Compra',
      'Tipo',
      'Fornecedor',
      'CNPJ',
      'Descrição do Item / Serviço',
      'Categoria',
      'Centro de Custo',
      'Valor (R$)',
      'Forma de Pagamento',
      'Status Pagamento',
      'Parcelas / Vencimento',
      'Garantia / Renovação',
      'Link da NF / Anexo',
      'Observações',
      'Criado em',
      'Criado por'
    ];
    sheetCompras.getRange(1, 1, 1, headers.length).setValues([headers]);
    sheetCompras.getRange(1, 1, 1, headers.length)
      .setBackground('#1e293b')
      .setFontColor('#ffffff')
      .setFontWeight('bold')
      .setHorizontalAlignment('center');
    sheetCompras.setFrozenRows(1);
    
    // Formatação da coluna de valor
    sheetCompras.getRange(2, 9, 1000, 1).setNumberFormat('R$ #,##0.00');
    // Formatação de data
    sheetCompras.getRange(2, 2, 1000, 1).setNumberFormat('dd/mm/yyyy');
  }

  // 2. Aba de Configurações
  let sheetConfig = ss.getSheetByName(SHEET_NAME_CONFIG);
  if (!sheetConfig) {
    sheetConfig = ss.insertSheet(SHEET_NAME_CONFIG);
    sheetConfig.getRange('A1:D1').setValues([['Categorias', 'Centros de Custo', 'Formas de Pagamento', 'Configurações do Sistema']]);
    sheetConfig.getRange('A1:D1').setBackground('#334155').setFontColor('#ffffff').setFontWeight('bold');
    
    const categorias = [
      ['Hardware (PCs, Notebooks, Servidores)'],
      ['Software & Licenças (SaaS, SO, Antivírus)'],
      ['Redes & Conectividade (Switches, Roteadores, Cabos)'],
      ['Impressoras & Suprimentos (Toners, Peças)'],
      ['Suporte & Serviços Especializados'],
      ['Telefonia & Comunicação'],
      ['Acessórios & Periféricos'],
      ['Outros']
    ];
    sheetConfig.getRange(2, 1, categorias.length, 1).setValues(categorias);

    const centros = [
      ['T.I - Infraestrutura'],
      ['T.I - Sistemas & Licenças'],
      ['T.I - Pedagógico / Laboratórios'],
      ['T.I - Administrativo / Secretaria'],
      ['T.I - Câmeras / CFTV'],
      ['Geral']
    ];
    sheetConfig.getRange(2, 2, centros.length, 1).setValues(centros);

    const pagamentos = [
      ['PIX'],
      ['Boleto Bancário'],
      ['Cartão de Crédito Corporativo'],
      ['Faturamento 30 Dias'],
      ['Transferência Bancária (TED/DOC)'],
      ['Outro']
    ];
    sheetConfig.getRange(2, 3, pagamentos.length, 1).setValues(pagamentos);
  }

  // 3. Pasta no Google Drive para Anexos
  getOrCreateNfFolder();

  return {
    spreadsheetUrl: ss.getUrl(),
    status: 'success',
    message: 'Estrutura inicializada com sucesso!'
  };
}

/**
 * Obtém ou cria a pasta no Google Drive para salvar Notas Fiscais
 */
function getOrCreateNfFolder() {
  const folders = DriveApp.getFoldersByName(FOLDER_NAME_NFS);
  if (folders.hasNext()) {
    return folders.next();
  }
  return DriveApp.createFolder(FOLDER_NAME_NFS);
}

/**
 * Retorna as configurações auxiliares (Categorias, Centros de Custo, Formas de Pgto)
 */
function getAppSettings() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  if (!ss) return getDefaultSettings();

  const configSheet = ss.getSheetByName(SHEET_NAME_CONFIG);
  if (!configSheet) return getDefaultSettings();

  const getColumnData = (colIndex) => {
    const lastRow = configSheet.getLastRow();
    if (lastRow < 2) return [];
    const values = configSheet.getRange(2, colIndex, lastRow - 1, 1).getValues();
    return values.map(r => r[0]).filter(v => v !== '');
  };

  return {
    categories: getColumnData(1),
    costCenters: getColumnData(2),
    paymentMethods: getColumnData(3),
    types: ['Produto', 'Serviço', 'Assinatura Recorrente (SaaS)', 'Contrato Mensal'],
    statuses: ['Pago', 'Pendente', 'Parcelado', 'Cancelado']
  };
}

function getDefaultSettings() {
  return {
    categories: [
      'Hardware (PCs, Notebooks, Servidores)',
      'Software & Licenças (SaaS, SO, Antivírus)',
      'Redes & Conectividade (Switches, Roteadores, Cabos)',
      'Impressoras & Suprimentos (Toners, Peças)',
      'Suporte & Serviços Especializados',
      'Telefonia & Comunicação',
      'Acessórios & Periféricos',
      'Outros'
    ],
    costCenters: [
      'T.I - Infraestrutura',
      'T.I - Sistemas & Licenças',
      'T.I - Pedagógico / Laboratórios',
      'T.I - Administrativo / Secretaria',
      'T.I - Câmeras / CFTV',
      'Geral'
    ],
    paymentMethods: [
      'PIX',
      'Boleto Bancário',
      'Cartão de Crédito Corporativo',
      'Faturamento 30 Dias',
      'Transferência Bancária (TED/DOC)',
      'Outro'
    ],
    types: ['Produto', 'Serviço', 'Assinatura Recorrente (SaaS)', 'Contrato Mensal'],
    statuses: ['Pago', 'Pendente', 'Parcelado', 'Cancelado']
  };
}

/**
 * Obtém todas as compras cadastradas
 */
function getAllPurchases() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  if (!ss) return [];
  const sheet = ss.getSheetByName(SHEET_NAME_COMPRAS);
  if (!sheet) return [];

  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return [];

  const data = sheet.getRange(2, 1, lastRow - 1, 17).getValues();
  
  return data.map((row, index) => {
    let dateStr = '';
    if (row[1] instanceof Date) {
      dateStr = Utilities.formatDate(row[1], Session.getScriptTimeZone(), 'yyyy-MM-dd');
    } else if (row[1]) {
      dateStr = String(row[1]);
    }

    let warrantyStr = '';
    if (row[12] instanceof Date) {
      warrantyStr = Utilities.formatDate(row[12], Session.getScriptTimeZone(), 'yyyy-MM-dd');
    } else if (row[12]) {
      warrantyStr = String(row[12]);
    }

    return {
      rowIndex: index + 2,
      id: String(row[0]),
      dataCompra: dateStr,
      tipo: String(row[2] || ''),
      fornecedor: String(row[3] || ''),
      cnpj: String(row[4] || ''),
      descricao: String(row[5] || ''),
      categoria: String(row[6] || ''),
      centroCusto: String(row[7] || ''),
      valor: Number(row[8]) || 0,
      formaPagamento: String(row[9] || ''),
      statusPagamento: String(row[10] || 'Pago'),
      parcelas: String(row[11] || ''),
      garantia: warrantyStr,
      linkNf: String(row[13] || ''),
      observacoes: String(row[14] || ''),
      criadoEm: String(row[15] || ''),
      criadoPor: String(row[16] || '')
    };
  });
}

/**
 * Salva ou Atualiza uma compra
 */
function savePurchase(purchase) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let sheet = ss.getSheetByName(SHEET_NAME_COMPRAS);
    if (!sheet) {
      setupDatabase();
      sheet = ss.getSheetByName(SHEET_NAME_COMPRAS);
    }

    const userEmail = Session.getActiveUser().getEmail() || 'gestao.ti@colegioagape.com.br';
    const now = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'dd/MM/yyyy HH:mm');

    const id = purchase.id || ('TI-' + new Date().getTime());
    const rowData = [
      id,
      purchase.dataCompra ? new Date(purchase.dataCompra + 'T12:00:00') : new Date(),
      purchase.tipo || 'Produto',
      purchase.fornecedor || '',
      purchase.cnpj || '',
      purchase.descricao || '',
      purchase.categoria || '',
      purchase.centroCusto || '',
      Number(purchase.valor) || 0,
      purchase.formaPagamento || '',
      purchase.statusPagamento || 'Pago',
      purchase.parcelas || '',
      purchase.garantia ? new Date(purchase.garantia + 'T12:00:00') : '',
      purchase.linkNf || '',
      purchase.observacoes || '',
      now,
      userEmail
    ];

    if (purchase.id) {
      // Atualização
      const allData = sheet.getRange(2, 1, sheet.getLastRow() - 1, 1).getValues();
      let foundRow = -1;
      for (let i = 0; i < allData.length; i++) {
        if (String(allData[i][0]) === String(purchase.id)) {
          foundRow = i + 2;
          break;
        }
      }

      if (foundRow !== -1) {
        // Preserva data e autor de criação original se existirem
        const originalMeta = sheet.getRange(foundRow, 16, 1, 2).getValues()[0];
        rowData[15] = originalMeta[0] || now;
        rowData[16] = originalMeta[1] || userEmail;
        sheet.getRange(foundRow, 1, 1, rowData.length).setValues([rowData]);
        return { success: true, message: 'Registro atualizado com sucesso!', id: id };
      }
    }

    // Nova inserção
    sheet.appendRow(rowData);
    return { success: true, message: 'Compra registrada com sucesso!', id: id };
  } catch (error) {
    return { success: false, message: 'Erro ao salvar: ' + error.toString() };
  }
}

/**
 * Exclui uma compra por ID
 */
function deletePurchase(purchaseId) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName(SHEET_NAME_COMPRAS);
    if (!sheet) return { success: false, message: 'Planilha não encontrada' };

    const lastRow = sheet.getLastRow();
    if (lastRow < 2) return { success: false, message: 'Nenhum registro encontrado' };

    const ids = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
    for (let i = 0; i < ids.length; i++) {
      if (String(ids[i][0]) === String(purchaseId)) {
        sheet.deleteRow(i + 2);
        return { success: true, message: 'Registro excluído com sucesso!' };
      }
    }
    return { success: false, message: 'Registro não localizado' };
  } catch (err) {
    return { success: false, message: 'Erro ao excluir: ' + err.toString() };
  }
}

/**
 * Upload de Nota Fiscal ou Comprovante diretamente para o Google Drive
 */
function uploadNfFile(fileData) {
  try {
    const folder = getOrCreateNfFolder();
    const contentType = fileData.mimeType || 'application/pdf';
    const decoded = Utilities.base64Decode(fileData.base64.split(',')[1] || fileData.base64);
    const blob = Utilities.newBlob(decoded, contentType, fileData.name);
    
    const file = folder.createFile(blob);
    // Torna acessível a quem possui o link no domínio/geral
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);

    return {
      success: true,
      fileUrl: file.getUrl(),
      fileDownloadUrl: file.getDownloadUrl(),
      fileName: file.getName(),
      fileId: file.getId()
    };
  } catch (err) {
    return {
      success: false,
      message: 'Erro no upload do arquivo para o Google Drive: ' + err.toString()
    };
  }
}

/**
 * Consulta CNPJ com fallback automático (BrasilAPI -> ReceitaWS)
 */
function consultarCNPJ(rawCnpj) {
  try {
    const cleanCnpj = String(rawCnpj).replace(/\D/g, '');
    if (cleanCnpj.length !== 14) {
      return { success: false, message: 'CNPJ inválido (deve conter 14 dígitos)' };
    }

    // Tentativa 1: BrasilAPI
    try {
      const urlBrasilApi = 'https://brasilapi.com.br/api/cnpj/v1/' + cleanCnpj;
      const res1 = UrlFetchApp.fetch(urlBrasilApi, { muteHttpExceptions: true, timeout: 5000 });
      if (res1.getResponseCode() === 200) {
        const data = JSON.parse(res1.getContentText());
        return {
          success: true,
          razaoSocial: data.razao_social || '',
          nomeFantasia: data.nome_fantasia || data.razao_social || '',
          logradouro: data.logradouro || '',
          municipio: data.municipio || '',
          uf: data.uf || ''
        };
      }
    } catch (e1) {
      // Segue para fallback
    }

    // Tentativa 2: ReceitaWS (Fallback)
    try {
      const urlReceitaWs = 'https://receitaws.com.br/v1/cnpj/' + cleanCnpj;
      const res2 = UrlFetchApp.fetch(urlReceitaWs, { muteHttpExceptions: true, timeout: 5000 });
      if (res2.getResponseCode() === 200) {
        const data2 = JSON.parse(res2.getContentText());
        if (data2.status === 'OK') {
          return {
            success: true,
            razaoSocial: data2.nome || '',
            nomeFantasia: data2.fantasia || data2.nome || '',
            logradouro: data2.logradouro || '',
            municipio: data2.municipio || '',
            uf: data2.uf || ''
          };
        }
      }
    } catch (e2) {
      // Falha no fallback
    }

    return { success: false, message: 'Não foi possível obter dados automáticos do CNPJ no momento. Você pode preencher o nome manualmente.' };
  } catch (err) {
    return { success: false, message: 'Falha ao consultar CNPJ: ' + err.toString() };
  }
}

/**
 * Retorna Métricas completas para o Dashboard (Totais por Ano, Mês, Categorias, etc)
 */
function getDashboardData(selectedYear) {
  const purchases = getAllPurchases();
  const currentYear = selectedYear ? parseInt(selectedYear) : new Date().getFullYear();

  let totalAno = 0;
  let totalProdutos = 0;
  let totalServicos = 0;
  let totalRecorrentes = 0;
  
  const monthlyTotals = Array(12).fill(0);
  const categoryTotals = {};
  const supplierTotals = {};
  const costCenterTotals = {};
  const recentPurchases = [];
  const upcomingWarranties = [];

  const now = new Date();
  const next60Days = new Date();
  next60Days.setDate(now.getDate() + 60);

  purchases.forEach(p => {
    const pDate = p.dataCompra ? new Date(p.dataCompra + 'T12:00:00') : null;
    const pYear = pDate ? pDate.getFullYear() : null;
    const pMonth = pDate ? pDate.getMonth() : null; // 0-11
    const valor = Number(p.valor) || 0;

    // Métricas do Ano Selecionado
    if (pYear === currentYear) {
      totalAno += valor;
      if (pMonth !== null && pMonth >= 0 && pMonth < 12) {
        monthlyTotals[pMonth] += valor;
      }

      // Por Tipo
      if (p.tipo === 'Produto') totalProdutos += valor;
      else if (p.tipo === 'Serviço') totalServicos += valor;
      else totalRecorrentes += valor;

      // Por Categoria
      const cat = p.categoria || 'Não Categorizado';
      categoryTotals[cat] = (categoryTotals[cat] || 0) + valor;

      // Por Centro de Custo
      const cc = p.centroCusto || 'Não Definido';
      costCenterTotals[cc] = (costCenterTotals[cc] || 0) + valor;

      // Por Fornecedor / CNPJ
      const suppKey = p.fornecedor ? `${p.fornecedor} (${p.cnpj || 'S/ CNPJ'})` : 'Diversos';
      supplierTotals[suppKey] = (supplierTotals[suppKey] || 0) + valor;
    }

    // Checagem de Garantias e Contratos a Vencer
    if (p.garantia) {
      const gDate = new Date(p.garantia + 'T12:00:00');
      if (gDate >= now && gDate <= next60Days) {
        upcomingWarranties.push({
          id: p.id,
          fornecedor: p.fornecedor,
          descricao: p.descricao,
          dataVencimento: p.garantia,
          diasRestantes: Math.ceil((gDate - now) / (1000 * 60 * 60 * 24))
        });
      }
    }
  });

  // Top 5 Fornecedores
  const topSuppliers = Object.keys(supplierTotals)
    .map(key => ({ name: key, total: supplierTotals[key] }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 7);

  // Anos disponíveis para seleção
  const availableYears = Array.from(new Set(
    purchases
      .filter(p => p.dataCompra)
      .map(p => new Date(p.dataCompra + 'T12:00:00').getFullYear())
  )).sort((a, b) => b - a);

  if (!availableYears.includes(currentYear)) {
    availableYears.unshift(currentYear);
  }

  return {
    selectedYear: currentYear,
    availableYears: availableYears,
    totalAno: totalAno,
    totalMesAtual: monthlyTotals[now.getMonth()] || 0,
    mediaMensal: totalAno / 12,
    totalProdutos: totalProdutos,
    totalServicos: totalServicos,
    totalRecorrentes: totalRecorrentes,
    monthlyTotals: monthlyTotals,
    categoryTotals: categoryTotals,
    costCenterTotals: costCenterTotals,
    topSuppliers: topSuppliers,
    upcomingWarranties: upcomingWarranties.sort((a, b) => a.diasRestantes - b.diasRestantes)
  };
}
