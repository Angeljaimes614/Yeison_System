import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { capitalService, cashAuditService } from '../api/services';
import { Wallet, ClipboardCheck, AlertTriangle, CheckCircle, PlusCircle, MinusCircle } from 'lucide-react';

const Capital = () => {
  const { user } = useAuth();
  const [capital, setCapital] = useState<any>(null);
  const [audits, setAudits] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Audit Form
  const [physicalBalance, setPhysicalBalance] = useState('');
  const [observations, setObservations] = useState('');
  const [showAuditForm, setShowAuditForm] = useState(false);

  // Capital Update Form
  const [showUpdateForm, setShowUpdateForm] = useState(false);
  const [updateAmount, setUpdateAmount] = useState('');
  const [updateType, setUpdateType] = useState<'add' | 'remove'>('add');

  useEffect(() => {
    loadData();
  }, [user]);

  const loadData = async () => {
    try {
      const [capRes, auditRes] = await Promise.all([
        capitalService.findAll(),
        cashAuditService.findAll()
      ]);
      
      // Get global capital (first one usually) or filter if needed
      // Since we unified capital, just take the first valid one
      const userCapital = capRes.data[0] || null;
      setCapital(userCapital);

      const userAudits = auditRes.data
        // .filter((a: any) => a.branchId === user?.branchId) // Audits might be per branch, keep this if needed
        .sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime());
      
      setAudits(userAudits);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateCapital = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!capital) return;

    try {
      const currentPlante = Number(capital.operativePlante);
      const amount = Number(updateAmount);
      const newPlante = updateType === 'add' ? currentPlante + amount : currentPlante - amount;

      await capitalService.update(capital.id, {
        operativePlante: newPlante
      });

      alert(`Capital ${updateType === 'add' ? 'ingresado' : 'retirado'} correctamente`);
      setShowUpdateForm(false);
      setUpdateAmount('');
      loadData();
    } catch (error) {
      console.error(error);
      alert('Error al actualizar capital');
    }
  };

  const handleAuditSubmit = async (e: React.FormEvent) => {
    // ... existing code ...
    e.preventDefault();
    try {
      await cashAuditService.create({
        date: new Date().toISOString(),
        branchId: user?.branchId,
        physicalBalance: Number(physicalBalance),
        observations,
        createdById: user?.id,
      });
      setShowAuditForm(false);
      setPhysicalBalance('');
      setObservations('');
      loadData(); // Reload
      alert('Auditoría registrada correctamente');
    } catch (error) {
      console.error(error);
      alert('Error al registrar auditoría');
    }
  };

  return (
    <div className="max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">Caja y Capital</h1>

      {/* Resumen Actual */}
      <div className="bg-white rounded-xl shadow-sm p-8 mb-8 border-l-8 border-green-600 relative">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-gray-500 font-medium text-lg">Plante Operativo Actual (Sistema)</h2>
            <p className="text-4xl font-bold text-gray-900 mt-2">
              $ {Number(capital?.operativePlante || 0).toLocaleString('es-CO')}
            </p>
            <p className="text-sm text-gray-400 mt-1">Dinero disponible para operaciones.</p>
          </div>
          <div className="flex flex-col space-y-2">
             <button 
               onClick={() => { setShowUpdateForm(!showUpdateForm); setShowAuditForm(false); }}
               className="flex items-center px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors"
             >
               {showUpdateForm ? 'Cancelar' : 'Ajustar Saldo'}
             </button>
          </div>
        </div>

        {/* Capital Update Form */}
        {showUpdateForm && (
          <div className="mt-6 p-4 bg-gray-50 rounded-lg border border-gray-200 animate-fade-in">
            <h3 className="font-semibold text-gray-700 mb-3">Ajuste Manual de Capital</h3>
            <form onSubmit={handleUpdateCapital} className="flex flex-col md:flex-row gap-4 items-end">
              <div>
                <label className="block text-sm text-gray-600 mb-1">Tipo de Movimiento</label>
                <div className="flex space-x-2">
                  <button
                    type="button"
                    onClick={() => setUpdateType('add')}
                    className={`px-4 py-2 rounded-md flex items-center ${updateType === 'add' ? 'bg-green-600 text-white' : 'bg-white border text-gray-600'}`}
                  >
                    <PlusCircle className="w-4 h-4 mr-2" /> Ingreso
                  </button>
                  <button
                    type="button"
                    onClick={() => setUpdateType('remove')}
                    className={`px-4 py-2 rounded-md flex items-center ${updateType === 'remove' ? 'bg-red-600 text-white' : 'bg-white border text-gray-600'}`}
                  >
                    <MinusCircle className="w-4 h-4 mr-2" /> Retiro
                  </button>
                </div>
              </div>
              <div className="flex-1">
                <label className="block text-sm text-gray-600 mb-1">Monto</label>
                <input
                  type="number"
                  required
                  className="w-full p-2 border rounded-md"
                  placeholder="0.00"
                  value={updateAmount}
                  onChange={(e) => setUpdateAmount(e.target.value)}
                />
              </div>
              <button type="submit" className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">
                Guardar
              </button>
            </form>
          </div>
        )}
      </div>

      {/* Auditoría de Caja */}
      <div className="mb-8">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-gray-800">Control de Caja Fuerte</h2>
          <button
            onClick={() => setShowAuditForm(!showAuditForm)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center shadow"
          >
            <ClipboardCheck className="h-5 w-5 mr-2" />
            Realizar Arqueo (Conteo)
          </button>
        </div>

        {showAuditForm && (
          <div className="bg-white p-6 rounded-lg shadow-md mb-6 border border-blue-200">
            <h3 className="text-lg font-semibold mb-4 text-gray-800">Nuevo Arqueo de Caja</h3>
            <form onSubmit={handleAuditSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Saldo Físico (Dinero contado en billetes)
                </label>
                <input
                  type="number"
                  required
                  step="0.01"
                  className="block w-full border-gray-300 rounded-md shadow-sm p-3 border text-lg"
                  placeholder="0.00"
                  value={physicalBalance}
                  onChange={(e) => setPhysicalBalance(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Observaciones</label>
                <textarea
                  className="block w-full border-gray-300 rounded-md shadow-sm p-3 border"
                  rows={2}
                  value={observations}
                  onChange={(e) => setObservations(e.target.value)}
                />
              </div>
              <div className="flex justify-end">
                <button
                  type="submit"
                  className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 font-medium"
                >
                  Registrar Conteo
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Historial de Auditorías */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fecha</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Saldo Sistema</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Saldo Físico</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Diferencia</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Estado</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {audits.map((audit) => (
                <tr key={audit.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(audit.date).toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    $ {Number(audit.systemBalance).toLocaleString('es-CO')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-bold">
                    $ {Number(audit.physicalBalance).toLocaleString('es-CO')}
                  </td>
                  <td className={`px-6 py-4 whitespace-nowrap text-sm font-bold ${
                    audit.difference === 0 ? 'text-gray-400' : audit.difference < 0 ? 'text-red-600' : 'text-blue-600'
                  }`}>
                    $ {Number(audit.difference).toLocaleString('es-CO')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {audit.difference === 0 ? (
                      <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800 items-center">
                        <CheckCircle className="w-3 h-3 mr-1" /> Cuadrado
                      </span>
                    ) : (
                      <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800 items-center">
                        <AlertTriangle className="w-3 h-3 mr-1" /> Descuadre
                      </span>
                    )}
                  </td>
                </tr>
              ))}
              {audits.length === 0 && !loading && (
                <tr>
                  <td colSpan={5} className="px-6 py-4 text-center text-gray-500">
                    No hay auditorías registradas.
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

export default Capital;
