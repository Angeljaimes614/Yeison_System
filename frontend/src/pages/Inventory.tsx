import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { inventoryService } from '../api/services';
import { Package } from 'lucide-react';

const Inventory = () => {
  const { user } = useAuth();
  const [inventory, setInventory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchInventory = async () => {
      try {
        const res = await inventoryService.findAll();
        // Filter by user branch
        const filtered = res.data.filter((i: any) => i.branchId === user?.branchId);
        setInventory(filtered);
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };

    if (user) fetchInventory();
  }, [user]);

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex items-center mb-6">
        <Package className="h-8 w-8 text-blue-600 mr-3" />
        <h1 className="text-2xl font-bold text-gray-800">Inventario Detallado (Lotes)</h1>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Moneda</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fecha Compra</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tasa Original</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Monto Original</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Saldo Actual</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Estado</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {inventory.map((item) => (
                <tr key={item.id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                      {item.currency?.code}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(item.purchaseDate).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-mono">
                    {Number(item.purchaseRate).toLocaleString('es-CO')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {Number(item.originalAmount).toLocaleString('es-CO')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900">
                    {Number(item.currentBalance).toLocaleString('es-CO')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      item.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                    }`}>
                      {item.status === 'active' ? 'Activo' : 'Agotado'}
                    </span>
                  </td>
                </tr>
              ))}
              {inventory.length === 0 && !loading && (
                <tr>
                  <td colSpan={6} className="px-6 py-4 text-center text-gray-500">
                    No hay inventario disponible.
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

export default Inventory;
