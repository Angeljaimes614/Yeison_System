import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { salesService, purchasesService, paymentsService } from '../api/services';
import { Wallet, ArrowDownCircle, ArrowUpCircle, CheckCircle, Clock } from 'lucide-react';

const Debts = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'receivable' | 'payable'>('receivable');
  const [receivables, setReceivables] = useState<any[]>([]);
  const [payables, setPayables] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [user]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [salesRes, purchasesRes] = await Promise.all([
        salesService.findAll(),
        purchasesService.findAll()
      ]);

      // Filter Receivables (Sales with pending balance)
      const pendingSales = salesRes.data
        .filter((s: any) => Number(s.pendingBalance) > 0)
        .sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime());
      
      setReceivables(pendingSales);

      // Filter Payables (Purchases with pending balance)
      const pendingPurchases = purchasesRes.data
        .filter((p: any) => Number(p.pendingBalance) > 0)
        .sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime());

      setPayables(pendingPurchases);

    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handlePayment = async (tx: any, type: 'SALE' | 'PURCHASE') => {
      const amountStr = prompt(`Saldo pendiente: $${Number(tx.pendingBalance).toLocaleString()}\nIngrese monto a abonar:`);
      if (!amountStr) return;
      
      const amount = Number(amountStr);
      if (isNaN(amount) || amount <= 0) {
          alert('Monto inválido');
          return;
      }

      if (amount > Number(tx.pendingBalance)) {
          alert('El abono no puede ser mayor al saldo pendiente.');
          return;
      }

      try {
          await paymentsService.create({
              date: new Date().toISOString(),
              amount,
              method: 'cash',
              purchaseId: type === 'PURCHASE' ? tx.id : undefined,
              saleId: type === 'SALE' ? tx.id : undefined,
              createdById: user?.id
          });
          alert('Abono registrado correctamente');
          loadData();
      } catch (error: any) {
          console.error(error);
          alert('Error al registrar abono: ' + (error.response?.data?.message || 'Error desconocido'));
      }
  };

  const renderTable = (transactions: any[], type: 'SALE' | 'PURCHASE') => (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Fecha</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
               {type === 'SALE' ? 'Cliente' : 'Proveedor'}
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Concepto</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total Original</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Abonado</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Saldo Pendiente</th>
            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Acción</th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {transactions.map((tx) => {
             const total = Number(tx.totalPesos);
             const pending = Number(tx.pendingBalance);
             const paid = total - pending;
             const progress = (paid / total) * 100;

             return (
              <tr key={tx.id}>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {new Date(tx.date).toLocaleDateString()}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  {type === 'SALE' ? (tx.client?.name || 'Cliente General') : (tx.provider?.name || 'Proveedor General')}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                   {Number(tx.amount).toLocaleString()} {tx.currency?.code} @ {Number(tx.rate).toLocaleString()}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-bold">
                  $ {total.toLocaleString('es-CO')}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600">
                  $ {paid.toLocaleString('es-CO')}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="text-red-600 font-bold text-sm">$ {pending.toLocaleString('es-CO')}</span>
                  <div className="w-full bg-gray-200 rounded-full h-1.5 mt-1">
                    <div className="bg-green-500 h-1.5 rounded-full" style={{ width: `${progress}%` }}></div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right">
                  <button
                    onClick={() => handlePayment(tx, type)}
                    className="inline-flex items-center px-3 py-1 border border-transparent text-xs font-medium rounded shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none"
                  >
                    <Wallet className="h-3 w-3 mr-1" />
                    Abonar
                  </button>
                </td>
              </tr>
             );
          })}
          {transactions.length === 0 && (
            <tr>
              <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                <CheckCircle className="h-12 w-12 text-green-100 mx-auto mb-3" />
                <p>¡Excelente! No hay cuentas pendientes en esta sección.</p>
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800 flex items-center">
          <Clock className="mr-2 text-blue-600" />
          Cartera y Deudas (Divisas)
        </h1>
        <p className="text-gray-500 text-sm mt-1">Gestiona las cuentas por cobrar y por pagar de operaciones de divisas.</p>
      </div>

      <div className="flex space-x-4 mb-6">
        <button
          onClick={() => setActiveTab('receivable')}
          className={`flex-1 py-4 px-6 rounded-lg shadow-sm flex items-center justify-center transition-all ${
            activeTab === 'receivable' 
              ? 'bg-green-50 border-2 border-green-500 text-green-700' 
              : 'bg-white hover:bg-gray-50 text-gray-600'
          }`}
        >
          <ArrowDownCircle className={`mr-3 h-8 w-8 ${activeTab === 'receivable' ? 'text-green-600' : 'text-gray-400'}`} />
          <div className="text-left">
            <span className="block text-xs font-bold uppercase tracking-wide">Por Cobrar (Clientes)</span>
            <span className="text-2xl font-bold">
              $ {receivables.reduce((sum, tx) => sum + Number(tx.pendingBalance), 0).toLocaleString('es-CO')}
            </span>
          </div>
        </button>

        <button
          onClick={() => setActiveTab('payable')}
          className={`flex-1 py-4 px-6 rounded-lg shadow-sm flex items-center justify-center transition-all ${
            activeTab === 'payable' 
              ? 'bg-red-50 border-2 border-red-500 text-red-700' 
              : 'bg-white hover:bg-gray-50 text-gray-600'
          }`}
        >
          <ArrowUpCircle className={`mr-3 h-8 w-8 ${activeTab === 'payable' ? 'text-red-600' : 'text-gray-400'}`} />
          <div className="text-left">
            <span className="block text-xs font-bold uppercase tracking-wide">Por Pagar (Proveedores)</span>
            <span className="text-2xl font-bold">
              $ {payables.reduce((sum, tx) => sum + Number(tx.pendingBalance), 0).toLocaleString('es-CO')}
            </span>
          </div>
        </button>
      </div>

      {/* Content */}
      {loading ? (
         <div className="text-center py-12">Cargando información financiera...</div>
      ) : (
         activeTab === 'receivable' ? renderTable(receivables, 'SALE') : renderTable(payables, 'PURCHASE')
      )}
    </div>
  );
};

export default Debts;
