import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { purchasesService, salesService } from '../api/services';
import { FileText, RotateCcw } from 'lucide-react';

const Reports = () => {
  const { user } = useAuth();
  const [transactions, setTransactions] = useState<any[]>([]);
  const [filteredTransactions, setFilteredTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Filters
  const [filterDate, setFilterDate] = useState('');
  const [filterMonth, setFilterMonth] = useState('');
  const [filterYear, setFilterYear] = useState('');

  useEffect(() => {
    loadTransactions();
  }, [user]);

  useEffect(() => {
    applyFilters();
  }, [transactions, filterDate, filterMonth, filterYear]);

  const loadTransactions = async () => {
    try {
      const [purchasesRes, salesRes] = await Promise.all([
        purchasesService.findAll(),
        salesService.findAll()
      ]);

      const purchases = purchasesRes.data
        .filter((p: any) => !user?.branchId || p.branchId === user?.branchId) 
        .map((p: any) => ({ ...p, type: 'COMPRA' }));
      
      const sales = salesRes.data
        .filter((s: any) => !user?.branchId || s.branchId === user?.branchId) 
        .map((s: any) => ({ ...s, type: 'VENTA' }));

      const all = [...purchases, ...sales].sort((a, b) => 
        new Date(b.date).getTime() - new Date(a.date).getTime()
      );

      setTransactions(all);
      setFilteredTransactions(all);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let result = [...transactions];

    if (filterDate) {
      result = result.filter(tx => new Date(tx.date).toISOString().split('T')[0] === filterDate);
    }

    if (filterMonth) {
      result = result.filter(tx => {
        const d = new Date(tx.date);
        return (d.getMonth() + 1).toString() === filterMonth;
      });
    }
    
    if (filterMonth && filterYear) {
       result = result.filter(tx => {
         const d = new Date(tx.date);
         return (d.getMonth() + 1) === Number(filterMonth) && d.getFullYear() === Number(filterYear);
       });
    } else if (filterMonth && !filterYear) {
       const currentYear = new Date().getFullYear();
       result = result.filter(tx => {
         const d = new Date(tx.date);
         return (d.getMonth() + 1) === Number(filterMonth) && d.getFullYear() === currentYear;
       });
    } else if (!filterMonth && filterYear) {
       result = result.filter(tx => new Date(tx.date).getFullYear() === Number(filterYear));
    }

    setFilteredTransactions(result);
  };

  const clearFilters = () => {
    setFilterDate('');
    setFilterMonth('');
    setFilterYear('');
  };

  const handleReverse = async (tx: any) => {
    const reason = prompt(`¿Está seguro de anular esta ${tx.type}? Ingrese el motivo:`);
    if (!reason) return;

    try {
      if (tx.type === 'COMPRA') {
        await purchasesService.reverse(tx.id, { userId: user?.id || '', reason });
      } else {
        await salesService.reverse(tx.id, { userId: user?.id || '', reason });
      }
      alert('Operación anulada correctamente.');
      loadTransactions();
    } catch (error: any) {
      console.error(error);
      alert('Error al anular: ' + (error.response?.data?.message || 'Error desconocido'));
    }
  };

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex flex-col md:flex-row justify-between items-center mb-6">
        <div className="flex items-center mb-4 md:mb-0">
          <FileText className="h-8 w-8 text-blue-600 mr-3" />
          <h1 className="text-2xl font-bold text-gray-800">Reporte de Transacciones</h1>
        </div>
        
        {/* Filters */}
        <div className="flex flex-wrap gap-2 items-end">
           <div>
             <label className="block text-xs font-medium text-gray-500">Día Específico</label>
             <input 
               type="date" 
               className="border rounded p-2 text-sm"
               value={filterDate}
               onChange={(e) => { setFilterDate(e.target.value); setFilterMonth(''); setFilterYear(''); }}
             />
           </div>
           
           <div className="flex items-center text-gray-400 font-bold px-1">O</div>

           <div>
             <label className="block text-xs font-medium text-gray-500">Mes</label>
             <select 
               className="border rounded p-2 text-sm w-32"
               value={filterMonth}
               onChange={(e) => { setFilterMonth(e.target.value); setFilterDate(''); }}
             >
               <option value="">Todos</option>
               <option value="1">Enero</option>
               <option value="2">Febrero</option>
               <option value="3">Marzo</option>
               <option value="4">Abril</option>
               <option value="5">Mayo</option>
               <option value="6">Junio</option>
               <option value="7">Julio</option>
               <option value="8">Agosto</option>
               <option value="9">Septiembre</option>
               <option value="10">Octubre</option>
               <option value="11">Noviembre</option>
               <option value="12">Diciembre</option>
             </select>
           </div>

           <div>
             <label className="block text-xs font-medium text-gray-500">Año</label>
             <select 
               className="border rounded p-2 text-sm w-24"
               value={filterYear}
               onChange={(e) => { setFilterYear(e.target.value); setFilterDate(''); }}
             >
               <option value="">Todos</option>
               <option value="2024">2024</option>
               <option value="2025">2025</option>
               <option value="2026">2026</option>
             </select>
           </div>

           <button 
             onClick={clearFilters}
             className="px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded text-sm h-10"
           >
             Limpiar
           </button>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fecha</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tipo</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Entidad</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Moneda</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Monto</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tasa</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Pesos</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Estado</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Acciones</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredTransactions.map((tx) => (
              <tr key={tx.id} className={tx.status === 'reversed' ? 'bg-gray-50 opacity-60' : ''}>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {new Date(tx.date).toLocaleDateString()} {new Date(tx.date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                    tx.status === 'reversed' ? 'bg-gray-200 text-gray-600 line-through' :
                    tx.type === 'COMPRA' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'
                  }`}>
                    {tx.type} {tx.status === 'reversed' ? '(ANULADA)' : ''}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {tx.type === 'COMPRA' 
                    ? (tx.provider?.name || tx.providerName || 'Proveedor General') 
                    : (tx.client?.name || tx.clientName || 'Cliente General')}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {tx.currency?.code}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                  {Number(tx.amount).toLocaleString('es-CO')}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 font-mono">
                  {Number(tx.rate).toLocaleString('es-CO')}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900">
                  $ {Number(tx.totalPesos).toLocaleString('es-CO')}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                   {tx.status === 'reversed' ? (
                      <span className="text-gray-500 text-xs font-bold">ANULADO</span>
                   ) : tx.pendingBalance > 0 ? (
                     <span className="text-red-600 text-xs font-bold">
                       Debe: $ {Number(tx.pendingBalance).toLocaleString('es-CO')}
                     </span>
                   ) : (
                     <span className="text-green-600 text-xs font-bold">Pagado</span>
                   )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  {tx.status !== 'reversed' && (
                    <button
                      onClick={() => handleReverse(tx)}
                      className="text-red-600 hover:text-red-900 flex items-center text-xs border border-red-200 px-2 py-1 rounded hover:bg-red-50"
                      title="Anular Operación (Reverso)"
                    >
                      <RotateCcw className="h-3 w-3 mr-1" />
                      Anular
                    </button>
                  )}
                </td>
              </tr>
            ))}
            {transactions.length === 0 && !loading && (
              <tr>
                <td colSpan={9} className="px-6 py-4 text-center text-gray-500">
                  No hay movimientos registrados.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Reports;
