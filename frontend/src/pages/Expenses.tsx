import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { expensesService } from '../api/services';
import { DollarSign, Plus } from 'lucide-react';

const Expenses = () => {
  const { user } = useAuth();
  const [expenses, setExpenses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  // Form
  const [concept, setConcept] = useState('');
  const [amount, setAmount] = useState('');
  const [type, setType] = useState('office');

  useEffect(() => {
    loadExpenses();
  }, [user]);

  const loadExpenses = async () => {
    try {
      const res = await expensesService.findAll();
      const filtered = res.data.filter((e: any) => e.branchId === user?.branchId);
      setExpenses(filtered);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await expensesService.create({
        date: new Date().toISOString(),
        branchId: user?.branchId,
        concept,
        amount: Number(amount),
        type,
        createdById: user?.id,
      });
      setShowForm(false);
      setConcept('');
      setAmount('');
      loadExpenses(); // Reload
    } catch (error: any) {
      console.error('Error creating expense', error);
      const msg = error.response?.data?.message || 'Error al registrar gasto. Verifique conexión.';
      alert(`Error: ${msg}`);
    }
  };

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center">
          <DollarSign className="h-8 w-8 text-red-600 mr-3" />
          <h1 className="text-2xl font-bold text-gray-800">Gastos Operativos</h1>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg flex items-center shadow"
        >
          <Plus className="h-5 w-5 mr-2" />
          Registrar Gasto
        </button>
      </div>

      {showForm && (
        <div className="bg-white p-6 rounded-lg shadow-md mb-6 border-l-4 border-red-500">
          <h3 className="text-lg font-semibold mb-4">Nuevo Gasto</h3>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Concepto</label>
              <input
                type="text"
                required
                className="block w-full border-gray-300 rounded-md shadow-sm p-2 border"
                value={concept}
                onChange={(e) => setConcept(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Monto (Pesos)</label>
              <input
                type="number"
                required
                className="block w-full border-gray-300 rounded-md shadow-sm p-2 border"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tipo</label>
              <select
                className="block w-full border-gray-300 rounded-md shadow-sm p-2 border"
                value={type}
                onChange={(e) => setType(e.target.value)}
              >
                <option value="office">Oficina</option>
                <option value="payroll">Nómina</option>
                <option value="services">Servicios</option>
                <option value="others">Otros</option>
              </select>
            </div>
            <button
              type="submit"
              className="bg-gray-900 text-white px-4 py-2 rounded-md hover:bg-gray-800"
            >
              Guardar
            </button>
          </form>
        </div>
      )}

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fecha</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Concepto</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tipo</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Monto</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Registrado por</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {expenses.map((expense) => (
              <tr key={expense.id}>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {new Date(expense.date).toLocaleDateString()}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-medium">
                  {expense.concept}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 capitalize">
                  {expense.type}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-red-600">
                  - $ {Number(expense.amount).toLocaleString('es-CO')}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {expense.createdBy?.fullName || 'Desconocido'}
                </td>
              </tr>
            ))}
            {expenses.length === 0 && !loading && (
              <tr>
                <td colSpan={5} className="px-6 py-4 text-center text-gray-500">
                  No hay gastos registrados.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Expenses;
