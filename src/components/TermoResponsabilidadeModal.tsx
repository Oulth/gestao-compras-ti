import React, { useState, useEffect } from 'react';
import { X, Printer, FileText } from 'lucide-react';
import type { Equipamento } from '../types';
import { formatDate } from '../utils/formatters';

interface TermoResponsabilidadeModalProps {
  isOpen: boolean;
  onClose: () => void;
  equipamento: Equipamento | null;
}

export const TermoResponsabilidadeModal: React.FC<TermoResponsabilidadeModalProps> = ({
  isOpen,
  onClose,
  equipamento,
}) => {
  const [nomeEmpregado, setNomeEmpregado] = useState<string>('');
  const [funcaoEmpregado, setFuncaoEmpregado] = useState<string>('');
  const [dataRecebimento, setDataRecebimento] = useState<string>('');
  const [estadoConservacao, setEstadoConservacao] = useState<string>('Novo / Em perfeito estado');
  const [acessoriosTexto, setAcessoriosTexto] = useState<string>('');

  useEffect(() => {
    if (equipamento) {
      setNomeEmpregado(equipamento.responsavel || '');
      setFuncaoEmpregado(equipamento.funcao_responsavel || 'Colaborador(a)');
      setDataRecebimento(new Date().toISOString().split('T')[0]);
      setAcessoriosTexto(equipamento.acessorios || 'Fonte / Carregador de energia e cabo de força');
      setEstadoConservacao('Em perfeito estado de funcionamento e conservação');
    }
  }, [equipamento]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !equipamento) return null;

  const handlePrint = () => {
    window.print();
  };

  const hojeFormatado = () => {
    const data = dataRecebimento ? new Date(dataRecebimento + 'T12:00:00') : new Date();
    const dia = String(data.getDate()).padStart(2, '0');
    const meses = [
      'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
      'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
    ];
    const mes = meses[data.getMonth()];
    const ano = data.getFullYear();
    return `${dia} de ${mes} de ${ano}`;
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4"
    >
      <div
        className="relative w-full max-w-4xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[95vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Barra superior de controles (oculta na impressão) */}
        <div className="no-print flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-md shadow-blue-500/20">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Termo de Responsabilidade pela Guarda e Uso de Equipamento
              </h2>
              <p className="text-xs text-slate-500">
                Documento oficial • Colégio Ágape (Unidade Cidade dos Funcionários)
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrint}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl shadow-sm transition-all"
            >
              <Printer className="w-4 h-4" />
              <span>Imprimir Termo (A4)</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 rounded-xl transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Painel de ajuste rápido dos dados antes de imprimir (oculto na impressão) */}
        <div className="no-print bg-blue-50/60 border-b border-blue-100 p-4 shrink-0">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs">
            <div>
              <label className="font-semibold text-slate-700 block mb-1">Nome do Empregado:</label>
              <input
                type="text"
                value={nomeEmpregado}
                onChange={(e) => setNomeEmpregado(e.target.value)}
                placeholder="Ex: João da Silva"
                className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 font-medium text-slate-800"
              />
            </div>
            <div>
              <label className="font-semibold text-slate-700 block mb-1">Função / Cargo:</label>
              <input
                type="text"
                value={funcaoEmpregado}
                onChange={(e) => setFuncaoEmpregado(e.target.value)}
                placeholder="Ex: Professor de Matemática"
                className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 font-medium text-slate-800"
              />
            </div>
            <div>
              <label className="font-semibold text-slate-700 block mb-1">Data de Entrega:</label>
              <input
                type="date"
                value={dataRecebimento}
                onChange={(e) => setDataRecebimento(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 font-medium text-slate-800"
              />
            </div>
            <div>
              <label className="font-semibold text-slate-700 block mb-1">Estado de Conservação:</label>
              <input
                type="text"
                value={estadoConservacao}
                onChange={(e) => setEstadoConservacao(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 font-medium text-slate-800"
              />
            </div>
          </div>
        </div>

        {/* Corpo do Documento (Folha A4 oficial fiel ao Word) */}
        <div className="flex-1 overflow-y-auto p-6 sm:p-10 bg-slate-100/50 print:p-0 print:bg-white print:overflow-visible">
          <div className="max-w-[210mm] mx-auto bg-white p-8 sm:p-12 shadow-md print:shadow-none border border-slate-200 print:border-none text-slate-900 leading-relaxed font-sans text-sm print:text-[13px] print:leading-normal">
            
            {/* Cabeçalho Institucional */}
            <div className="text-center pb-4 mb-6 border-b-2 border-slate-800">
              <h1 className="text-xl sm:text-2xl font-black uppercase tracking-wide text-slate-900 mb-1">
                Colégio Ágape
              </h1>
              <h2 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-slate-600 mb-2">
                Unidade Cidade dos Funcionários • Setor de Tecnologia da Informação
              </h2>
              <div className="inline-block bg-slate-900 text-white font-bold text-xs uppercase px-4 py-1 rounded">
                Termo de Responsabilidade pela Guarda e Uso de Equipamento
              </div>
            </div>

            {/* Identificação do Empregado */}
            <div className="bg-slate-50 border border-slate-300 rounded-lg p-4 mb-6 print:bg-transparent print:border-slate-400">
              <h3 className="font-bold text-xs uppercase tracking-wider text-slate-700 mb-2 border-b border-slate-200 pb-1">
                Identificação do Empregado / Colaborador
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                <div>
                  <span className="font-semibold text-slate-600">Nome: </span>
                  <span className="font-bold text-slate-900 underline decoration-slate-300 underline-offset-4">
                    {nomeEmpregado || '________________________________________________________'}
                  </span>
                </div>
                <div>
                  <span className="font-semibold text-slate-600">Função: </span>
                  <span className="font-bold text-slate-900 underline decoration-slate-300 underline-offset-4">
                    {funcaoEmpregado || '________________________________________________________'}
                  </span>
                </div>
              </div>
            </div>

            {/* Texto Legal Oficial do Documento do Colégio Ágape */}
            <div className="text-justify space-y-3 mb-6 text-slate-800 text-xs sm:text-[13px]">
              <p>
                Recebi do <strong>Colégio Ágape</strong>, unidade <strong>Cidade dos Funcionários</strong>, a título de empréstimo, para meu uso exclusivo em trabalho, conforme determinado na legislação vigente, os equipamentos especificados neste termo de responsabilidade, comprometendo-me a mantê-los em perfeito estado de conservação, ficando plenamente ciente de que:
              </p>
              <ul className="list-disc pl-5 space-y-1.5 text-slate-700">
                <li>
                  Se o equipamento for danificado ou inutilizado por emprego inadequado, mau uso, negligência ou extravio, a empresa me fornecerá novo equipamento e cobrará o valor do equipamento da mesma marca ou equivalente disponível no mercado.
                </li>
                <li>
                  Em caso de dano, inutilização ou extravio do equipamento deverei comunicar imediatamente ao setor competente (T.I / Coordenação).
                </li>
                <li>
                  Terminando os serviços ou no caso de rescisão do contrato de trabalho, devolverei o equipamento completo e em perfeito estado de conservação, considerando-se o tempo do uso do mesmo, ao setor competente.
                </li>
                <li>
                  Estando os equipamentos em minha posse, estarei sujeito a inspeções periódicas sem prévio aviso para auditoria e manutenção preventiva.
                </li>
              </ul>
            </div>

            {/* Tabela de Equipamentos Especificados */}
            <div className="mb-6">
              <table className="w-full border-collapse border border-slate-400 text-xs text-left">
                <thead>
                  <tr className="bg-slate-200/80 print:bg-slate-100 text-slate-800 font-bold uppercase text-[11px]">
                    <th className="border border-slate-400 p-2 text-center w-12">Item</th>
                    <th className="border border-slate-400 p-2">Descrição do Equipamento</th>
                    <th className="border border-slate-400 p-2 text-center w-14">Qtd</th>
                    <th className="border border-slate-400 p-2 text-center w-36">Estado</th>
                    <th className="border border-slate-400 p-2 text-center w-28">Data Receb.</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="border border-slate-400 p-2.5 text-center font-bold">1</td>
                    <td className="border border-slate-400 p-2.5">
                      <div className="font-bold text-slate-900">
                        {equipamento.tipo}: {equipamento.marca} {equipamento.modelo}
                      </div>
                      <div className="text-[11px] text-slate-600 mt-0.5 space-x-2">
                        <span><strong>Patrimônio:</strong> {equipamento.patrimonio}</span>
                        <span>•</span>
                        <span><strong>S/N:</strong> {equipamento.numero_serie || 'N/A'}</span>
                      </div>
                      {equipamento.especificacoes && (
                        <div className="text-[11px] text-slate-500 italic mt-0.5">
                          Config: {equipamento.especificacoes}
                        </div>
                      )}
                      {acessoriosTexto && (
                        <div className="text-[11px] text-slate-700 mt-1">
                          <strong>Acessórios inclusos:</strong> {acessoriosTexto}
                        </div>
                      )}
                    </td>
                    <td className="border border-slate-400 p-2.5 text-center font-bold">1</td>
                    <td className="border border-slate-400 p-2.5 text-center text-[11px]">
                      {estadoConservacao}
                    </td>
                    <td className="border border-slate-400 p-2.5 text-center font-medium">
                      {formatDate(dataRecebimento)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Local e Assinatura de Entrega */}
            <div className="pt-4 mb-8">
              <p className="text-right text-xs mb-8">
                Fortaleza - CE, {hojeFormatado()}.
              </p>
              <div className="max-w-md mx-auto text-center">
                <div className="border-t border-slate-800 pt-1">
                  <p className="font-bold text-xs uppercase text-slate-900">
                    {nomeEmpregado || 'Ciente (Nome / Assinatura do Empregado)'}
                  </p>
                  <p className="text-[11px] text-slate-500">
                    Assinatura do Colaborador • {funcaoEmpregado || 'Colégio Ágape'}
                  </p>
                </div>
              </div>
            </div>

            {/* Canhoto Oficial de Devolução */}
            <div className="border-t-2 border-dashed border-slate-400 pt-6 mt-6 break-inside-avoid">
              <div className="bg-slate-50 print:bg-transparent border border-slate-300 rounded p-4">
                <h4 className="font-bold text-xs uppercase tracking-wider text-slate-800 mb-2 flex items-center justify-between">
                  <span>Canhoto de Devolução (Preenchimento exclusivo na entrega do bem)</span>
                  <span className="text-[10px] font-mono text-slate-500">TAG: {equipamento.patrimonio}</span>
                </h4>
                <p className="text-xs text-slate-700 mb-3">
                  Atestamos que o bem especificado acima foi devolvido ao setor de T.I em _____ / _____ / _________, nas seguintes condições:
                </p>
                <div className="flex items-center gap-6 text-xs mb-4">
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <span className="w-3.5 h-3.5 border border-slate-600 rounded-xs inline-block"></span>
                    <span>Em perfeito estado</span>
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <span className="w-3.5 h-3.5 border border-slate-600 rounded-xs inline-block"></span>
                    <span>Apresentando defeito</span>
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <span className="w-3.5 h-3.5 border border-slate-600 rounded-xs inline-block"></span>
                    <span>Faltando peças / acessórios</span>
                  </label>
                </div>
                <p className="text-xs text-slate-600 mb-6">
                  Observações da Devolução: __________________________________________________________________________________
                </p>
                <div className="flex justify-between items-end text-xs">
                  <p>Fortaleza - CE, _____ de ____________________ de 2026.</p>
                  <div className="text-center w-64 border-t border-slate-700 pt-1">
                    <p className="font-bold text-[11px]">Colégio Ágape</p>
                    <p className="text-[10px] text-slate-500">Setor de Tecnologia da Informação</p>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>

      </div>
    </div>
  );
};
