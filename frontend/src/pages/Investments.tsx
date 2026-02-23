import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { investmentsService } from '../api/services';
import { TrendingUp, Package, PlusCircle, ShoppingCart, History, ArrowRight } from 'lucide-react';

const Investments = () => {
  const { user } = useAuth();
  const [investments, setInvestments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Modals State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showSellModal, setShowSellModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [selectedInvestment, setSelectedInvestment] = useState<any>(null);
  const [transactions, setTransactions] = useState<any[]>([]);

  // Forms
  const [name, setName] = useState('');
  const [quantity, setQuantity] = useState('');
  const [totalCost, setTotalCost] = useState('');
  const [sellQuantity, setSellQuantity] = useState('');
  const [salePrice, setSalePrice] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const res = await investmentsService.findAll();
      setInvestments(res.data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await investmentsService.create({
        name,
        quantity: Number(quantity),
        totalCost: Number(totalCost),
        userId: user?.id
      });
      alert('Producto creado correctamente');
      setShowCreateModal(false);
      setName('');
      setQuantity('');
      setTotalCost('');
      loadData();
    } catch (error: any) {
      alert(error.response?.data?.message || 'Error al crear');
    }
  };

  const handleSell = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedInvestment) return;

    try {
      await investmentsService.sell({
        investmentId: selectedInvestment.id,
        quantity: Number(sellQuantity),
        salePrice: Number(salePrice),
        userId: user?.id
      });
      alert('Venta registrada correctamente');
      setShowSellModal(false);
      setSellQuantity('');
      setSalePrice('');
      loadData();
    } catch (error: any) {
      alert(error.response?.data?.message || 'Error al vender');
    }
  };

  const openSellModal = (inv: any) => {
    setSelectedInvestment(inv);
    setShowSellModal(true);
  };

  const openHistoryModal = async (inv: any) => {
    setSelectedInvestment(inv);
    try {
       const res = await investmentsService.findTransactions(inv.id);
       setTransactions(res.data);
       setShowHistoryModal(true);
    } catch (error) {
       console.error(error);
    }
  };

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800 flex items-center">
          <Package className="mr-2 text-purple-600" />
          Inventario de Inversiones (Celulares, Billares, etc.)
        </h1>
        <button 
          onClick={() => setShowCreateModal(true)}
          className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg flex items-center shadow"
        >
          <PlusCircle className="mr-2 h-5 w-5" />
          Nuevo Producto
        </button>
      </div>

      {/* Grid de Productos */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {investments.map((inv) => (
          <div key={inv.id} className={`bg-white rounded-lg shadow-md p-6 border-l-4 ${inv.status === 'ACTIVE' ? 'border-green-500' : 'border-gray-400 bg-gray-50'}`}>
            <div className="flex justify-between items-start mb-4">
               <h3 className="text-lg font-bold text-gray-800">{inv.name}</h3>
               <span className={`px-2 py-1 text-xs rounded-full ${inv.status === 'ACTIVE' ? 'bg-green-100 text-green-800' : 'bg-gray-200 text-gray-600'}`}>
                 {inv.status === 'ACTIVE' ? 'Disponible' : 'Agotado'}
               </span>
            </div>
            
            <div className="space-y-2 mb-6">
               <div className="flex justify-between text-sm">
                 <span className="text-gray-500">Stock Actual:</span>
                 <span className="font-bold">{inv.currentQuantity} / {inv.initialQuantity}</span>
               </div>
               <div className="flex justify-between text-sm">
                 <span className="text-gray-500">Costo Unitario:</span>
                 <span className="font-mono">$ {Number(inv.unitCost).toLocaleString('es-CO')}</span>
               </div>
               <div className="flex justify-between text-sm border-t pt-2 mt-2">
                 <span className="text-gray-500">Inversión Total:</span>
                 <span className="font-bold text-red-600">$ {Number(inv.totalCost).toLocaleString('es-CO')}</span>
               </div>
            </div>

            <div className="flex gap-2">
               <button 
                 onClick={() => openSellModal(inv)}
                 disabled={inv.status !== 'ACTIVE'}
                 className={`flex-1 flex items-center justify-center py-2 rounded-md text-white transition-colors ${
                    inv.status === 'ACTIVE' ? 'bg-green-600 hover:bg-green-700' : 'bg-gray-400 cursor-not-allowed'
                 }`}
               >
                 <ShoppingCart className="h-4 w-4 mr-2" />
                 Vender
               </button>
               <button 
                 onClick={() => openHistoryModal(inv)}
                 className="flex-1 flex items-center justify-center py-2 rounded-md bg-blue-50 text-blue-600 hover:bg-blue-100 border border-blue-200"
               >
                 <History className="h-4 w-4 mr-2" />
                 Historial
               </button>
            </div>
          </div>
        ))}
      </div>
      
      {investments.length === 0 && !loading && (
         <div className="text-center py-12 bg-white rounded-lg shadow mt-6">
            <Package className="h-12 w-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">No hay productos registrados. ¡Crea el primero!</p>
         </div>
      )}

      {/* Modal Crear */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h2 className="text-xl font-bold mb-4">Nuevo Producto de Inversión</h2>
            <form onSubmit={handleCreate}>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700">Nombre del Producto</label>
                <input type="text" required className="w-full border rounded p-2 mt-1" value={name} onChange={e => setName(e.target.value)} placeholder="Ej: Celular Samsung A54" />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700">Cantidad Comprada</label>
                <input type="number" required className="w-full border rounded p-2 mt-1" value={quantity} onChange={e => setQuantity(e.target.value)} />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700">Costo Total de la Compra (Sale de Caja)</label>
                <input type="number" required className="w-full border rounded p-2 mt-1" value={totalCost} onChange={e => setTotalCost(e.target.value)} />
                <p className="text-xs text-gray-500 mt-1">Costo Unitario: $ {quantity && totalCost ? (Number(totalCost)/Number(quantity)).toLocaleString('es-CO') : 0}</p>
              </div>
              <div className="flex justify-end gap-2 mt-6">
                <button type="button" onClick={() => setShowCreateModal(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded">Cancelar</button>
                <button type="submit" className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700">Crear Inversión</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Vender */}
      {showSellModal && selectedInvestment && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h2 className="text-xl font-bold mb-4">Registrar Venta</h2>
            <p className="text-sm text-gray-600 mb-4">Producto: <strong>{selectedInvestment.name}</strong></p>
            <form onSubmit={handleSell}>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700">Cantidad a Vender (Max: {selectedInvestment.currentQuantity})</label>
                <input type="number" required max={selectedInvestment.currentQuantity} min="1" className="w-full border rounded p-2 mt-1" value={sellQuantity} onChange={e => setSellQuantity(e.target.value)} />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700">Precio de Venta Total (Entra a Caja)</label>
                <input type="number" required className="w-full border rounded p-2 mt-1" value={salePrice} onChange={e => setSalePrice(e.target.value)} />
              </div>
              
              {sellQuantity && salePrice && (
                  <div className="bg-green-50 p-3 rounded mb-4">
                      <div className="flex justify-between text-sm mb-1">
                          <span>Precio Venta:</span>
                          <span className="font-bold">$ {Number(salePrice).toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between text-sm mb-1 text-red-600">
                          <span>Costo Producto:</span>
                          <span>- $ {(Number(sellQuantity) * Number(selectedInvestment.unitCost)).toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between text-sm font-bold text-green-700 border-t border-green-200 pt-1 mt-1">
                          <span>Utilidad Neta:</span>
                          <span>$ {(Number(salePrice) - (Number(sellQuantity) * Number(selectedInvestment.unitCost))).toLocaleString()}</span>
                      </div>
                  </div>
              )}

              <div className="flex justify-end gap-2 mt-6">
                <button type="button" onClick={() => setShowSellModal(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded">Cancelar</button>
                <button type="submit" className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700">Confirmar Venta</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Historial */}
      {showHistoryModal && selectedInvestment && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full p-6 max-h-[80vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold">Historial de Ventas: {selectedInvestment.name}</h2>
                <button onClick={() => setShowHistoryModal(false)} className="text-gray-500 hover:text-gray-700">✕</button>
            </div>
            
            <table className="min-w-full divide-y divide-gray-200">
               <thead className="bg-gray-50">
                  <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Fecha</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Cant.</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Venta</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Utilidad</th>
                  </tr>
               </thead>
               <tbody className="divide-y divide-gray-200">
                  {transactions.map(tx => (
                      <tr key={tx.id}>
                          <td className="px-4 py-2 text-sm">{new Date(tx.date).toLocaleDateString()}</td>
                          <td className="px-4 py-2 text-sm">{tx.quantity}</td>
                          <td className="px-4 py-2 text-sm font-bold">$ {Number(tx.salePrice).toLocaleString()}</td>
                          <td className="px-4 py-2 text-sm text-green-600 font-bold">$ {Number(tx.profit).toLocaleString()}</td>
                      </tr>
                  ))}
                  {transactions.length === 0 && (
                      <tr><td colSpan={4} className="px-4 py-4 text-center text-gray-500">No hay ventas aún.</td></tr>
                  )}
               </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default Investments;
