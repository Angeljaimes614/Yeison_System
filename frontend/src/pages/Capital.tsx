import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { capitalService, cashAuditService } from '../api/services';
import { Wallet, ClipboardCheck, AlertTriangle, CheckCircle } from 'lucide-react';

const Capital = () => {
  const { user } = useAuth();
  const [capital, setCapital] = useState<any>(null);
  const [audits, setAudits] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Audit Form
  const [physicalBalance, setPhysicalBalance] = useState('');
  const [observations, setObservations] = useState('');
  const [showAuditForm, setShowAuditForm] = useState(false);

  useEffect(() => {
    loadData();
  }, [user]);

  const loadData = async () => {
    try {
      const [capRes, auditRes] = await Promise.all([
        capitalService.findAll(),
        cashAuditService.findAll()
      ]);
      
      const userCapital = capRes.data.find((c: any) => c.branchId === user?.branchId);
      setCapital(userCapital);

      const userAudits = auditRes.data
        .filter((a: any) => a.branchId === user?.branchId)
        .sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime());
      
      setAudits(userAudits);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleAuditSubmit = async (e: React.FormEvent) => {
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
      <div className="bg-white rounded-xl shadow-sm p-8 mb-8 flex items-center justify-between border-l-8 border-green-600">
        <div>
          <h2 className="text-gray-500 font-medium text-lg">Plante Operativo Actual (Sistema)</h2>
          <p className="text-4xl font-bold text-gray-900 mt-2">
            $ {Number(capital?.operativePlante || 0).toLocaleString('es-CO')}
          </p>
          <p className="text-sm text-gray-400 mt-1">Este es el dinero que debería haber en caja.</p>
        </div>
        <div className="bg-green-100 p-4 rounded-full">
          <Wallet className="h-10 w-10 text-green-600" />
        </div>
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
