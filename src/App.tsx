import { ShoppingBag, Server, CheckCircle2 } from 'lucide-react'

export default function App() {
  return (
    <div className="min-h-screen bg-slate-50 p-8 flex flex-col items-center justify-center">
      <div className="max-w-md w-full bg-white rounded-xl shadow-md p-6 text-center border border-slate-200">
        <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
          <Server className="w-8 h-8" />
        </div>
        <h1 className="text-2xl font-bold text-slate-800 mb-2">
          Gestão de Compras T.I
        </h1>
        <p className="text-slate-600 mb-4 font-medium">
          Colégio Ágape
        </p>
        <div className="flex items-center justify-center gap-2 text-emerald-600 text-sm font-semibold bg-emerald-50 py-2 px-3 rounded-lg border border-emerald-200">
          <CheckCircle2 className="w-4 h-4" />
          <span>Ambiente configurado com sucesso</span>
        </div>
        <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-center gap-2 text-xs text-slate-400">
          <ShoppingBag className="w-4 h-4" />
          <span>Vite + React + TypeScript + Tailwind</span>
        </div>
      </div>
    </div>
  )
}
