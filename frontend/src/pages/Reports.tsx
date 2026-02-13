import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { purchasesService, salesService } from '../api/services';
import { FileText } from 'lucide-react';

const Reports = () => {
  const { user } = useAuth();
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTransactions();
  }, [user]);

  const loadTransactions = async () => {
    try {
      const [purchasesRes, salesRes] = await Promise.all([
        purchasesService.findAll(),
        salesService.findAll()
      ]);

      const purchases = purchasesRes.data
        .filter((p: any) => p.branchId === user?.branchId)
        .map((p: any) => ({ ...p, type: 'COMPRA' }));
      
      const sales = salesRes.data
        .filter((s: any) => s.branchId === user?.branchId)
        .map((s: any) => ({ ...s, type: 'VENTA' }));

      const all = [...purchases, ...sales].sort((a, b) => 
        new Date(b.date).getTime() - new Date(a.date).getTime()
      );

      setTransactions(all);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex items-center mb-6">
        <FileText className="h-8 w-8 text-blue-600 mr-3" />
        <h1 className="text-2xl font-bold text-gray-800">Reporte de Transacciones</h1>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
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
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {transactions.map((tx) => (
              <tr key={tx.id}>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {new Date(tx.date).toLocaleDateString()} {new Date(tx.date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                    tx.type === 'COMPRA' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'
                  }`}>
                    {tx.type}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {tx.type === 'COMPRA' ? tx.provider?.name : tx.client?.name}
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
                   {tx.pendingBalance > 0 ? (
                     <span className="text-red-600 text-xs font-bold">
                       Debe: $ {Number(tx.pendingBalance).toLocaleString('es-CO')}
                     </span>
                   ) : (
                     <span className="text-green-600 text-xs font-bold">Pagado</span>
                   )}
                </td>
              </tr>
            ))}
            {transactions.length === 0 && !loading && (
              <tr>
                <td colSpan={8} className="px-6 py-4 text-center text-gray-500">
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
