import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { capitalService, inventoryService } from '../api/services';
import { DollarSign, TrendingUp, Wallet, ArrowDownRight, ArrowUpRight } from 'lucide-react';

const Dashboard = () => {
  const { user } = useAuth();
  const [capital, setCapital] = useState<any>(null);
  const [inventory, setInventory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch Capital
        // Note: In a real app, we should filter by the user's branch
        const capitalRes = await capitalService.findAll();
        // Assuming the first one matches or filtering client-side for now if multiple
        const userCapital = capitalRes.data.find((c: any) => c.branchId === user?.branchId) || capitalRes.data[0];
        setCapital(userCapital);

        // Fetch Inventory
        const inventoryRes = await inventoryService.findAll();
        // Filter by branch
        const userInventory = inventoryRes.data.filter((i: any) => i.branchId === user?.branchId);
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

      {/* Cards Principales */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Plante Operativo (Caja) */}
        <div className="bg-white rounded-xl shadow-sm p-6 border-l-4 border-green-500">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm font-medium text-gray-500">Plante Operativo (Caja)</p>
              <h3 className="text-3xl font-bold text-gray-800 mt-2">
                $ {Number(capital?.operativePlante || 0).toLocaleString('es-CO')}
              </h3>
            </div>
            <div className="p-3 bg-green-50 rounded-lg">
              <Wallet className="h-6 w-6 text-green-600" />
            </div>
          </div>
          <div className="mt-4 flex items-center text-sm">
             <span className="text-gray-400">Disponible para compras</span>
          </div>
        </div>

        {/* Utilidad Acumulada */}
        <div className="bg-white rounded-xl shadow-sm p-6 border-l-4 border-blue-500">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm font-medium text-gray-500">Utilidad Acumulada</p>
              <h3 className="text-3xl font-bold text-gray-800 mt-2">
                $ {Number(capital?.accumulatedProfit || 0).toLocaleString('es-CO')}
              </h3>
            </div>
            <div className="p-3 bg-blue-50 rounded-lg">
              <TrendingUp className="h-6 w-6 text-blue-600" />
            </div>
          </div>
          <div className="mt-4 flex items-center text-sm">
            <span className="text-green-600 flex items-center font-medium">
              <ArrowUpRight className="h-4 w-4 mr-1" />
              +0.0%
            </span>
            <span className="text-gray-400 ml-2">vs ayer</span>
          </div>
        </div>

        {/* Capital Total */}
        <div className="bg-white rounded-xl shadow-sm p-6 border-l-4 border-purple-500">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm font-medium text-gray-500">Capital Total</p>
              <h3 className="text-3xl font-bold text-gray-800 mt-2">
                $ {Number(capital?.totalCapital || 0).toLocaleString('es-CO')}
              </h3>
            </div>
            <div className="p-3 bg-purple-50 rounded-lg">
              <DollarSign className="h-6 w-6 text-purple-600" />
            </div>
          </div>
           <div className="mt-4 flex items-center text-sm">
             <span className="text-gray-400">Patrimonio neto</span>
          </div>
        </div>
      </div>

      {/* Inventario de Divisas */}
      <h2 className="text-xl font-bold text-gray-800 mt-8 mb-4">Inventario de Divisas</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {Object.entries(inventoryByCurrency).map(([currency, amount]) => (
          <div key={currency} className="bg-white rounded-lg shadow p-4 flex items-center justify-between">
            <div>
              <p className="text-gray-500 font-medium">{currency}</p>
              <p className="text-xl font-bold text-gray-800">{Number(amount).toLocaleString('es-CO')}</p>
            </div>
            <div className={`h-10 w-10 rounded-full flex items-center justify-center font-bold text-white ${
              currency === 'USD' ? 'bg-green-600' :
              currency === 'EUR' ? 'bg-blue-600' :
              currency === 'USDT' ? 'bg-teal-500' : 'bg-gray-500'
            }`}>
              {currency.substring(0, 1)}
            </div>
          </div>
        ))}
        {Object.keys(inventoryByCurrency).length === 0 && (
           <div className="col-span-full bg-gray-50 p-4 rounded text-center text-gray-500">
             No hay inventario registrado.
           </div>
        )}
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
