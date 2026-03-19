import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { depositsService } from '../api/services';
import { DownloadCloud, CheckCircle, RotateCcw, AlertCircle } from 'lucide-react';

const Deposits = () => {
  const { user } = useAuth();
  const [deposits, setDeposits] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [amount, setAmount] = useState('');
  const [multiplier, setMultiplier] = useState('');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadDeposits();
  }, []);

  const loadDeposits = async () => {
    setLoading(true);
    try {
      const res = await depositsService.findAll();
      setDeposits(res.data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateDeposit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || !multiplier || !description) return;

    const numAmount = Number(amount);
    const numMultiplier = Number(multiplier);

    if (isNaN(numAmount) || isNaN(numMultiplier) || numAmount <= 0 || numMultiplier <= 0) {
      alert('Por favor ingrese valores válidos mayores a cero.');
      return;
    }

    const total = numAmount * numMultiplier;

    if (!window.confirm(`¿Registrar depósito por un total de $ ${total.toLocaleString('es-CO')}? Esto se sumará a la Caja y a las Ganancias.`)) {
      return;
    }

    setSubmitting(true);
    try {
      await depositsService.create({
        amount: numAmount,
        multiplier: numMultiplier,
        description,
        userId: user?.id,
      });
      alert('Depósito registrado correctamente');
      setAmount('');
      setMultiplier('');
      setDescription('');
      loadDeposits();
    } catch (error: any) {
      alert('Error: ' + (error.response?.data?.message || 'Error desconocido'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleReverseDeposit = async (id: string, total: number) => {
    if (!window.confirm(`¿Seguro que deseas anular este depósito por $ ${Number(total).toLocaleString('es-CO')}? El dinero será descontado de la Caja y Ganancias.`)) {
      return;
    }

    try {
      await depositsService.reverse(id);
      alert('Depósito anulado correctamente');
      loadDeposits();
    } catch (error: any) {
      alert('Error: ' + (error.response?.data?.message || 'Fondos insuficientes o error desconocido'));
    }
  };

  const calculatedTotal = (Number(amount) || 0) * (Number(multiplier) || 0);

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 flex items-center">
            <DownloadCloud className="mr-2 text-blue-600 h-6 w-6" />
            Depósitos
          </h1>
          <p className="text-gray-500 text-sm mt-1">Registra ingresos adicionales con un multiplicador específico.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Form */}
        <div className="bg-white rounded-lg shadow p-6 lg:col-span-1 h-fit">
          <h2 className="text-lg font-bold text-gray-800 mb-4 border-b pb-2">Nuevo Depósito</h2>
          <form onSubmit={handleCreateDeposit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Concepto / Descripción</label>
              <input 
                type="text" 
                required 
                className="w-full border border-gray-300 rounded-lg p-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Ej: Ingreso por comisiones"
                value={description}
                onChange={e => setDescription(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Cantidad Base</label>
              <input 
                type="number" 
                step="any"
                required 
                className="w-full border border-gray-300 rounded-lg p-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Ej: 5000000"
                value={amount}
                onChange={e => setAmount(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Valor Multiplicador</label>
              <input 
                type="number" 
                step="any"
                required 
                className="w-full border border-gray-300 rounded-lg p-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Ej: 0.45"
                value={multiplier}
                onChange={e => setMultiplier(e.target.value)}
              />
            </div>

            <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
              <span className="block text-sm text-blue-800 font-medium">Total a Ingresar:</span>
              <span className="text-2xl font-bold text-blue-900">
                $ {calculatedTotal.toLocaleString('es-CO', { maximumFractionDigits: 2 })}
              </span>
            </div>

            <button 
              type="submit" 
              disabled={submitting}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-lg shadow-sm transition-colors disabled:opacity-50"
            >
              {submitting ? 'Registrando...' : 'Registrar Depósito'}
            </button>
          </form>
        </div>

        {/* List */}
        <div className="bg-white rounded-lg shadow lg:col-span-2 overflow-hidden">
           <div className="p-4 border-b bg-gray-50 flex justify-between items-center">
             <h2 className="text-lg font-bold text-gray-800">Historial de Depósitos</h2>
           </div>
           
           {loading ? (
             <div className="p-8 text-center text-gray-500">Cargando depósitos...</div>
           ) : (
             <div className="overflow-x-auto">
               <table className="min-w-full divide-y divide-gray-200">
                 <thead className="bg-white">
                   <tr>
                     <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Fecha</th>
                     <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Concepto</th>
                     <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Cálculo</th>
                     <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total</th>
                     <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Estado</th>
                   </tr>
                 </thead>
                 <tbody className="bg-white divide-y divide-gray-200">
                   {deposits.map(dep => (
                     <tr key={dep.id} className={dep.isReversed ? 'bg-red-50 opacity-75' : ''}>
                       <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                         {new Date(dep.createdAt).toLocaleString()}
                       </td>
                       <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                         {dep.description}
                       </td>
                       <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                         {Number(dep.amount).toLocaleString()} × {Number(dep.multiplier)}
                       </td>
                       <td className={`px-6 py-4 whitespace-nowrap text-sm font-bold ${dep.isReversed ? 'text-gray-500 line-through' : 'text-green-600'}`}>
                         + $ {Number(dep.total).toLocaleString('es-CO')}
                       </td>
                       <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                         {dep.isReversed ? (
                           <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                             Anulado
                           </span>
                         ) : (
                           <button 
                             onClick={() => handleReverseDeposit(dep.id, dep.total)}
                             className="text-red-500 hover:text-red-700 flex items-center justify-end w-full"
                             title="Anular Depósito"
                           >
                             <RotateCcw className="h-4 w-4 mr-1" /> Anular
                           </button>
                         )}
                       </td>
                     </tr>
                   ))}
                   {deposits.length === 0 && (
                     <tr>
                       <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                         <AlertCircle className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                         No hay depósitos registrados
                       </td>
                     </tr>
                   )}
                 </tbody>
               </table>
             </div>
           )}
        </div>
      </div>
    </div>
  );
};

export default Deposits;