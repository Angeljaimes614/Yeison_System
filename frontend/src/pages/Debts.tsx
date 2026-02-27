import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { salesService, purchasesService, paymentsService, oldDebtsService } from '../api/services';
import { Wallet, ArrowDownCircle, ArrowUpCircle, CheckCircle, Clock, PlusCircle, History, RotateCcw } from 'lucide-react';

const Debts = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'receivable' | 'payable'>('receivable');
  const [receivables, setReceivables] = useState<any[]>([]);
  const [payables, setPayables] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Old Debt Modal
  const [showOldDebtModal, setShowOldDebtModal] = useState(false);
  const [clientName, setClientName] = useState('');
  const [description, setDescription] = useState('');
  const [totalAmount, setTotalAmount] = useState('');

  // History Modal
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [debtPayments, setDebtPayments] = useState<any[]>([]);
  const [selectedDebt, setSelectedDebt] = useState<any>(null);

  useEffect(() => {
    loadData();
  }, [user]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [salesRes, purchasesRes, oldDebtsRes] = await Promise.all([
        salesService.findAll(),
        purchasesService.findAll(),
        oldDebtsService.findAll()
      ]);

      // 1. Process Sales (Receivables)
      const pendingSales = salesRes.data
        .filter((s: any) => Number(s.pendingBalance) > 0)
        .map((s: any) => ({ ...s, type: 'SALE' }));

      // 2. Process Old Debts (Receivables)
      const activeOldDebts = oldDebtsRes.data
        .filter((d: any) => d.isActive && Number(d.pendingBalance) > 0)
        .map((d: any) => ({
            id: d.id,
            date: d.createdAt,
            client: { name: d.clientName }, // Adapt to match Sale structure
            amount: 0, // No foreign currency
            currency: { code: 'COP' },
            rate: 0,
            totalPesos: d.totalAmount,
            pendingBalance: d.pendingBalance,
            paidAmount: d.paidAmount,
            type: 'OLD_DEBT',
            description: d.description
        }));

      // Merge Receivables
      const allReceivables = [...pendingSales, ...activeOldDebts]
        .sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime());
      
      setReceivables(allReceivables);

      // 3. Process Purchases (Payables)
      const pendingPurchases = purchasesRes.data
        .filter((p: any) => Number(p.pendingBalance) > 0)
        .map((p: any) => ({ ...p, type: 'PURCHASE' }))
        .sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime());

      setPayables(pendingPurchases);

    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateOldDebt = async (e: React.FormEvent) => {
      e.preventDefault();
      try {
          await oldDebtsService.create({
              clientName,
              description,
              totalAmount: Number(totalAmount),
              userId: user?.id
          });
          alert('Deuda antigua registrada correctamente');
          setShowOldDebtModal(false);
          setClientName('');
          setDescription('');
          setTotalAmount('');
          loadData();
      } catch (error: any) {
          alert('Error al registrar');
      }
  };

  const handlePayment = async (tx: any) => {
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
          if (tx.type === 'OLD_DEBT') {
              await oldDebtsService.registerPayment({
                  debtId: tx.id,
                  amount,
                  userId: user?.id
              });
          } else {
              // SALE or PURCHASE
              await paymentsService.create({
                  date: new Date().toISOString(),
                  amount,
                  method: 'cash',
                  purchaseId: tx.type === 'PURCHASE' ? tx.id : undefined,
                  saleId: tx.type === 'SALE' ? tx.id : undefined,
                  createdById: user?.id
              });
          }
          alert('Abono registrado correctamente');
          loadData();
      } catch (error: any) {
          console.error(error);
          alert('Error al registrar abono: ' + (error.response?.data?.message || 'Error desconocido'));
      }
  };

  const handleOpenHistory = async (tx: any) => {
      setSelectedDebt(tx);
      try {
          const type = tx.type === 'SALE' ? 'sale' : tx.type === 'PURCHASE' ? 'purchase' : 'old-debt';
          const res = await paymentsService.findByTransaction(type, tx.id);
          setDebtPayments(res.data);
          setShowHistoryModal(true);
      } catch (error) {
          console.error(error);
          alert('Error al cargar historial');
      }
  };

  const handleReversePayment = async (paymentId: string) => {
      if (!window.confirm('¿Anular este abono? El dinero saldrá de la caja y la deuda aumentará.')) return;
      try {
          await paymentsService.reverse(paymentId, user?.id || '');
          alert('Abono anulado');
          // Reload payments
          const type = selectedDebt.type === 'SALE' ? 'sale' : selectedDebt.type === 'PURCHASE' ? 'purchase' : 'old-debt';
          const res = await paymentsService.findByTransaction(type, selectedDebt.id);
          setDebtPayments(res.data);
          loadData(); // Reload main table
      } catch (error: any) {
          alert(error.response?.data?.message || 'Error al anular');
      }
  };

  const renderTable = (transactions: any[], isPayable: boolean) => (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Fecha</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
               {isPayable ? 'Proveedor' : 'Cliente'}
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
             const paid = total - pending; // or use tx.paidAmount
             const progress = total > 0 ? (paid / total) * 100 : 0;

             return (
              <tr key={tx.id}>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {new Date(tx.date).toLocaleDateString()}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  {isPayable ? (tx.provider?.name || 'Proveedor General') : (tx.client?.name || tx.clientName || 'Cliente General')}
                  {tx.type === 'OLD_DEBT' && <span className="ml-2 px-2 py-0.5 text-xs bg-yellow-100 text-yellow-800 rounded-full">Antigua</span>}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                   {tx.type === 'OLD_DEBT' ? (
                       <span className="italic">{tx.description || 'Deuda Antigua'}</span>
                   ) : (
                       `${Number(tx.amount).toLocaleString()} ${tx.currency?.code} @ ${Number(tx.rate).toLocaleString()}`
                   )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-bold">
                  $ {total.toLocaleString('es-CO')}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600">
                  $ {Number(tx.paidAmount || paid).toLocaleString('es-CO')}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="text-red-600 font-bold text-sm">$ {pending.toLocaleString('es-CO')}</span>
                  <div className="w-full bg-gray-200 rounded-full h-1.5 mt-1">
                    <div className="bg-green-500 h-1.5 rounded-full" style={{ width: `${progress}%` }}></div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right flex justify-end gap-2">
                  <button
                    onClick={() => handlePayment(tx)}
                    className="inline-flex items-center px-3 py-1 border border-transparent text-xs font-medium rounded shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none"
                  >
                    <Wallet className="h-3 w-3 mr-1" />
                    Abonar
                  </button>
                  <button
                    onClick={() => handleOpenHistory(tx)}
                    className="inline-flex items-center px-3 py-1 border border-gray-300 text-xs font-medium rounded shadow-sm text-gray-700 bg-white hover:bg-gray-50 focus:outline-none"
                    title="Ver Historial de Abonos"
                  >
                    <History className="h-3 w-3" />
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
      <div className="flex justify-between items-center mb-6">
        <div>
            <h1 className="text-2xl font-bold text-gray-800 flex items-center">
            <Clock className="mr-2 text-blue-600" />
            Cartera y Deudas (Divisas)
            </h1>
            <p className="text-gray-500 text-sm mt-1">Gestiona las cuentas por cobrar y por pagar de operaciones de divisas.</p>
        </div>
        
        {activeTab === 'receivable' && (
            <button 
                onClick={() => setShowOldDebtModal(true)}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center shadow"
            >
                <PlusCircle className="mr-2 h-5 w-5" />
                Registrar Deuda Antigua
            </button>
        )}
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
         activeTab === 'receivable' ? renderTable(receivables, false) : renderTable(payables, true)
      )}

      {/* Modal Deuda Antigua */}
      {showOldDebtModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h2 className="text-xl font-bold mb-4">Registrar Deuda Antigua</h2>
            <p className="text-sm text-gray-500 mb-4">
                Use esto para clientes que ya le debían dinero antes de usar este sistema. 
                El dinero abonado a esta deuda entrará a la Caja Operativa.
            </p>
            <form onSubmit={handleCreateOldDebt}>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700">Nombre del Cliente</label>
                <input type="text" required className="w-full border rounded p-2 mt-1" value={clientName} onChange={e => setClientName(e.target.value)} placeholder="Ej: Juan Pérez" />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700">Descripción / Concepto</label>
                <input type="text" required className="w-full border rounded p-2 mt-1" value={description} onChange={e => setDescription(e.target.value)} placeholder="Ej: Saldo pendiente 2024" />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700">Monto Total de la Deuda</label>
                <input type="number" required className="w-full border rounded p-2 mt-1" value={totalAmount} onChange={e => setTotalAmount(e.target.value)} placeholder="0" />
              </div>

              <div className="flex justify-end gap-2 mt-6">
                <button type="button" onClick={() => setShowOldDebtModal(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded">Cancelar</button>
                <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">Registrar Deuda</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Historial Abonos */}
      {showHistoryModal && selectedDebt && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full p-6 max-h-[80vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold">Historial de Abonos</h2>
                <button onClick={() => setShowHistoryModal(false)} className="text-gray-500 hover:text-gray-700">✕</button>
            </div>
            
            <div className="mb-4 text-sm text-gray-600">
                <p><strong>Cliente/Proveedor:</strong> {activeTab === 'receivable' ? (selectedDebt.client?.name || selectedDebt.clientName) : (selectedDebt.provider?.name)}</p>
                <p><strong>Total Deuda:</strong> $ {Number(selectedDebt.totalPesos).toLocaleString()}</p>
                <p><strong>Saldo Pendiente:</strong> $ {Number(selectedDebt.pendingBalance).toLocaleString()}</p>
            </div>

            <table className="min-w-full divide-y divide-gray-200">
               <thead className="bg-gray-50">
                  <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Fecha</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Monto Abonado</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Usuario</th>
                      <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">Acción</th>
                  </tr>
               </thead>
               <tbody className="divide-y divide-gray-200">
                  {debtPayments.map(p => (
                      <tr key={p.id} className={p.isReversed ? 'bg-red-50' : ''}>
                          <td className="px-4 py-2 text-sm">
                              {new Date(p.date).toLocaleDateString()} {new Date(p.date).toLocaleTimeString()}
                              {p.isReversed && <span className="block text-xs text-red-600 font-bold">ANULADO</span>}
                          </td>
                          <td className={`px-4 py-2 text-sm font-bold ${p.isReversed ? 'line-through text-gray-400' : 'text-green-600'}`}>
                              $ {Number(p.amount).toLocaleString()}
                          </td>
                          <td className="px-4 py-2 text-sm text-gray-500">
                              {p.createdBy?.username || 'Sistema'}
                          </td>
                          <td className="px-4 py-2 text-right text-sm">
                              {!p.isReversed && (
                                  <button 
                                      onClick={() => handleReversePayment(p.id)}
                                      className="text-red-500 hover:text-red-700 flex items-center justify-end w-full gap-1"
                                  >
                                      <RotateCcw className="h-3 w-3" /> Anular
                                  </button>
                              )}
                          </td>
                      </tr>
                  ))}
                  {debtPayments.length === 0 && (
                      <tr><td colSpan={4} className="px-4 py-4 text-center text-gray-500">No hay abonos registrados.</td></tr>
                  )}
               </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default Debts;
