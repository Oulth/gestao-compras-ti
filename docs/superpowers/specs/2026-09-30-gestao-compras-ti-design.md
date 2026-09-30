# Especificação de Design - Sistema de Gestão de Compras de T.I (Colégio Ágape)

## 1. Visão Geral
Sistema web moderno para gestão, controle e acompanhamento de compras, contratos e assinaturas do setor de T.I do Colégio Ágape. A aplicação substitui a versão estática/Google Sheets por uma aplicação React com TypeScript, Tailwind CSS, shadcn/ui e banco de dados real em nuvem com Supabase (PostgreSQL + Supabase Storage).

## 2. Requisitos & Decisões Arquiteturais
- **Acesso**: Acesso direto e sem fricção na rede interna do setor de T.I.
- **Armazenamento de Anexos**: Upload de arquivos de notas fiscais e comprovantes (PDF e imagens) no bucket público `comprovantes-nf` do Supabase Storage.
- **Frontend Stack**: Vite + React 18/19 (TypeScript) + Tailwind CSS + Lucide Icons + Recharts.
- **Backend & Banco de Dados**: Supabase (PostgreSQL 17, Row Level Security habilitado, bucket público `comprovantes-nf`).
- **APIs Externas**: BrasilAPI (`https://brasilapi.com.br/api/cnpj/v1/{cnpj}`) para busca automática de razão social de fornecedores.
- **Exportação & Impressão**: Suporte a exportação de dados em `.xlsx` (Excel) e versão de impressão limpa para PDF (`@media print`).

## 3. Modelo de Dados (Supabase PostgreSQL)

### 3.1. Tabela `public.compras`
- `id`: UUID (Primary Key, default `gen_random_uuid()`)
- `codigo_ti`: TEXT (ex: 'TI-2026-001')
- `data_compra`: DATE (NOT NULL)
- `tipo`: TEXT (NOT NULL) - 'Produto', 'Serviço', 'Assinatura Recorrente (SaaS)', 'Contrato Mensal'
- `fornecedor`: TEXT (NOT NULL)
- `cnpj`: TEXT (opcional, formatado)
- `descricao`: TEXT (NOT NULL)
- `categoria`: TEXT (NOT NULL)
- `centro_custo`: TEXT (opcional)
- `valor`: NUMERIC(12, 2) (NOT NULL, default 0.00)
- `forma_pagamento`: TEXT (opcional)
- `status_pagamento`: TEXT (NOT NULL, default 'Pago') - 'Pago', 'Pendente', 'Parcelado', 'Cancelado'
- `parcelas`: TEXT (opcional)
- `garantia`: DATE (opcional, data de término de garantia ou licença)
- `link_nf`: TEXT (opcional, URL pública no Supabase Storage)
- `nome_arquivo_nf`: TEXT (opcional)
- `observacoes`: TEXT (opcional)
- `criado_em`: TIMESTAMPTZ (default `NOW()`)
- `atualizado_em`: TIMESTAMPTZ (default `NOW()`)

### 3.2. Tabela `public.configuracoes`
- `id`: TEXT (Primary Key) - 'categorias', 'centros_custo', 'formas_pagamento'
- `itens`: JSONB (NOT NULL, array de strings com as opções configuráveis)
- `atualizado_em`: TIMESTAMPTZ (default `NOW()`)

### 3.3. Supabase Storage Bucket
- `comprovantes-nf`: Bucket público para upload de arquivos de comprovantes e NFs com limite de 50MB por arquivo.

## 4. Estrutura de Componentes e Telas

### 4.1. Navbar / Header
- Logomarca e título institucional "Colégio Ágape - Setor de T.I".
- Indicador de status de conexão com o Supabase (online/ativo).
- Seletor de Exercício (Ano vigente e anos anteriores dinâmicos baseados nas compras cadastradas).
- Botão primário "+ Nova Compra" para abrir o modal de cadastro.
- Botão de sincronização / recarregar dados.

### 4.2. Abas Principais
1. **Dashboard Executivo**:
   - 4 KPI Cards: Total Gasto no Ano selecionado, Gasto no Mês Atual, Média Mensal Estimada, Total de Licenças/Garantias Vencendo em 60 dias.
   - Gráfico de Barras Mensal: Evolução dos gastos mês a mês de Janeiro a Dezembro.
   - Gráfico de Rosca/Donut: Distribuição percentual de despesas por Categoria.
   - Tabela de Maiores Fornecedores: Top fornecedores com valor total gasto e percentual em relação ao ano.
   - Painel de Alertas de Garantias: Lista de itens com garantia ou licença vencendo nos próximos 60 dias, indicando os dias restantes e alerta visual.
2. **Compras & Lançamentos**:
   - Barra de filtros: Campo de busca de texto (descrição, fornecedor, CNPJ), Filtro por Tipo de despesa, Filtro por Categoria e Filtro por Mês.
   - Ações em lote e exportação: Botão de Exportar para Excel (.xlsx) e Botão de Imprimir/Gerar PDF.
   - Tabela de Lançamentos: Colunas para Data, Tipo, Fornecedor/CNPJ, Descrição, Categoria/Centro de Custo, Valor (R$), Status de Pagamento (badges estilizados), Anexo de Nota Fiscal (link direto para visualização) e Coluna de Ações (Editar, Excluir).
   - Rodapé da Tabela: Contador de registros exibidos e soma total dos valores filtrados.
3. **Relatórios Financeiros**:
   - Tabela Consolidada Mensal: Detalhamento por mês com separação entre Produtos, Serviços/SaaS, Total e % Anual, com linha de rodapé com somatórios totais.
   - Tabela Analítica por Categoria: Listagem com total acumulado e percentual.
   - Tabela por Centro de Custo: Listagem com despesas de cada subsetor (Infraestrutura, Sistemas, Pedagógico, etc.).

### 4.3. Modal de Cadastro & Edição
- Formulário reativo com validação de campos obrigatórios.
- Campo de CNPJ com máscara e botão "Auto-buscar" integrado à BrasilAPI.
- Selects dinâmicos carregados da tabela `configuracoes`.
- Formatação monetária em Real Brasileiro (R$).
- Seletor de data de compra e término de garantia/licença.
- Dropzone de arquivos com barra de progresso de upload direto para o Supabase Storage.
- Feedback visual com toast notifications (Sonner).

## 5. Plano de Entrega e Verificação
1. Inicializar projeto Vite + React + Tailwind + TypeScript no diretório raiz.
2. Configurar cliente Supabase com as credenciais do projeto `amhfrpmibhouunyqiheq`.
3. Criar serviços de dados (`src/services/supabase.ts`, `src/services/compras.ts`, `src/services/storage.ts`, `src/services/brasilApi.ts`).
4. Implementar componentes UI: Header, Dashboard, ComprasTable, RelatoriosView, CompraModal, DeleteConfirmDialog.
5. Implementar exportação para Excel e estilos de impressão CSS.
6. Testar build de produção (`npm run build`) e validar execução local (`npm run preview` / `npm run dev`).
