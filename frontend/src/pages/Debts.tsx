import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { salesService, purchasesService, paymentsService, oldDebtsService } from '../api/services';
import { Wallet, ArrowDownCircle, ArrowUpCircle, CheckCircle, Clock, PlusCircle, History, RotateCcw, Trash2, Banknote } from 'lucide-react';

const Debts = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'receivable' | 'payable'>('receivable');
  const [receivables, setReceivables] = useState<any[]>([]);
  const [payables, setPayables] = useState<any[]>([]);
  const [loans, setLoans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Old Debt Modal
  const [showOldDebtModal, setShowOldDebtModal] = useState(false);
  const [clientName, setClientName] = useState('');
  const [description, setDescription] = useState('');
  const [totalAmount, setTotalAmount] = useState('');
  const [isLoan, setIsLoan] = useState(false);

  // Increase Debt Modal
  const [showIncreaseModal, setShowIncreaseModal] = useState(false);
  const [increaseAmount, setIncreaseAmount] = useState('');

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
        // Show ALL sales, even if paid or overpaid
        // .filter((s: any) => Number(s.pendingBalance) > 0)
        .map((s: any) => ({ ...s, type: 'SALE' }));

      // 2. Process Old Debts
      const activeOldDebts = oldDebtsRes.data
        // Show ALL debts, even if not active (so we can see overpayments that reached 0 or negative)
        //.filter((d: any) => d.isActive) 
        .map((d: any) => ({
            id: d.id,
            date: d.createdAt,
            client: d.type === 'CLIENT' || d.type === 'LOAN' || !d.type ? { name: d.clientName } : undefined,
            provider: d.type === 'PROVIDER' ? { name: d.clientName } : undefined,
            clientName: d.clientName,
            amount: 0, 
            currency: { code: 'COP' },
            rate: 0,
            totalPesos: d.totalAmount,
            pendingBalance: d.pendingBalance,
            paidAmount: d.paidAmount,
            type: 'OLD_DEBT',
            oldDebtType: d.type || 'CLIENT', 
            description: d.description
        }));

      const oldReceivables = activeOldDebts.filter((d: any) => d.oldDebtType === 'CLIENT' || d.oldDebtType === 'LOAN' || !d.oldDebtType);
      const oldPayables = activeOldDebts.filter((d: any) => d.oldDebtType === 'PROVIDER');
      
      // Merge Receivables
      const allReceivables = [...pendingSales, ...oldReceivables]
        .sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime());
      
      setReceivables(allReceivables);

      // 3. Process Purchases (Payables)
      const pendingPurchases = purchasesRes.data
        .filter((p: any) => Number(p.pendingBalance) > 0)
        .map((p: any) => ({ ...p, type: 'PURCHASE' }));

      const allPayables = [...pendingPurchases, ...oldPayables]
        .sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime());

      setPayables(allPayables);

      // 4. Process Loans (None, merged into receivables)
      setLoans([]);

    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateOldDebt = async (e: React.FormEvent) => {
      e.preventDefault();
      try {
          let type = 'CLIENT';
          if (activeTab === 'payable') type = 'PROVIDER';
          
          if (activeTab === 'receivable' && isLoan) {
              type = 'LOAN';
          }

          await oldDebtsService.create({
              clientName,
              description,
              totalAmount: Number(totalAmount),
              userId: user?.id,
              type
          });
          
          let successMsg = 'Deuda registrada';
          if (type === 'LOAN') successMsg = 'Préstamo registrado (Dinero descontado de Caja)';
          
          alert(successMsg);
          setShowOldDebtModal(false);
          setClientName('');
          setDescription('');
          setTotalAmount('');
          setIsLoan(false);
          loadData();
      } catch (error: any) {
          alert('Error: ' + (error.response?.data?.message || 'Error desconocido'));
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
          // Allow overpayment logic
          // alert('El abono no puede ser mayor al saldo pendiente.');
          // return;
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

  const handleOpenIncrease = (tx: any) => {
      setSelectedDebt(tx);
      setShowIncreaseModal(true);
  };

  const handleIncreaseDebt = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!increaseAmount || isNaN(Number(increaseAmount)) || Number(increaseAmount) <= 0) return;

      try {
          await oldDebtsService.increase({
              debtId: selectedDebt.id,
              amount: Number(increaseAmount),
              userId: user?.id
          });
          alert('Deuda incrementada correctamente');
          setShowIncreaseModal(false);
          setIncreaseAmount('');
          loadData();
      } catch (error: any) {
          alert('Error: ' + (error.response?.data?.message || 'Error desconocido'));
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
      if (!window.confirm('¿Anular este movimiento?')) return;
      try {
          await paymentsService.reverse(paymentId, user?.id || '');
          alert('Movimiento anulado');
          // Reload payments
          const type = selectedDebt.type === 'SALE' ? 'sale' : selectedDebt.type === 'PURCHASE' ? 'purchase' : 'old-debt';
          const res = await paymentsService.findByTransaction(type, selectedDebt.id);
          setDebtPayments(res.data);
          loadData(); // Reload main table
      } catch (error: any) {
          alert(error.response?.data?.message || 'Error al anular');
      }
  };

  const handleDeleteDebt = async (tx: any) => {
      if (!window.confirm('¿ELIMINAR DEUDA COMPLETA?\n\nEsta acción borrará la deuda y reversará TODOS los abonos y préstamos asociados.\n\nEl dinero de los abonos será devuelto/retirado de la caja.\n\n¿Estás seguro?')) return;
      
      try {
          await oldDebtsService.remove(tx.id);
          alert('Deuda eliminada correctamente');
          loadData();
      } catch (error: any) {
          alert('Error: ' + (error.response?.data?.message || 'Error al eliminar'));
      }
  };

  const renderTable = (transactions: any[], type: 'receivable' | 'payable' | 'loans') => (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Fecha</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
               {type === 'payable' ? 'Proveedor' : type === 'loans' ? 'Prestatario' : 'Cliente'}
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Concepto</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total Original</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Abonado</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Saldo / Estado</th>
            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Acción</th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {transactions.map((tx) => {
             const total = Number(tx.totalPesos);
             const paid = Number(tx.paidAmount);
             // Calculate pending dynamically to ensure negative values (surplus) are captured correctly
             // regardless of backend logic.
             const pending = total - paid;
             
             // Logic for status display
             let statusLabel = '';
             let statusColor = '';
             let amountDisplay = '';

             if (pending > 0) {
                 statusLabel = 'Deuda Pendiente';
                 statusColor = 'text-red-600';
                 amountDisplay = `$ ${pending.toLocaleString('es-CO')}`;
             } else if (pending === 0) {
                 statusLabel = 'Deuda Pagada';
                 statusColor = 'text-green-600';
                 amountDisplay = '$ 0';
             } else {
                 // Pending is negative (Overpayment)
                 const surplus = Math.abs(pending);
                 
                 if (type === 'receivable') {
                     // Client paid more -> WE owe them
                     statusLabel = 'Saldo a Favor (Debemos)';
                     statusColor = 'text-blue-600'; // Or Orange
                 } else {
                     // We paid more -> They owe us
                     statusLabel = 'Saldo a Favor (Nos deben)';
                     statusColor = 'text-blue-600'; 
                 }
                 amountDisplay = `$ ${surplus.toLocaleString('es-CO')}`;
             }

             return (
              <tr key={tx.id}>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {new Date(tx.date).toLocaleDateString()}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  {type === 'payable' ? (tx.provider?.name || 'Proveedor General') : (tx.client?.name || tx.clientName || 'Cliente General')}
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
                  $ {paid.toLocaleString('es-CO')}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex flex-col">
                      <span className="text-xs text-gray-500 font-medium uppercase tracking-wider mb-1">
                          {statusLabel}
                      </span>
                      <span className={`font-bold text-sm ${statusColor}`}>
                          {amountDisplay}
                      </span>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right flex justify-end gap-2">
                  <button
                    onClick={() => handlePayment(tx)}
                    className="inline-flex items-center px-3 py-1 border border-transparent text-xs font-medium rounded shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none"
                    title="Registrar Abono"
                  >
                    <Wallet className="h-3 w-3 mr-1" />
                    Abonar
                  </button>
                  {tx.type === 'OLD_DEBT' && (
                    <button
                        onClick={() => handleOpenIncrease(tx)}
                        className="inline-flex items-center px-3 py-1 border border-blue-300 text-xs font-medium rounded shadow-sm text-blue-700 bg-blue-50 hover:bg-blue-100 focus:outline-none"
                        title="Sumar más deuda (Nuevo préstamo)"
                    >
                        <PlusCircle className="h-3 w-3 mr-1" />
                        Sumar
                    </button>
                  )}
                  <button
                    onClick={() => handleOpenHistory(tx)}
                    className="inline-flex items-center px-3 py-1 border border-gray-300 text-xs font-medium rounded shadow-sm text-gray-700 bg-white hover:bg-gray-50 focus:outline-none"
                    title="Ver Historial"
                  >
                    <History className="h-3 w-3" />
                  </button>
                  {tx.type === 'OLD_DEBT' && (
                    <button
                        onClick={() => handleDeleteDebt(tx)}
                        className="inline-flex items-center px-3 py-1 border border-red-300 text-xs font-medium rounded shadow-sm text-red-700 bg-red-50 hover:bg-red-100 focus:outline-none"
                        title="Eliminar Deuda Completa"
                    >
                        <Trash2 className="h-3 w-3" />
                    </button>
                  )}
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
    </div>
  );

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <div>
            <h1 className="text-2xl font-bold text-gray-800 flex items-center">
            <Clock className="mr-2 text-blue-600" />
            Cartera y Deudas (SISTEMA ACTUALIZADO ✅)
            </h1>
            <p className="text-gray-500 text-sm mt-1">Gestiona las cuentas por cobrar, por pagar y préstamos a terceros.</p>
        </div>
        
        {/* Button for all tabs */}
        <button 
            onClick={() => setShowOldDebtModal(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center shadow"
        >
            <PlusCircle className="mr-2 h-5 w-5" />
            {activeTab === 'payable' ? 'Registrar Deuda Proveedor' : 
             'Registrar Deuda / Préstamo'}
        </button>
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
              $ {receivables
                  .filter(tx => Number(tx.pendingBalance) > 0)
                  .reduce((sum, tx) => sum + Number(tx.pendingBalance), 0)
                  .toLocaleString('es-CO')}
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
              $ {payables
                  .filter(tx => Number(tx.pendingBalance) > 0)
                  .reduce((sum, tx) => sum + Number(tx.pendingBalance), 0)
                  .toLocaleString('es-CO')}
            </span>
          </div>
        </button>
      </div>

      {/* Content */}
      {loading ? (
         <div className="text-center py-12">Cargando información financiera...</div>
      ) : (
         activeTab === 'receivable' ? renderTable(receivables, 'receivable') : 
         renderTable(payables, 'payable')
      )}

      {/* Modal Deuda Antigua / Préstamo */}
      {showOldDebtModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h2 className="text-xl font-bold mb-4">
                {activeTab === 'receivable' ? 'Registrar Deuda o Préstamo' : 
                 'Registrar Deuda Proveedor'}
            </h2>
            <p className="text-sm text-gray-500 mb-4">
                {activeTab === 'receivable' ? 'Puede registrar una deuda antigua de un cliente o un PRÉSTAMO nuevo a un tercero (que descuenta de caja).' :
                 'Use esto para registrar deudas antiguas con proveedores. El abono SALDRÁ de la Caja.'
                }
            </p>
            <form onSubmit={handleCreateOldDebt}>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700">
                    {activeTab === 'receivable' ? 'Nombre del Cliente / Prestatario' : 
                     'Nombre del Proveedor'}
                </label>
                <input type="text" required className="w-full border rounded p-2 mt-1" value={clientName} onChange={e => setClientName(e.target.value)} placeholder="Ej: Juan Pérez" />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700">Descripción / Concepto</label>
                <input type="text" required className="w-full border rounded p-2 mt-1" value={description} onChange={e => setDescription(e.target.value)} placeholder="Ej: Préstamo personal" />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700">Monto Total</label>
                <input type="number" required className="w-full border rounded p-2 mt-1" value={totalAmount} onChange={e => setTotalAmount(e.target.value)} placeholder="0" />
              </div>

              {activeTab === 'receivable' && (
                  <div className="mb-4 p-3 bg-blue-50 rounded border border-blue-100">
                      <label className="flex items-center space-x-2 cursor-pointer">
                          <input 
                              type="checkbox" 
                              className="form-checkbox h-4 w-4 text-blue-600" 
                              checked={isLoan} 
                              onChange={(e) => setIsLoan(e.target.checked)}
                          />
                          <span className="text-sm text-blue-800 font-medium">¿Es un Préstamo Nuevo? (Sale dinero de Caja YA)</span>
                      </label>
                  </div>
              )}

              <div className="flex justify-end gap-2 mt-6">
                <button type="button" onClick={() => setShowOldDebtModal(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded">Cancelar</button>
                <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">Registrar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Aumentar Deuda */}
      {showIncreaseModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-sm w-full p-6">
            <h2 className="text-xl font-bold mb-4">Aumentar Deuda / Préstamo</h2>
            <p className="text-sm text-gray-500 mb-4">
                {activeTab === 'receivable'
                   ? 'Esto registrará un NUEVO PRÉSTAMO adicional. El dinero SALDRÁ de la Caja.'
                   : 'Esto registrará una NUEVA DEUDA con el proveedor.'
                }
            </p>
            <form onSubmit={handleIncreaseDebt}>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700">Monto Adicional</label>
                <input 
                    type="number" 
                    required 
                    className="w-full border rounded p-2 mt-1" 
                    value={increaseAmount} 
                    onChange={e => setIncreaseAmount(e.target.value)} 
                    placeholder="0" 
                    autoFocus
                />
              </div>
              <div className="flex justify-end gap-2 mt-6">
                <button type="button" onClick={() => setShowIncreaseModal(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded">Cancelar</button>
                <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">Guardar</button>
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
                <h2 className="text-xl font-bold">Historial de Movimientos</h2>
                <button onClick={() => setShowHistoryModal(false)} className="text-gray-500 hover:text-gray-700">✕</button>
            </div>
            
            <div className="mb-4 text-sm text-gray-600">
                <p><strong>{activeTab === 'payable' ? 'Proveedor' : 'Cliente/Prestatario'}:</strong> {selectedDebt.clientName || selectedDebt.client?.name || selectedDebt.provider?.name}</p>
                <p><strong>Saldo Pendiente:</strong> $ {Number(selectedDebt.pendingBalance).toLocaleString()}</p>
            </div>

            <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
               <thead className="bg-gray-50">
                  <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Fecha</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Tipo</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Monto</th>
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
                          <td className="px-4 py-2 text-xs font-bold uppercase">
                              {p.type === 'DEBT_INCREASE' 
                                ? <span className="text-blue-600">Nuevo Préstamo</span> 
                                : <span className="text-green-600">Abono</span>}
                          </td>
                          <td className={`px-4 py-2 text-sm font-bold ${
                              p.isReversed ? 'line-through text-gray-400' : 
                              p.type === 'DEBT_INCREASE' ? 'text-blue-600' : 'text-green-600'
                          }`}>
                              {p.type === 'DEBT_INCREASE' ? '+' : '-'} $ {Number(p.amount).toLocaleString()}
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
                      <tr><td colSpan={5} className="px-4 py-4 text-center text-gray-500">No hay movimientos registrados.</td></tr>
                  )}
               </tbody>
            </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Debts;