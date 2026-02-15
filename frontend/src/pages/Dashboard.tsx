import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { capitalService, inventoryService } from '../api/services';
import { DollarSign, TrendingUp, Wallet, ArrowDownRight, ArrowUpRight, Coins } from 'lucide-react';

const Dashboard = () => {
  const { user } = useAuth();
  const [capital, setCapital] = useState<any>(null);
  const [inventory, setInventory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch Capital
        const capitalRes = await capitalService.findAll();
        // Global Capital: Always use the first one as capital is shared across branches
        const userCapital = capitalRes.data[0] || null;
        setCapital(userCapital);

        // Fetch Inventory
        const inventoryRes = await inventoryService.findAll();
        
        // If admin, show all inventory (Global View). Otherwise, filter by branch.
        let userInventory = inventoryRes.data;
        if (user?.role !== 'admin') {
           userInventory = inventoryRes.data.filter((i: any) => i.branchId === user?.branchId);
        }
        
        setInventory(userInventory);

      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    if (user) {
      fetchData();
    }
  }, [user]);

  if (loading) {
    return <div className="p-8 text-center">Cargando dashboard...</div>;
  }

  // Calculate totals by currency
  const inventoryByCurrency = inventory.reduce((acc: any, item: any) => {
    const currency = item.currency?.code || 'Unknown';
    if (!acc[currency]) {
      acc[currency] = 0;
    }
    acc[currency] += Number(item.currentBalance);
    return acc;
  }, {});

  // Define display list
  const displayCurrencies = [
    { code: 'COP', label: 'Total en COP', value: Number(capital?.operativePlante || 0), icon: Wallet, color: 'text-green-600', bg: 'bg-green-50' },
    { code: 'DÓLAR', label: 'Total en DOLAR', value: inventoryByCurrency['DÓLAR'] || 0, icon: DollarSign, color: 'text-blue-600', bg: 'bg-blue-50' },
    { code: 'USDT', label: 'Total en USDT', value: inventoryByCurrency['USDT'] || 0, icon: Coins, color: 'text-teal-600', bg: 'bg-teal-50' },
    { code: 'EURO', label: 'Total en EURO', value: inventoryByCurrency['EURO'] || 0, icon: Coins, color: 'text-indigo-600', bg: 'bg-indigo-50' },
    { code: 'BS', label: 'Total en BS', value: inventoryByCurrency['BS'] || 0, icon: Coins, color: 'text-yellow-600', bg: 'bg-yellow-50' },
    { code: 'ZELLE', label: 'Total en ZELLE', value: inventoryByCurrency['ZELLE'] || 0, icon: Coins, color: 'text-purple-600', bg: 'bg-purple-50' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-800">
          Dashboard - {user?.role === 'admin' ? 'Vista General' : 'Mi Sucursal'}
        </h1>
        <div className="text-sm text-gray-500">
          {new Date().toLocaleDateString('es-CO', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </div>
      </div>

      {/* Debug Info (Temporary) */}
      <div className="bg-gray-100 p-4 rounded text-xs font-mono mb-4 overflow-auto max-h-60 border border-red-300">
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
                  {curr.code === 'COP' ? '$ ' : ''}{curr.value.toLocaleString('es-CO')} {curr.code !== 'COP' ? curr.code : ''}
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
         <button className="bg-blue-600 hover:bg-blue-700 text-white p-4 rounded-lg shadow transition-colors flex items-center justify-center text-lg font-semibold">
           <ArrowDownRight className="mr-2 h-6 w-6" />
           Nueva Compra
         </button>
         <button className="bg-green-600 hover:bg-green-700 text-white p-4 rounded-lg shadow transition-colors flex items-center justify-center text-lg font-semibold">
           <ArrowUpRight className="mr-2 h-6 w-6" />
           Nueva Venta
         </button>
      </div>
    </div>
  );
};

export default Dashboard;