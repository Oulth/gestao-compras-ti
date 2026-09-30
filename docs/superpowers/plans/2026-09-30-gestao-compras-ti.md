# Gestão de Compras de T.I (Colégio Ágape) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Construir uma aplicação web moderna e responsiva (React + TypeScript + Tailwind CSS + shadcn/ui + Supabase) para controle de compras e despesas de T.I do Colégio Ágape, conectada a banco PostgreSQL real e bucket de notas fiscais no Supabase.

**Architecture:** Frontend SPA em Vite + React + TypeScript com estilos Tailwind CSS e ícones Lucide. A camada de dados utiliza `@supabase/supabase-js` para CRUD direto na tabela `public.compras`, leitura de `public.configuracoes` e upload de notas fiscais no bucket `comprovantes-nf`. Integração com a BrasilAPI para preenchimento de CNPJ e SheetJS para exportação em Excel.

**Tech Stack:** React 18/19, TypeScript, Vite, Tailwind CSS, Lucide React, Recharts, @supabase/supabase-js, xlsx (SheetJS), sonner (Toast notifications).

## Global Constraints

- Diretório do projeto: `C:\Users\Agape Ti\Documents\Projeto Ti`
- Supabase Project URL: `https://amhfrpmibhouunyqiheq.supabase.co`
- Supabase Anon Key: configurada em `.env` (`VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY`)
- Idioma de toda a interface: Português do Brasil (pt-BR)
- Formatação de moeda: Real Brasileiro (R$ 0.000,00)
- Suporte a impressão limpa de relatórios (`@media print`)

---

### Task 1: Scaffolding do Projeto Vite + React + TypeScript + Tailwind

**Files:**
- Create: `package.json`
- Create: `vite.config.ts`
- Create: `tsconfig.json`
- Create: `tsconfig.node.json`
- Create: `index.html`
- Create: `tailwind.config.js`
- Create: `postcss.config.js`
- Create: `src/index.css`
- Create: `src/main.tsx`

**Interfaces:**
- Produces: ambiente Vite com TypeScript e Tailwind configurado e funcional.

- [ ] **Step 1: Inicializar arquivos de configuração e package.json**
- [ ] **Step 2: Instalar dependências necessárias (`react`, `react-dom`, `@supabase/supabase-js`, `lucide-react`, `recharts`, `xlsx`, `clsx`, `tailwind-merge`, `sonner`) e devDependencies (`vite`, `@vitejs/plugin-react`, `tailwindcss`, `postcss`, `autoprefixer`, `typescript`, `@types/react`, `@types/react-dom`)**
- [ ] **Step 3: Configurar Tailwind CSS e PostCSS**
- [ ] **Step 4: Configurar `src/index.css` com variáveis de tema e regras de impressão (`@media print`)**
- [ ] **Step 5: Executar `npm run build` para garantir que o scaffolding compila sem erros**

---

### Task 2: Configuração de Variáveis de Ambiente, Tipos e Serviços Supabase

**Files:**
- Create: `.env`
- Create: `src/types/index.ts`
- Create: `src/services/supabase.ts`
- Create: `src/services/compras.ts`
- Create: `src/services/storage.ts`
- Create: `src/services/brasilApi.ts`

**Interfaces:**
- Produces:
  - `supabase`: cliente Supabase inicializado
  - `Compra`: interface TypeScript para registros de compras
  - `ConfiguracoesApp`: categorias, centros de custo, formas de pagamento
  - `getCompras(ano?: number): Promise<Compra[]>`
  - `saveCompra(compra: Partial<Compra>): Promise<Compra>`
  - `deleteCompra(id: string): Promise<void>`
  - `getConfiguracoes(): Promise<ConfiguracoesApp>`
  - `uploadComprovanteNf(file: File): Promise<{ url: string; nome: string }>`
  - `consultarCnpj(cnpj: string): Promise<{ razaoSocial: string; nomeFantasia: string } | null>`

- [ ] **Step 1: Criar arquivo `.env` com `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY`**
- [ ] **Step 2: Definir tipos em `src/types/index.ts`**
- [ ] **Step 3: Implementar cliente `src/services/supabase.ts` com validação de credenciais**
- [ ] **Step 4: Implementar `src/services/compras.ts` com operações CRUD e consultas agregadas**
- [ ] **Step 5: Implementar `src/services/storage.ts` para envio de arquivos ao bucket `comprovantes-nf`**
- [ ] **Step 6: Implementar `src/services/brasilApi.ts` com chamada e tratamento de erros para a BrasilAPI**
- [ ] **Step 7: Validar chamada teste ao Supabase compilando o módulo de tipos**

---

### Task 3: Navbar, Barra Superior e KPI Cards do Dashboard

**Files:**
- Create: `src/components/Navbar.tsx`
- Create: `src/components/KPICards.tsx`
- Create: `src/components/DashboardView.tsx`

**Interfaces:**
- Consumes: `Compra`, `ConfiguracoesApp`
- Produces:
  - `<Navbar onNovaCompra={...} anoSelecionado={...} setAnoSelecionado={...} anosDisponiveis={...} onRecarregar={...} isCarregando={...} />`
  - `<KPICards totalAno={...} totalMesAtual={...} mediaMensal={...} garantiasVencendoCount={...} ano={...} />`
  - `<DashboardView compras={...} ano={...} onEditarCompra={...} />`

- [ ] **Step 1: Implementar `src/components/Navbar.tsx` com identidade do Colégio Ágape, status do Supabase, seletor de ano e botão de nova compra**
- [ ] **Step 2: Implementar `src/components/KPICards.tsx` com os 4 indicadores financeiros**
- [ ] **Step 3: Implementar `src/components/DashboardView.tsx` com Recharts (evolução mensal de gastos, pizza de categorias, top fornecedores e alertas de garantias)**
- [ ] **Step 4: Testar responsividade dos cards e gráficos em mobile e desktop**

---

### Task 4: Tabela de Compras, Filtros e Exportação (Excel / Impressão)

**Files:**
- Create: `src/utils/formatters.ts`
- Create: `src/utils/exportExcel.ts`
- Create: `src/components/ComprasView.tsx`

**Interfaces:**
- Consumes: `Compra`, `ConfiguracoesApp`
- Produces:
  - `<ComprasView compras={...} configuracoes={...} onEditar={...} onExcluir={...} onNovaCompra={...} />`
  - `exportarParaExcel(compras: Compra[], nomeArquivo: string): void`
  - `formatarMoeda(valor: number): string`
  - `formatarData(data: string): string`

- [ ] **Step 1: Implementar formatadores em `src/utils/formatters.ts` (moeda pt-BR, data, CNPJ)**
- [ ] **Step 2: Implementar utilitário `src/utils/exportExcel.ts` com SheetJS (`xlsx`) para exportar colunas formatadas**
- [ ] **Step 3: Implementar `src/components/ComprasView.tsx` com barra de pesquisa, filtros por Tipo, Categoria e Mês, tabela com badges coloridos e ações**
- [ ] **Step 4: Implementar botão de visualização direta do anexo de Nota Fiscal (link para o Storage)**
- [ ] **Step 5: Implementar função `window.print()` estilizada com classes `@media print` para ocultar botões e filtros**

---

### Task 5: Modal de Cadastro / Edição com BrasilAPI e Upload no Supabase Storage

**Files:**
- Create: `src/components/CompraModal.tsx`
- Create: `src/components/ConfirmModal.tsx`

**Interfaces:**
- Consumes: `Compra`, `ConfiguracoesApp`, `uploadComprovanteNf`, `consultarCnpj`, `saveCompra`
- Produces:
  - `<CompraModal isOpen={...} onClose={...} compraEmEdicao={...} configuracoes={...} onSalvo={...} />`
  - `<ConfirmModal isOpen={...} onClose={...} onConfirm={...} title={...} message={...} />`

- [ ] **Step 1: Implementar `src/components/CompraModal.tsx` com validações, máscaras e valores padrão**
- [ ] **Step 2: Integrar busca de CNPJ via BrasilAPI com feedback visual (loading no botão "Auto-buscar")**
- [ ] **Step 3: Implementar upload drag-and-drop de nota fiscal diretamente para o bucket `comprovantes-nf`**
- [ ] **Step 4: Implementar `src/components/ConfirmModal.tsx` para confirmação antes de excluir qualquer registro**
- [ ] **Step 5: Integrar feedback com Sonner toast para avisos de sucesso e erro**

---

### Task 6: Aba de Relatórios Financeiros (Consolidado Mensal, Categorias, Centros de Custo)

**Files:**
- Create: `src/components/RelatoriosView.tsx`

**Interfaces:**
- Consumes: `Compra`, `anoSelecionado`
- Produces:
  - `<RelatoriosView compras={...} ano={...} />`

- [ ] **Step 1: Implementar tabela Mês a Mês segregando despesas de Produtos vs Serviços/SaaS vs Total e percentual do ano**
- [ ] **Step 2: Implementar tabela analítica por Categoria com somatório e barras de proporção**
- [ ] **Step 3: Implementar tabela analítica por Centro de Custo / Sub-setor**
- [ ] **Step 4: Adicionar botão de impressão dedicado para os relatórios financeiros**

---

### Task 7: Montagem Principal em `App.tsx`, Build e Verificação em Navegador

**Files:**
- Create: `src/App.tsx`
- Modify: `src/main.tsx`

**Interfaces:**
- Produces: aplicação completa orquestrada em abas com sincronização em tempo real.

- [ ] **Step 1: Implementar `src/App.tsx` gerenciando estado global das abas, dados de compras do Supabase, carregamento e modais**
- [ ] **Step 2: Adicionar listener em tempo real (Supabase Realtime) para refletir alterações instantaneamente**
- [ ] **Step 3: Executar `npm run build` e corrigir qualquer aviso de TypeScript ou linter**
- [ ] **Step 4: Iniciar servidor local com `npm run dev` e testar via Chrome DevTools / navegador**
- [ ] **Step 5: Validar cadastro de uma nova compra teste, consulta de CNPJ, upload de NF e visualização nos gráficos**
