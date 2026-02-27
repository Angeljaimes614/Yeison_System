import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { capitalService, inventoryService, currenciesService } from '../api/services';
import { DollarSign, TrendingUp, Wallet, ArrowDownRight, ArrowUpRight, Coins } from 'lucide-react';

const Dashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [capital, setCapital] = useState<any>(null);
  const [inventory, setInventory] = useState<any[]>([]);
  const [currencies, setCurrencies] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(new Date());

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
        
        <button 
           onClick={() => fetchData()}
           className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg flex items-center transition-colors"
           disabled={loading}
        >
           {loading ? 'Actualizando...' : '↻ Actualizar Datos'}
        </button>
      </div>

      {/* Debug Info (Temporary) */}
      <div className="bg-gray-100 p-4 rounded text-xs font-mono mb-4 overflow-auto max-h-60 border border-red-300 hidden">
        <h3 className="font-bold text-red-600 mb-2">DEBUG INFO (Si ves esto, envíame una foto)</h3>
        <p><strong>Role:</strong> {user?.role}</p>
        <p><strong>Branch ID:</strong> {user?.branchId || 'Ninguna (Global)'}</p>
        <p><strong>Inventory Count:</strong> {inventory.length}</p>
        <p><strong>Capital:</strong> {JSON.stringify(capital)}</p>
        <p><strong>Inventory Items (First 5):</strong></p>
        <pre>{JSON.stringify(inventory.slice(0, 5), null, 2)}</pre>
      </div>

      {/* Resumen General de Balances por Moneda */}
      <h2 className="text-xl font-bold text-gray-800 mt-4 mb-4">Resumen de Balances</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {displayCurrencies.map((curr) => (
          <div key={curr.code} className="bg-white rounded-xl shadow-sm p-6 border border-gray-100 hover:shadow-md transition-shadow">
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
    </div>
  );
};

export default Dashboard;