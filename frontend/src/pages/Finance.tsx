import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { capitalService, inventoryService, investmentsService } from '../api/services';
import { Wallet, TrendingUp, DollarSign, Activity, PieChart, ArrowUpRight, ArrowDownRight, CreditCard } from 'lucide-react';

const Finance = () => {
  const { user } = useAuth();
  const [capital, setCapital] = useState<any>(null);
  const [inventoryValue, setInventoryValue] = useState(0);
  const [movements, setMovements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Forms
  const [activeTab, setActiveTab] = useState<'expense' | 'injection' | 'withdrawal'>('expense');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');

  useEffect(() => {
    loadData();
  }, [user]);

  const loadData = async () => {
    try {
      const [capRes, invRes, prodRes, movRes] = await Promise.all([
        capitalService.findAll(),
        inventoryService.findGlobal(), // Use Global Inventory for currencies
        investmentsService.findAll(),  // Products (Cellphones, etc)
        capitalService.getMovements()
      ]);

      // 1. Capital
      const userCapital = Array.isArray(capRes.data) ? capRes.data[0] : capRes.data;
      setCapital(userCapital || { operativePlante: 0, accumulatedProfit: 0 });

      // 2. Inventory Value Calculation
      // A. Currencies Value (COP Cost)
      const currencyValue = invRes.data.reduce((acc: number, item: any) => {
        return acc + Number(item.totalCostCOP || 0);
      }, 0);

      // B. Products Value (Stock * Unit Cost)
      const productValue = prodRes.data.reduce((acc: number, item: any) => {
          if (item.status === 'ACTIVE') {
              return acc + (Number(item.currentQuantity) * Number(item.unitCost));
          }
          return acc;
      }, 0);

      setInventoryValue(currencyValue + productValue);

      // 3. Movements
      setMovements(movRes.data);

    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || !description) return;

    try {
      let type: 'INJECTION' | 'WITHDRAWAL_PROFIT' | 'WITHDRAWAL_CAPITAL' = 'INJECTION';
      
      if (activeTab === 'expense') {
        type = 'WITHDRAWAL_PROFIT'; // Expense reduces profit
      } else if (activeTab === 'injection') {
        type = 'INJECTION';
      } else if (activeTab === 'withdrawal') {
        type = 'WITHDRAWAL_PROFIT'; // Profit withdrawal
      }

      await capitalService.registerMovement({
        type,
        amount: Number(amount),
        description: activeTab === 'expense' ? `GASTO: ${description}` : description,
        userId: user?.id || ''
      });

      alert('Movimiento registrado correctamente');
      setAmount('');
      setDescription('');
      loadData();
    } catch (error: any) {
      console.error(error);
      alert('Error: ' + (error.response?.data?.message || 'Error desconocido'));
    }
  };

  const netProfit = Number(capital?.accumulatedProfit || 0);
  const cash = Number(capital?.operativePlante || 0);
  const totalEquity = cash + inventoryValue; 

  return (
    <div className="max-w-6xl mx-auto p-4">
      <h1 className="text-3xl font-bold text-gray-800 mb-8 flex items-center">
        <PieChart className="mr-3 h-8 w-8 text-blue-600" />
        Gestión Financiera Unificada
      </h1>

      {/* Financial Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        {/* Cash Card */}
        <div className="bg-white p-6 rounded-xl shadow-sm border-l-4 border-blue-500">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm font-medium text-gray-500">Caja Operativa (COP)</p>
              <h3 className="text-2xl font-bold text-gray-800 mt-2">
                $ {cash.toLocaleString('es-CO')}
              </h3>
            </div>
            <div className="p-2 bg-blue-50 rounded-lg">
              <Wallet className="h-6 w-6 text-blue-600" />
            </div>
          </div>
        </div>

        {/* Inventory Card */}
        <div className="bg-white p-6 rounded-xl shadow-sm border-l-4 border-indigo-500">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm font-medium text-gray-500">Valor Inventario (Est.)</p>
              <h3 className="text-2xl font-bold text-gray-800 mt-2">
                $ {inventoryValue.toLocaleString('es-CO')}
              </h3>
            </div>
            <div className="p-2 bg-indigo-50 rounded-lg">
              <Activity className="h-6 w-6 text-indigo-600" />
            </div>
          </div>
        </div>

        {/* Net Profit Card */}
        <div className="bg-white p-6 rounded-xl shadow-sm border-l-4 border-green-500">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm font-medium text-gray-500">Utilidad Neta Acumulada</p>
              <h3 className={`text-2xl font-bold mt-2 ${netProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                $ {netProfit.toLocaleString('es-CO')}
              </h3>
              <p className="text-xs text-gray-400 mt-1">Disponible para retiro</p>
            </div>
            <div className="p-2 bg-green-50 rounded-lg">
              <TrendingUp className="h-6 w-6 text-green-600" />
            </div>
          </div>
        </div>

        {/* Total Equity Card */}
        <div className="bg-white p-6 rounded-xl shadow-sm border-l-4 border-purple-500">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm font-medium text-gray-500">Patrimonio Total</p>
              <h3 className="text-2xl font-bold text-gray-800 mt-2">
                $ {totalEquity.toLocaleString('es-CO')}
              </h3>
              <p className="text-xs text-gray-400 mt-1">Caja + Inventario</p>
            </div>
            <div className="p-2 bg-purple-50 rounded-lg">
              <DollarSign className="h-6 w-6 text-purple-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Action Tabs */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden mb-8">
        <div className="flex border-b">
          <button
            onClick={() => setActiveTab('expense')}
            className={`flex-1 py-4 text-center font-medium transition-colors flex items-center justify-center gap-2 ${
              activeTab === 'expense' ? 'bg-red-50 text-red-600 border-b-2 border-red-600' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <ArrowDownRight className="h-4 w-4" /> Registrar Gasto Operativo
          </button>
          <button
            onClick={() => setActiveTab('injection')}
            className={`flex-1 py-4 text-center font-medium transition-colors flex items-center justify-center gap-2 ${
              activeTab === 'injection' ? 'bg-green-50 text-green-600 border-b-2 border-green-600' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <ArrowUpRight className="h-4 w-4" /> Inyectar Capital
          </button>
          <button
            onClick={() => setActiveTab('withdrawal')}
            className={`flex-1 py-4 text-center font-medium transition-colors flex items-center justify-center gap-2 ${
              activeTab === 'withdrawal' ? 'bg-orange-50 text-orange-600 border-b-2 border-orange-600' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <CreditCard className="h-4 w-4" /> Retirar Utilidad
          </button>
        </div>

        <div className="p-6">
          <form onSubmit={handleSubmit} className="flex flex-col md:flex-row gap-4 items-end">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {activeTab === 'expense' ? 'Concepto del Gasto' : 
                 activeTab === 'injection' ? 'Fuente de los Fondos' : 'Motivo del Retiro'}
              </label>
              <input
                type="text"
                required
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 outline-none"
                placeholder={activeTab === 'expense' ? 'Ej: Pago de arriendo' : activeTab === 'injection' ? 'Ej: Inversión socio' : 'Ej: Retiro personal'}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
            <div className="w-full md:w-48">
              <label className="block text-sm font-medium text-gray-700 mb-1">Monto (COP)</label>
              <input
                type="number"
                required
                min="0"
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 outline-none"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </div>
            <button
              type="submit"
              className={`px-6 py-2 rounded-md text-white font-medium transition-colors ${
                activeTab === 'expense' ? 'bg-red-600 hover:bg-red-700' :
                activeTab === 'injection' ? 'bg-green-600 hover:bg-green-700' :
                'bg-orange-500 hover:bg-orange-600'
              }`}
            >
              {activeTab === 'expense' ? 'Registrar Gasto' :
               activeTab === 'injection' ? 'Ingresar Dinero' : 'Retirar Dinero'}
            </button>
          </form>
          
          <div className="mt-4 text-sm text-gray-500 bg-gray-50 p-3 rounded-md">
            <strong>Nota:</strong> 
            {activeTab === 'expense' && ' Disminuye la Caja y la Utilidad Neta.'}
            {activeTab === 'injection' && ' Aumenta la Caja y el Patrimonio. NO afecta la Utilidad.'}
            {activeTab === 'withdrawal' && ' Disminuye la Caja y la Utilidad Neta. Solo puedes retirar si tienes utilidades.'}
          </div>
        </div>
      </div>

      {/* Movements History */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <h3 className="font-semibold text-gray-800">Historial de Movimientos Financieros</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Fecha</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tipo</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Descripción</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Monto</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Responsable</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {movements.map((mov) => (
                <tr key={mov.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(mov.date).toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      mov.type === 'INJECTION' ? 'bg-green-100 text-green-800' : 
                      mov.type === 'WITHDRAWAL_PROFIT' ? 'bg-red-100 text-red-800' : 
                      'bg-orange-100 text-orange-800'
                    }`}>
                      {mov.type === 'INJECTION' ? 'INYECCIÓN' : 
                       mov.type === 'WITHDRAWAL_PROFIT' ? 'RETIRO/GASTO' : 'RETIRO CAPITAL'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                    {mov.description}
                  </td>
                  <td className={`px-6 py-4 whitespace-nowrap text-sm font-bold ${
                    mov.type === 'INJECTION' ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {mov.type === 'INJECTION' ? '+' : '-'} $ {Number(mov.amount).toLocaleString('es-CO')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {mov.createdBy?.username || 'Sistema'}
                  </td>
                </tr>
              ))}
              {movements.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-4 text-center text-gray-500">
                    No hay movimientos registrados.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Finance;
