import React, { useState, useEffect } from 'react';
import { providersService, purchasesService } from '../api/services';
import { UserPlus, Edit2, Trash2, Check, AlertCircle, Search, FileText, X, AlertTriangle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const Providers = () => {
  const { user } = useAuth();
  const [providers, setProviders] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProvider, setEditingProvider] = useState<any | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  // History Modal State
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState<any | null>(null);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  // Form State
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await providersService.findAll();
      setProviders(Array.isArray(res?.data) ? res.data : (Array.isArray(res) ? res : []));
    } catch (err) {
      console.error(err);
      setError('Error al cargar proveedores');
    } finally {
      setLoading(false);
    }
  };

  const loadHistory = async (provider: any) => {
    setSelectedProvider(provider);
    setIsHistoryOpen(true);
    setHistoryLoading(true);
    try {
        const res = await providersService.getTransactions(provider.id);
        setTransactions(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
        console.error(err);
        alert('Error al cargar historial');
    } finally {
        setHistoryLoading(false);
    }
  };

  const handleReversePurchase = async (purchaseId: string) => {
    if (!window.confirm('¿Estás seguro de ANULAR esta compra? Esto revertirá el inventario y anulará la deuda.')) return;
    try {
        await purchasesService.reverse(purchaseId, { userId: user?.id || '', reason: 'Anulación manual desde historial de proveedor' });
        alert('Compra anulada correctamente');
        if (selectedProvider) loadHistory(selectedProvider); // Reload history
    } catch (err: any) {
        alert(err.response?.data?.message || 'Error al anular compra');
    }
  };

  const handleOpenModal = (providerToEdit?: any) => {
    setError('');
    setSuccess('');
    if (providerToEdit) {
      setEditingProvider(providerToEdit);
      setName(providerToEdit.name);
      setPhone(providerToEdit.phone || '');
      setEmail(providerToEdit.email || '');
    } else {
      setEditingProvider(null);
      setName('');
      setPhone('');
      setEmail('');
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    try {
      const providerData = { name, phone, email };

      if (editingProvider) {
        await providersService.update(editingProvider.id, providerData);
        setSuccess('Proveedor actualizado correctamente');
      } else {
        await providersService.create(providerData);
        setSuccess('Proveedor creado correctamente');
      }
      
      setIsModalOpen(false);
      loadData();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error al guardar proveedor');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('¿Está seguro de eliminar este proveedor?')) return;
    try {
      await providersService.remove(id);
      setSuccess('Proveedor eliminado');
      loadData();
    } catch (err) {
      setError('Error al eliminar proveedor');
    }
  };

  const filteredProviders = providers.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (p.phone && p.phone.includes(searchTerm)) ||
    (p.email && p.email.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
        <h1 className="text-2xl font-bold text-gray-800">Gestión de Proveedores</h1>
        <div className="flex gap-4 w-full md:w-auto">
            <div className="relative flex-1 md:flex-none">
                <Search className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
                <input 
                    type="text" 
                    placeholder="Buscar proveedor..." 
                    className="pl-10 pr-4 py-2 border rounded-lg w-full md:w-64"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>
            <button
            onClick={() => handleOpenModal()}
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 whitespace-nowrap"
            >
            <UserPlus className="h-5 w-5 mr-2" />
            Nuevo Proveedor
            </button>
        </div>
      </div>

      {success && (
        <div className="mb-4 p-4 bg-green-50 text-green-700 rounded-md flex items-center">
          <Check className="h-5 w-5 mr-2" /> {success}
        </div>
      )}
      {error && (
        <div className="mb-4 p-4 bg-red-50 text-red-700 rounded-md flex items-center">
          <AlertCircle className="h-5 w-5 mr-2" /> {error}
        </div>
      )}

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
                <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nombre</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Teléfono</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Acciones</th>
                </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
                {filteredProviders.length > 0 ? filteredProviders.map((p) => (
                <tr key={p.id}>
                    <td className="px-6 py-4 whitespace-nowrap font-medium text-gray-900">{p.name}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-gray-500">{p.phone || '-'}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-gray-500">{p.email || '-'}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button onClick={() => loadHistory(p)} className="text-blue-600 hover:text-blue-900 mr-4" title="Ver Historial">
                        <FileText className="h-4 w-4" />
                    </button>
                    <button onClick={() => handleOpenModal(p)} className="text-indigo-600 hover:text-indigo-900 mr-4">
                        <Edit2 className="h-4 w-4" />
                    </button>
                    <button onClick={() => handleDelete(p.id)} className="text-red-600 hover:text-red-900">
                        <Trash2 className="h-4 w-4" />
                    </button>
                    </td>
                </tr>
                )) : (
                    <tr>
                        <td colSpan={4} className="px-6 py-8 text-center text-gray-500">
                            No se encontraron proveedores.
                        </td>
                    </tr>
                )}
            </tbody>
            </table>
        </div>
      </div>

      {/* Edit/Create Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
            <h2 className="text-xl font-bold mb-4">{editingProvider ? 'Editar Proveedor' : 'Nuevo Proveedor'}</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Nombre Completo *</label>
                <input
                  type="text"
                  required
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 p-2 border"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ej: Distribuidora XYZ"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Teléfono</label>
                <input
                  type="text"
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 p-2 border"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="Ej: 300 123 4567"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Email</label>
                <input
                  type="email"
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 p-2 border"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Ej: contacto@xyz.com"
                />
              </div>
              
              <div className="flex justify-end space-x-3 mt-6">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                >
                  {loading ? 'Guardando...' : 'Guardar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* History Modal */}
      {isHistoryOpen && selectedProvider && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl p-6 h-[80vh] flex flex-col">
                <div className="flex justify-between items-center mb-4">
                    <div>
                        <h2 className="text-xl font-bold text-gray-800">Historial de: {selectedProvider.name}</h2>
                        <p className="text-sm text-gray-500">Transacciones y movimientos</p>
                    </div>
                    <button onClick={() => setIsHistoryOpen(false)} className="text-gray-500 hover:text-gray-700">
                        <X className="h-6 w-6" />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto">
                    {historyLoading ? (
                        <div className="flex justify-center items-center h-full">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                        </div>
                    ) : transactions.length > 0 ? (
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50 sticky top-0">
                                <tr>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Fecha</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tipo</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Detalle</th>
                                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Total</th>
                                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Saldo</th>
                                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Estado</th>
                                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Acción</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {transactions.map((tx) => (
                                    <tr key={tx.id} className={tx.isReversed ? 'bg-red-50' : ''}>
                                        <td className="px-4 py-3 text-sm text-gray-900">
                                            {new Date(tx.date).toLocaleDateString()} <br/>
                                            <span className="text-xs text-gray-500">{new Date(tx.date).toLocaleTimeString()}</span>
                                        </td>
                                        <td className="px-4 py-3 text-sm">
                                            <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                                                tx.isReversed ? 'bg-red-100 text-red-800' : 'bg-blue-100 text-blue-800'
                                            }`}>
                                                {tx.isReversed ? 'ANULADO' : tx.type}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-sm text-gray-600">
                                            {Number(tx.amount).toLocaleString()} {tx.currency} @ {Number(tx.rate).toLocaleString()}
                                        </td>
                                        <td className="px-4 py-3 text-sm text-right font-medium">
                                            $ {Number(tx.totalPesos).toLocaleString()}
                                        </td>
                                        <td className="px-4 py-3 text-sm text-right text-red-600 font-bold">
                                            {Number(tx.pendingBalance) > 0 ? `$ ${Number(tx.pendingBalance).toLocaleString()}` : '-'}
                                        </td>
                                        <td className="px-4 py-3 text-center text-sm">
                                            {tx.isReversed ? (
                                                <span className="text-red-600 text-xs">Anulado por: {tx.reversalReason}</span>
                                            ) : Number(tx.pendingBalance) > 0 ? (
                                                <span className="text-yellow-600 font-bold">Pendiente</span>
                                            ) : (
                                                <span className="text-green-600 font-bold">Pagado</span>
                                            )}
                                        </td>
                                        <td className="px-4 py-3 text-center">
                                            {!tx.isReversed && (
                                                <button 
                                                    onClick={() => handleReversePurchase(tx.id)}
                                                    className="text-red-500 hover:text-red-700 text-xs border border-red-200 px-2 py-1 rounded hover:bg-red-50"
                                                >
                                                    Anular
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    ) : (
                        <div className="text-center py-10 text-gray-500">
                            <AlertTriangle className="h-10 w-10 mx-auto mb-2 text-gray-300" />
                            Este proveedor no tiene movimientos registrados.
                        </div>
                    )}
                </div>
                
                <div className="mt-4 pt-4 border-t flex justify-end">
                    <button 
                        onClick={() => setIsHistoryOpen(false)}
                        className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
                    >
                        Cerrar
                    </button>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};

export default Providers;