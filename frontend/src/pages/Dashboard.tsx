import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { capitalService, inventoryService, currenciesService } from '../api/services';
import { DollarSign, TrendingUp, Wallet, ArrowDownRight, ArrowUpRight, Coins, Edit3, X, Save, FileBarChart } from 'lucide-react';

const Dashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [capital, setCapital] = useState<any>(null);
  const [inventory, setInventory] = useState<any[]>([]);
  const [currencies, setCurrencies] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(new Date());

  // Adjustment Modal State
  const [isAdjustModalOpen, setIsAdjustModalOpen] = useState(false);
  const [selectedCurrency, setSelectedCurrency] = useState<any | null>(null);
  const [adjustQuantity, setAdjustQuantity] = useState('');
  const [adjustCost, setAdjustCost] = useState('');
  const [adjustLoading, setAdjustLoading] = useState(false);

  // Audit Modal State
  const [isAuditOpen, setIsAuditOpen] = useState(false);
  const [auditData, setAuditData] = useState<any | null>(null);
  const [auditLoading, setAuditLoading] = useState(false);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      const [capitalRes, inventoryRes, currenciesRes] = await Promise.all([
        capitalService.findAll(),
        inventoryService.findGlobal(),
        currenciesService.findAll()
      ]);

      // Process Capital
      const capitalList = Array.isArray(capitalRes.data) ? capitalRes.data : [capitalRes.data];
      const userCapital = capitalList[0] || null;
      setCapital({...userCapital});

      // Process Inventory & Currencies
      setInventory(inventoryRes.data);
      setCurrencies(currenciesRes.data);
      
      setLastUpdated(new Date());

    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchData();
    }
    // Auto-refresh every 30 seconds
    const interval = setInterval(() => {
        if (user) fetchData();
    }, 30000);
    return () => clearInterval(interval);
  }, [user]);

  const handleOpenAudit = async () => {
      setIsAuditOpen(true);
      setAuditLoading(true);
      try {
          const res = await capitalService.getAudit();
          setAuditData(res.data);
      } catch (err) {
          console.error(err);
          alert('Error al generar auditoría');
      } finally {
          setAuditLoading(false);
      }
  };

  const handleOpenAdjust = (currency: any, currentQty: number) => {
      if (user?.role !== 'admin') return;
      setSelectedCurrency(currency);
      setAdjustQuantity(currentQty.toString());
      
      if (currency.code === 'COP') {
          setAdjustCost('0'); // Not used for Cash
      } else {
          // Find current average cost from inventory array
          const invItem = inventory.find((i: any) => i.currencyId === currency.id);
          setAdjustCost(invItem ? invItem.averageCost : '0');
      }
      setIsAdjustModalOpen(true);
  };

  const handleSaveAdjustment = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!selectedCurrency) return;

      const newQty = parseFloat(adjustQuantity);
      const newCost = parseFloat(adjustCost);

      if (isNaN(newQty)) {
          alert('Por favor ingrese un valor válido');
          return;
      }

      const isCash = selectedCurrency.code === 'COP';
      const confirmMsg = isCash 
          ? `¿Seguro que deseas ajustar la CAJA OPERATIVA a $ ${newQty.toLocaleString()}?`
          : `¿Seguro que deseas ajustar el inventario de ${selectedCurrency.code} a ${newQty}?`;

      if (!window.confirm(`${confirmMsg} Esta acción es irreversible y quedará registrada.`)) {
          return;
      }

      setAdjustLoading(true);
      try {
          if (isCash) {
              await capitalService.adjustCash({
                  amount: newQty,
                  userId: user?.id || ''
              });
              alert('Caja Operativa ajustada correctamente');
          } else {
              await inventoryService.adjustGlobal({
                  currencyId: selectedCurrency.id,
                  quantity: newQty,
                  averageCost: newCost
              });
              alert('Inventario ajustado correctamente');
          }
          
          setIsAdjustModalOpen(false);
          fetchData(); // Reload data
      } catch (err: any) {
          console.error(err);
          alert(err.response?.data?.message || 'Error al realizar el ajuste');
      } finally {
          setAdjustLoading(false);
      }
  };

  if (loading && !capital) {
    return <div className="p-8 text-center">Cargando dashboard...</div>;
  }

  // Calculate totals by currency from GlobalInventory
  const inventoryByCurrency = inventory.reduce((acc: any, item: any) => {
    const currencyCode = item.currency?.code;
    if (currencyCode) {
        if (!acc[currencyCode]) {
          acc[currencyCode] = 0;
        }
        acc[currencyCode] += Number(item.totalQuantity);
    }
    return acc;
  }, {});

  // Define static cards
  const staticCards = [
    { code: 'COP', label: 'Caja Operativa (COP)', value: Number(capital?.operativePlante || 0), icon: Wallet, color: 'text-blue-600', bg: 'bg-blue-50' },
    { code: 'PROFIT', label: 'Utilidad Neta Real', value: Number(capital?.accumulatedProfit || 0), icon: TrendingUp, color: 'text-green-600', bg: 'bg-green-50' },
  ];

  // Map dynamic currencies
  const currencyCards = currencies.map((curr: any) => ({
      ...curr, // Pass full object for adjustment
      code: curr.code,
      label: `Inventario ${curr.code}`,
      value: inventoryByCurrency[curr.code] || 0,
      icon: ['USD', 'DÓLAR', 'USDT'].includes(curr.code) ? DollarSign : Coins,
      color: 'text-gray-600',
      bg: 'bg-gray-50'
  }));

  const displayCurrencies = [...staticCards, ...currencyCards];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
           <h1 className="text-2xl font-bold text-gray-800">
             Dashboard - {user?.role === 'admin' ? 'Vista General' : 'Mi Sucursal'}
           </h1>
           <div className="text-sm text-gray-500 mt-1">
             Actualizado: {lastUpdated.toLocaleTimeString()}
           </div>
        </div>
        
        <div className="flex gap-2">
            {user?.role === 'admin' && (
                <button 
                onClick={handleOpenAudit}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg flex items-center transition-colors"
                title="Ver Auditoría de Caja"
                >
                <FileBarChart className="h-5 w-5 mr-2" />
                Auditoría
                </button>
            )}
            <button 
            onClick={() => fetchData()}
            className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg flex items-center transition-colors"
            disabled={loading}
            >
            {loading ? 'Actualizando...' : '↻ Actualizar Datos'}
            </button>
        </div>
      </div>

      {/* Resumen General de Balances por Moneda */}
      <h2 className="text-xl font-bold text-gray-800 mt-4 mb-4">Resumen de Balances</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {displayCurrencies.map((curr) => (
          <div key={curr.code} className="bg-white rounded-xl shadow-sm p-6 border border-gray-100 hover:shadow-md transition-shadow relative group">
            
            {/* Admin Edit Button for Currencies AND CASH (COP) */}
            {user?.role === 'admin' && curr.code !== 'PROFIT' && (
                <button 
                    onClick={() => handleOpenAdjust(curr, curr.value)}
                    className="absolute top-2 right-2 p-1 text-gray-400 hover:text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity"
                    title={curr.code === 'COP' ? "Ajustar Caja Manualmente" : "Ajustar Inventario Manualmente"}
                >
                    <Edit3 className="h-4 w-4" />
                </button>
            )}

            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm font-medium text-gray-500 uppercase tracking-wide">{curr.label}</p>
                <h3 className="text-3xl font-bold text-gray-800 mt-2 font-mono">
                  {curr.code === 'COP' || curr.code === 'PROFIT' ? '$ ' : ''}
                  {curr.value.toLocaleString('es-CO', { minimumFractionDigits: 0, maximumFractionDigits: 2 })} 
                  {(curr.code !== 'COP' && curr.code !== 'PROFIT') ? ` ${curr.code}` : ''}
                </h3>
              </div>
              <div className={`p-3 rounded-lg ${curr.bg}`}>
                <curr.icon className={`h-6 w-6 ${curr.color}`} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Accesos Rápidos */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
         <button 
           onClick={() => navigate('/operations', { state: { tab: 'purchase' } })}
           className="bg-blue-600 hover:bg-blue-700 text-white p-4 rounded-lg shadow transition-colors flex items-center justify-center text-lg font-semibold"
         >
           <ArrowDownRight className="mr-2 h-6 w-6" />
           Nueva Compra
         </button>
         <button 
           onClick={() => navigate('/operations', { state: { tab: 'sale' } })}
           className="bg-green-600 hover:bg-green-700 text-white p-4 rounded-lg shadow transition-colors flex items-center justify-center text-lg font-semibold"
         >
           <ArrowUpRight className="mr-2 h-6 w-6" />
           Nueva Venta
         </button>
      </div>

      {/* Adjustment Modal */}
      {isAdjustModalOpen && selectedCurrency && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
              <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
                  <div className="flex justify-between items-center mb-4">
                      <h3 className="text-xl font-bold text-gray-800">
                          {selectedCurrency.code === 'COP' ? 'Ajustar Caja Operativa' : `Ajustar Inventario: ${selectedCurrency.code}`}
                      </h3>
                      <button onClick={() => setIsAdjustModalOpen(false)} className="text-gray-500 hover:text-gray-700">
                          <X className="h-6 w-6" />
                      </button>
                  </div>
                  
                  <div className="mb-4 bg-yellow-50 p-3 rounded text-sm text-yellow-800 border border-yellow-200">
                      <strong>Advertencia:</strong> Estás modificando directamente el saldo real. 
                      {selectedCurrency.code === 'COP' 
                        ? ' Se creará un registro de "Ajuste Manual" para justificar la diferencia.' 
                        : ' Esto no genera movimientos de caja ni afecta la utilidad.'}
                  </div>

                  <form onSubmit={handleSaveAdjustment}>
                      <div className="mb-4">
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                              {selectedCurrency.code === 'COP' ? 'Nuevo Saldo en Caja (COP)' : 'Nueva Cantidad Real'}
                          </label>
                          <input 
                              type="number" 
                              step="any"
                              className="w-full border border-gray-300 rounded-lg p-2 focus:ring-blue-500 focus:border-blue-500"
                              value={adjustQuantity}
                              onChange={(e) => setAdjustQuantity(e.target.value)}
                              required
                          />
                      </div>

                      {selectedCurrency.code !== 'COP' && (
                          <div className="mb-6">
                              <label className="block text-sm font-medium text-gray-700 mb-1">Costo Promedio (COP) <span className="text-gray-400 text-xs">(Opcional, dejar igual si no cambia)</span></label>
                              <input 
                                  type="number" 
                                  step="any"
                                  className="w-full border border-gray-300 rounded-lg p-2 focus:ring-blue-500 focus:border-blue-500"
                                  value={adjustCost}
                                  onChange={(e) => setAdjustCost(e.target.value)}
                                  required
                              />
                          </div>
                      )}

                      <div className="flex justify-end gap-3">
                          <button 
                              type="button"
                              onClick={() => setIsAdjustModalOpen(false)}
                              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
                          >
                              Cancelar
                          </button>
                          <button 
                              type="submit"
                              disabled={adjustLoading}
                              className="px-4 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center"
                          >
                              <Save className="h-4 w-4 mr-2" />
                              {adjustLoading ? 'Guardando...' : 'Guardar Ajuste'}
                          </button>
                      </div>
                  </form>
              </div>
          </div>
      )}

      {/* Audit Modal */}
      {isAuditOpen && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black bg-opacity-50 p-4">
              <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl p-6 overflow-y-auto max-h-[90vh]">
                  <div className="flex justify-between items-center mb-4">
                      <h3 className="text-xl font-bold text-gray-800 flex items-center">
                          <FileBarChart className="h-6 w-6 mr-2 text-purple-600" />
                          Auditoría de Caja (Análisis Forense)
                      </h3>
                      <button onClick={() => setIsAuditOpen(false)} className="text-gray-500 hover:text-gray-700">
                          <X className="h-6 w-6" />
                      </button>
                  </div>

                  {auditLoading ? (
                      <div className="flex justify-center py-10">
                          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-purple-600"></div>
                      </div>
                  ) : auditData ? (
                      <div className="space-y-6">
                          <div className={`p-4 rounded-lg border ${auditData.difference === 0 ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
                              <h4 className="font-bold text-lg mb-2">Resultado: {auditData.analysis}</h4>
                              <div className="grid grid-cols-2 gap-4">
                                  <div>
                                      <span className="text-gray-600 text-sm">Caja Teórica (Debería haber):</span>
                                      <p className="font-mono font-bold text-xl">$ {Number(auditData.theoreticalCash).toLocaleString()}</p>
                                  </div>
                                  <div>
                                      <span className="text-gray-600 text-sm">Caja Real (Sistema):</span>
                                      <p className="font-mono font-bold text-xl">$ {Number(auditData.actualCash).toLocaleString()}</p>
                                  </div>
                              </div>
                              {auditData.difference !== 0 && (
                                  <div className="mt-2 pt-2 border-t border-red-200 text-red-700 font-bold">
                                      Diferencia: $ {Number(auditData.difference).toLocaleString()}
                                  </div>
                              )}
                          </div>

                          <div className="border rounded-lg p-4 bg-gray-50">
                              <h5 className="font-bold text-gray-700 mb-3 border-b pb-2">Desglose de Movimientos Global</h5>
                              <div className="space-y-2">
                                  <div className="flex justify-between text-green-700">
                                      <span>(+) Ventas Cobradas (Cash In):</span>
                                      <span className="font-mono">$ {Number(auditData.salesCashIn).toLocaleString()}</span>
                                  </div>
                                  <div className="flex justify-between text-blue-700">
                                      <span>(+) Inyecciones de Capital:</span>
                                      <span className="font-mono">$ {Number(auditData.injections).toLocaleString()}</span>
                                  </div>
                                  <div className="flex justify-between text-red-600">
                                      <span>(-) Compras Pagadas (Cash Out):</span>
                                      <span className="font-mono">- $ {Number(auditData.purchasesCashOut).toLocaleString()}</span>
                                  </div>
                                  <div className="flex justify-between text-orange-600">
                                      <span>(-) Gastos Operativos:</span>
                                      <span className="font-mono">- $ {Number(auditData.expensesCashOut).toLocaleString()}</span>
                                  </div>
                                  <div className="flex justify-between text-purple-600">
                                      <span>(-) Retiros de Capital/Utilidad:</span>
                                      <span className="font-mono">- $ {Number(auditData.withdrawals).toLocaleString()}</span>
                                  </div>
                              </div>
                          </div>

                          {/* Monthly Breakdown Table */}
                          {auditData.monthlyBreakdown && auditData.monthlyBreakdown.length > 0 && (
                              <div className="border rounded-lg overflow-hidden">
                                  <table className="min-w-full divide-y divide-gray-200">
                                      <thead className="bg-gray-50">
                                          <tr>
                                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Mes</th>
                                              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Entradas</th>
                                              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Salidas</th>
                                              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Neto</th>
                                          </tr>
                                      </thead>
                                      <tbody className="bg-white divide-y divide-gray-200">
                                          {auditData.monthlyBreakdown.map((m: any) => (
                                              <tr key={m.month}>
                                                  <td className="px-4 py-3 text-sm font-medium text-gray-900">{m.month}</td>
                                                  <td className="px-4 py-3 text-sm text-right text-green-600 font-mono">
                                                      + {Number(m.in).toLocaleString()}
                                                  </td>
                                                  <td className="px-4 py-3 text-sm text-right text-red-600 font-mono">
                                                      - {Number(m.out).toLocaleString()}
                                                  </td>
                                                  <td className={`px-4 py-3 text-sm text-right font-bold font-mono ${m.net >= 0 ? 'text-blue-600' : 'text-orange-600'}`}>
                                                      {Number(m.net).toLocaleString()}
                                                  </td>
                                              </tr>
                                          ))}
                                      </tbody>
                                  </table>
                              </div>
                          )}
                          
                          <p className="text-xs text-gray-500 mt-2 text-center">
                              Este informe suma todas las transacciones históricas y las compara con el saldo actual.
                              Si hay diferencia, se recomienda usar el botón "Ajustar Caja" para corregir el saldo inicial.
                          </p>
                      </div>
                  ) : (
                      <p className="text-center text-red-500">No se pudieron cargar los datos.</p>
                  )}
              </div>
          </div>
      )}

    </div>
  );
};

export default Dashboard;