import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { investmentsService } from '../api/services';
import { TrendingUp, TrendingDown, DollarSign, PlusCircle, ArrowUpCircle } from 'lucide-react';

const Investments = () => {
  const { user } = useAuth();
  const [investments, setInvestments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Form State
  const [showModal, setShowModal] = useState(false);
  const [formType, setFormType] = useState<'INVERSION' | 'RETORNO'>('INVERSION');
  const [concept, setConcept] = useState('');
  const [amount, setAmount] = useState('');
  const [profit, setProfit] = useState('');

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

  useEffect(() => {
    loadData();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || !concept) return;

    try {
      await investmentsService.create({
        type: formType,
        concept,
        amount: Number(amount),
        profit: formType === 'RETORNO' ? Number(profit) : 0
      });
      setShowModal(false);
      setConcept('');
      setAmount('');
      setProfit('');
      loadData();
      alert('Operación registrada exitosamente');
    } catch (error: any) {
      alert(error.response?.data?.message || 'Error al registrar');
    }
  };

  const openModal = (type: 'INVERSION' | 'RETORNO') => {
    setFormType(type);
    setShowModal(true);
  };

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800 flex items-center">
          <TrendingUp className="mr-2 text-purple-600" />
          Otras Inversiones (Celulares, Billares)
        </h1>
        <div className="space-x-2">
           <button 
             onClick={() => openModal('INVERSION')}
             className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg flex items-center inline-flex"
           >
             <TrendingDown className="mr-2 h-4 w-4" />
             Registrar Inversión (Salida)
           </button>
           <button 
             onClick={() => openModal('RETORNO')}
             className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg flex items-center inline-flex"
           >
             <TrendingUp className="mr-2 h-4 w-4" />
             Registrar Retorno (Entrada)
           </button>
        </div>
      </div>

      {/* Tabla */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Fecha</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Concepto</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tipo</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Monto</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Utilidad</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Usuario</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {investments.map((item) => (
              <tr key={item.id}>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {new Date(item.date).toLocaleDateString()}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-medium">
                  {item.concept}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                    item.type === 'INVERSION' ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'
                  }`}>
                    {item.type}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900">
                  $ {Number(item.amount).toLocaleString('es-CO')}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600 font-bold">
                  {item.profit > 0 ? `$ ${Number(item.profit).toLocaleString('es-CO')}` : '-'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {item.createdBy?.username || 'Sistema'}
                </td>
              </tr>
            ))}
            {investments.length === 0 && (
              <tr>
                <td colSpan={6} className="px-6 py-4 text-center text-gray-500">
                  No hay inversiones registradas.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h2 className="text-xl font-bold mb-4">
              {formType === 'INVERSION' ? 'Registrar Nueva Inversión' : 'Registrar Retorno de Inversión'}
            </h2>
            <form onSubmit={handleSubmit}>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">Concepto</label>
                <input
                  type="text"
                  required
                  placeholder={formType === 'INVERSION' ? 'Ej: Compra 5 Celulares' : 'Ej: Venta Celular Samsung'}
                  className="w-full border rounded-md p-2"
                  value={concept}
                  onChange={(e) => setConcept(e.target.value)}
                />
              </div>
              
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                   {formType === 'INVERSION' ? 'Monto a Invertir (Sale de Caja)' : 'Monto Recibido (Entra a Caja)'}
                </label>
                <input
                  type="number"
                  required
                  className="w-full border rounded-md p-2"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                />
              </div>

              {formType === 'RETORNO' && (
                <div className="mb-4 bg-green-50 p-3 rounded-md">
                  <label className="block text-sm font-medium text-green-800 mb-1">Utilidad Generada (Ganancia)</label>
                  <input
                    type="number"
                    required
                    placeholder="0"
                    className="w-full border border-green-300 rounded-md p-2"
                    value={profit}
                    onChange={(e) => setProfit(e.target.value)}
                  />
                  <p className="text-xs text-green-600 mt-1">Este valor se sumará a la Utilidad Neta Real.</p>
                </div>
              )}

              <div className="flex justify-end gap-2 mt-6">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-md"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className={`px-4 py-2 text-white rounded-md ${
                    formType === 'INVERSION' ? 'bg-red-600 hover:bg-red-700' : 'bg-green-600 hover:bg-green-700'
                  }`}
                >
                  Guardar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Investments;
