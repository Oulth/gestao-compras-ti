import React, { useEffect, useState } from 'react';
import { X, Printer, QrCode, Tag, CheckSquare, Square } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import type { Equipamento } from '../types';

interface EtiquetasModalProps {
  isOpen: boolean;
  onClose: () => void;
  equipamentos: Equipamento[];
  equipamentoSelecionado?: Equipamento | null;
}

export const EtiquetasModal: React.FC<EtiquetasModalProps> = ({
  isOpen,
  onClose,
  equipamentos,
  equipamentoSelecionado,
}) => {
  const [selecionadosIds, setSelecionadosIds] = useState<string[]>([]);
  const [formato, setFormato] = useState<'grade' | 'termica'>('grade');

  useEffect(() => {
    if (equipamentoSelecionado) {
      setSelecionadosIds([equipamentoSelecionado.id]);
    } else {
      setSelecionadosIds(equipamentos.map((e) => e.id));
    }
  }, [equipamentoSelecionado, equipamentos, isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handlePrint = () => {
    window.print();
  };

  const toggleSelect = (id: string) => {
    setSelecionadosIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (selecionadosIds.length === equipamentos.length) {
      setSelecionadosIds([]);
    } else {
      setSelecionadosIds(equipamentos.map((e) => e.id));
    }
  };

  const itensParaImprimir = equipamentos.filter((e) =>
    selecionadosIds.includes(e.id)
  );

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4"
    >
      <div
        className="relative w-full max-w-5xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[95vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Barra superior de controles (oculta na impressão) */}
        <div className="no-print flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-md shadow-indigo-500/20">
              <QrCode className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Gerador de Etiquetas de Patrimônio com QR Code
              </h2>
              <p className="text-xs text-slate-500">
                Impressão de etiquetas adesivas para identificação física de equipamentos
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrint}
              disabled={itensParaImprimir.length === 0}
              className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-sm font-semibold rounded-xl shadow-sm transition-all"
            >
              <Printer className="w-4 h-4" />
              <span>Imprimir ({itensParaImprimir.length} etiquetas)</span>
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

        {/* Toolbar de filtros e seleção (oculta na impressão) */}
        <div className="no-print bg-slate-100/70 border-b border-slate-200 px-6 py-3 flex flex-wrap items-center justify-between gap-3 shrink-0 text-xs">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={toggleSelectAll}
              className="inline-flex items-center gap-1.5 font-semibold text-slate-700 hover:text-indigo-600 transition-colors"
            >
              {selecionadosIds.length === equipamentos.length ? (
                <CheckSquare className="w-4 h-4 text-indigo-600" />
              ) : (
                <Square className="w-4 h-4 text-slate-400" />
              )}
              <span>Selecionar Todos ({equipamentos.length})</span>
            </button>
            <span className="text-slate-300">|</span>
            <span className="text-slate-500">
              <strong>{itensParaImprimir.length}</strong> de {equipamentos.length} selecionados
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-600">Formato:</span>
            <div className="inline-flex rounded-lg border border-slate-300 bg-white p-0.5 shadow-2xs">
              <button
                type="button"
                onClick={() => setFormato('grade')}
                className={`px-3 py-1 rounded-md text-xs font-semibold transition-all ${
                  formato === 'grade'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Grade A4 (Folha com várias)
              </button>
              <button
                type="button"
                onClick={() => setFormato('termica')}
                className={`px-3 py-1 rounded-md text-xs font-semibold transition-all ${
                  formato === 'termica'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Individual / Térmica
              </button>
            </div>
          </div>
        </div>

        {/* Área de Visualização e Impressão das Etiquetas */}
        <div className="flex-1 overflow-y-auto p-6 sm:p-8 bg-slate-200/40 print:p-0 print:bg-white print:overflow-visible">
          {itensParaImprimir.length === 0 ? (
            <div className="text-center py-12 text-slate-400">
              <Tag className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p className="text-sm font-semibold text-slate-600">Nenhum equipamento selecionado</p>
              <p className="text-xs text-slate-400">Selecione ao menos um item acima para gerar a etiqueta.</p>
            </div>
          ) : (
            <div
              className={`print:m-0 ${
                formato === 'grade'
                  ? 'grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 print:grid-cols-3 print:gap-3'
                  : 'flex flex-col gap-4 max-w-sm mx-auto print:max-w-none print:gap-2'
              }`}
            >
              {itensParaImprimir.map((eq) => {
                const qrValue = JSON.stringify({
                  org: 'Colegio Agape',
                  pat: eq.patrimonio,
                  tipo: eq.tipo,
                  modelo: `${eq.marca} ${eq.modelo}`,
                  sn: eq.numero_serie || 'N/A',
                });

                return (
                  <div
                    key={eq.id}
                    className="relative bg-white border-2 border-slate-900 rounded-xl p-3 shadow-sm print:shadow-none print:border-2 print:border-black flex flex-col justify-between break-inside-avoid"
                    style={{ minHeight: '135px' }}
                  >
                    {/* Botão de desmarcar individual (oculto na impressão) */}
                    <button
                      type="button"
                      onClick={() => toggleSelect(eq.id)}
                      className="no-print absolute top-1.5 right-1.5 p-1 text-slate-300 hover:text-rose-500 rounded transition-colors"
                      title="Remover desta impressão"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>

                    {/* Cabeçalho da Etiqueta */}
                    <div className="border-b border-slate-300 pb-1.5 mb-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-black uppercase tracking-wider text-slate-900">
                          COLÉGIO ÁGAPE
                        </span>
                        <span className="text-[9px] font-bold uppercase text-slate-500 bg-slate-100 px-1 rounded border border-slate-200">
                          SETOR DE T.I
                        </span>
                      </div>
                    </div>

                    {/* Conteúdo Central: QR Code + Dados do Patrimônio */}
                    <div className="flex items-center gap-3 my-auto">
                      <div className="bg-white p-1 rounded border border-slate-300 shrink-0">
                        <QRCodeSVG
                          value={qrValue}
                          size={64}
                          level="M"
                          includeMargin={false}
                        />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-[9px] font-bold text-slate-500 uppercase">
                          PATRIMÔNIO T.I
                        </div>
                        <div className="text-base font-black text-slate-950 font-mono tracking-tight leading-tight">
                          {eq.patrimonio}
                        </div>
                        <div className="text-[11px] font-bold text-slate-800 truncate mt-0.5">
                          {eq.tipo}
                        </div>
                        <div className="text-[10px] text-slate-600 truncate">
                          {eq.marca} {eq.modelo}
                        </div>
                        <div className="text-[9px] font-mono text-slate-500 truncate mt-0.5">
                          S/N: {eq.numero_serie || 'N/A'}
                        </div>
                      </div>
                    </div>

                    {/* Rodapé da Etiqueta */}
                    <div className="border-t border-slate-200 pt-1 mt-2 flex items-center justify-between text-[8px] text-slate-500">
                      <span>PATRIMÔNIO INALIENÁVEL</span>
                      <span className="font-mono">CIDADE DOS FUNCIONÁRIOS</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

      </div>
    </div>
  );
};
