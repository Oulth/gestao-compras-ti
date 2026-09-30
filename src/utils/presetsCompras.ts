import type { TipoDespesa, StatusPagamento } from '../types';

export interface ModeloCompraRapida {
  id: string;
  nome: string;
  icone: string;
  badge: string;
  modalidadeSugerida?: 'a_vista' | 'parcelado' | 'recorrente_mensal';
  duracaoMesesSugerida?: number;
  dados: {
    tipo: TipoDespesa;
    fornecedor: string;
    cnpj?: string;
    categoria: string;
    centro_custo: string;
    forma_pagamento: string;
    status_pagamento: StatusPagamento;
    descricao: string;
    valorSugerido?: string;
  };
}

export const MODELOS_COMPRAS_RAPIDAS: ModeloCompraRapida[] = [
  {
    id: 'internet-fibra',
    nome: 'Internet / Link Dedicado',
    icone: '🌐',
    badge: 'Telecom • Recorrente',
    modalidadeSugerida: 'recorrente_mensal',
    duracaoMesesSugerida: 12,
    dados: {
      tipo: 'Contrato Mensal',
      fornecedor: 'Provedor Telecom / Link Fibra',
      cnpj: '',
      categoria: 'Telecomunicações & Links',
      centro_custo: 'T.I - Infraestrutura',
      forma_pagamento: 'Boleto Bancário',
      status_pagamento: 'Pago',
      descricao: 'Mensalidade de Link Dedicado de Internet Fibra - Unidade Cidade dos Funcionários',
    },
  },
  {
    id: 'microsoft-365',
    nome: 'Microsoft 365 / Google Workspace',
    icone: '☁️',
    badge: 'Licenças • Recorrente',
    modalidadeSugerida: 'recorrente_mensal',
    duracaoMesesSugerida: 12,
    dados: {
      tipo: 'Assinatura Recorrente (SaaS)',
      fornecedor: 'Microsoft do Brasil / Google Cloud',
      cnpj: '',
      categoria: 'Software & Licenças (SaaS, SO, Antivírus)',
      centro_custo: 'T.I - Sistemas & Licenças',
      forma_pagamento: 'Cartão de Crédito Corporativo',
      status_pagamento: 'Pago',
      descricao: 'Assinatura Mensal de Licenças Cloud para E-mails Institucionais e Ferramentas Docentes',
    },
  },
  {
    id: 'toners-impressao',
    nome: 'Toners & Insumos de Impressão',
    icone: '🖨️',
    badge: 'Insumos',
    modalidadeSugerida: 'a_vista',
    dados: {
      tipo: 'Produto',
      fornecedor: 'Kalunga / Distribuidor de Suprimentos',
      cnpj: '',
      categoria: 'Impressoras & Suprimentos (Toners, Peças)',
      centro_custo: 'T.I - Infraestrutura',
      forma_pagamento: 'Boleto Bancário',
      status_pagamento: 'Pago',
      descricao: 'Aquisição de Lote de Toners para Impressoras da Secretaria, Coordenação e Professores',
    },
  },
  {
    id: 'cabos-rede',
    nome: 'Cabos & Conectores de Rede',
    icone: '🔌',
    badge: 'Redes',
    modalidadeSugerida: 'a_vista',
    dados: {
      tipo: 'Produto',
      fornecedor: 'Distribuidora de Redes & Conectividade',
      cnpj: '',
      categoria: 'Redes & Conectividade (Switches, Roteadores, Cabos)',
      centro_custo: 'T.I - Infraestrutura',
      forma_pagamento: 'PIX',
      status_pagamento: 'Pago',
      descricao: 'Caixa de Cabo de Rede Cat6 + Conectores RJ45 e Patch Cords para Manutenção Interna',
    },
  },
  {
    id: 'ssd-ram-upgrade',
    nome: 'SSDs & RAM (Upgrades)',
    icone: '💻',
    badge: 'Hardware • Parcelado',
    modalidadeSugerida: 'parcelado',
    duracaoMesesSugerida: 6,
    dados: {
      tipo: 'Produto',
      fornecedor: 'Kabum / Distribuidora de Informática',
      cnpj: '',
      categoria: 'Hardware (PCs, Notebooks, Servidores)',
      centro_custo: 'T.I - Infraestrutura',
      forma_pagamento: 'Cartão de Crédito Corporativo',
      status_pagamento: 'Parcelado',
      descricao: 'SSDs NVMe de Alta Performance e Memórias RAM para Upgrade de Desktops Pedagógicos',
    },
  },
  {
    id: 'ar-condicionado-cpd',
    nome: 'Manutenção Preventiva CPD',
    icone: '❄️',
    badge: 'Manutenção',
    modalidadeSugerida: 'a_vista',
    dados: {
      tipo: 'Serviço',
      fornecedor: 'Empresa Especializada de Climatização',
      cnpj: '',
      categoria: 'Suporte & Serviços Especializados',
      centro_custo: 'T.I - Infraestrutura',
      forma_pagamento: 'PIX',
      status_pagamento: 'Pago',
      descricao: 'Limpeza química e revisão preventiva dos sistemas de ar-condicionado da Sala dos Servidores (CPD)',
    },
  },
  {
    id: 'bobinas-catraca',
    nome: 'Bobinas Térmicas de Catracas',
    icone: '🎟️',
    badge: 'Acesso',
    modalidadeSugerida: 'a_vista',
    dados: {
      tipo: 'Produto',
      fornecedor: 'Distribuidora de Suprimentos de Acesso',
      cnpj: '',
      categoria: 'Impressoras & Suprimentos (Toners, Peças)',
      centro_custo: 'T.I - Infraestrutura',
      forma_pagamento: 'Boleto Bancário',
      status_pagamento: 'Pago',
      descricao: 'Caixa de Bobinas Térmicas 80mm para Catracas de Entrada e Relógios de Ponto',
    },
  },
];
