import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  currenciesService, 
  providersService, 
  clientsService, 
  purchasesService, 
  salesService 
} from '../api/services';
import { ArrowDownRight, ArrowUpRight, Calculator, Check, AlertCircle } from 'lucide-react';

const Operations = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'purchase' | 'sale'>('purchase');
  
  // Data State
  const [currencies, setCurrencies] = useState<any[]>([]);
  const [providers, setProviders] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  
  // Form State
  const [currencyId, setCurrencyId] = useState('');
  const [entityId, setEntityId] = useState(''); // Provider or Client ID
  const [amount, setAmount] = useState('');
  const [rate, setRate] = useState('');
  const [paidAmount, setPaidAmount] = useState('');
  const [paymentType, setPaymentType] = useState('cash');
  
  // UI State
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [currRes, provRes, cliRes] = await Promise.all([
        currenciesService.findAll(),
        providersService.findAll(),
        clientsService.findAll()
      ]);
      setCurrencies(currRes.data);
      setProviders(provRes.data);
      setClients(cliRes.data);
    } catch (err) {
      console.error('Error loading form data', err);
    }
  };

  const totalPesos = (Number(amount) || 0) * (Number(rate) || 0);
  const pendingBalance = totalPesos - (Number(paidAmount) || 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const commonData = {
        date: new Date().toISOString(),
        branchId: user?.branchId,
        currencyId,
        amount: Number(amount),
        rate: Number(rate),
        paidAmount: Number(paidAmount),
        paymentType,
        createdById: user?.id,
      };

      if (activeTab === 'purchase') {
        await purchasesService.create({
          ...commonData,
          providerId: entityId,
        });
        setSuccess('Compra registrada exitosamente');
      } else {
        await salesService.create({
          ...commonData,
          clientId: entityId,
        });
        setSuccess('Venta registrada exitosamente');
      }
      
      // Reset form
      setAmount('');
      setPaidAmount('');
      // Keep rate/currency/entity as they might be reused
    } catch (err: any) {
      console.error(err);
      setError(err.response?.data?.message || 'Error al procesar la operación');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">Operaciones de Cambio</h1>

      {/* Tabs */}
      <div className="flex space-x-4 mb-6">
        <button
          onClick={() => setActiveTab('purchase')}
          className={`flex-1 py-4 px-6 rounded-lg font-bold text-lg flex items-center justify-center transition-all ${
            activeTab === 'purchase' 
              ? 'bg-blue-600 text-white shadow-lg ring-2 ring-blue-300' 
              : 'bg-white text-gray-500 hover:bg-gray-50'
          }`}
        >
          <ArrowDownRight className="mr-2 h-6 w-6" />
          COMPRA (Entrada)
        </button>
        <button
          onClick={() => setActiveTab('sale')}
          className={`flex-1 py-4 px-6 rounded-lg font-bold text-lg flex items-center justify-center transition-all ${
            activeTab === 'sale' 
              ? 'bg-green-600 text-white shadow-lg ring-2 ring-green-300' 
              : 'bg-white text-gray-500 hover:bg-gray-50'
          }`}
        >
          <ArrowUpRight className="mr-2 h-6 w-6" />
          VENTA (Salida)
        </button>
      </div>

      {/* Form Card */}
      <div className="bg-white rounded-xl shadow-md overflow-hidden">
        <div className={`h-2 w-full ${activeTab === 'purchase' ? 'bg-blue-600' : 'bg-green-600'}`}></div>
        
        <div className="p-8">
          {success && (
            <div className="mb-6 p-4 bg-green-50 border border-green-200 text-green-700 rounded-md flex items-center">
              <Check className="h-5 w-5 mr-2" />
              {success}
            </div>
          )}
          
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-md flex items-center">
              <AlertCircle className="h-5 w-5 mr-2" />
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Currency Selection */}
            <div className="col-span-1 md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">Moneda</label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {currencies.map((curr) => (
                  <button
                    key={curr.id}
                    type="button"
                    onClick={() => setCurrencyId(curr.id)}
                    className={`p-3 rounded-lg border text-center transition-all ${
                      currencyId === curr.id
                        ? activeTab === 'purchase' ? 'border-blue-500 bg-blue-50 text-blue-700 font-bold' : 'border-green-500 bg-green-50 text-green-700 font-bold'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    {curr.code}
                  </button>
                ))}
              </div>
            </div>

            {/* Entity Selection (Provider/Client) */}
            <div className="col-span-1 md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {activeTab === 'purchase' ? 'Proveedor' : 'Cliente'}
              </label>
              <select
                required
                className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 p-3 bg-gray-50"
                value={entityId}
                onChange={(e) => setEntityId(e.target.value)}
              >
                <option value="">Seleccione...</option>
                {activeTab === 'purchase' 
                  ? providers.map(p => <option key={p.id} value={p.id}>{p.name}</option>)
                  : clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)
                }
              </select>
            </div>

            {/* Amount & Rate */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Monto (Divisa)</label>
              <div className="relative rounded-md shadow-sm">
                <input
                  type="number"
                  required
                  step="0.01"
                  className="block w-full pr-12 border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 p-3 text-lg font-mono"
                  placeholder="0.00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tasa de Cambio</label>
              <div className="relative rounded-md shadow-sm">
                <input
                  type="number"
                  required
                  step="0.01"
                  className="block w-full border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 p-3 text-lg font-mono"
                  placeholder="0.00"
                  value={rate}
                  onChange={(e) => setRate(e.target.value)}
                />
              </div>
            </div>

            {/* Totals Display */}
            <div className="col-span-1 md:col-span-2 bg-gray-50 p-4 rounded-lg flex items-center justify-between border border-gray-200">
              <div className="flex items-center text-gray-500">
                <Calculator className="h-5 w-5 mr-2" />
                <span className="font-medium">Total en Pesos:</span>
              </div>
              <div className="text-2xl font-bold text-gray-800 font-mono">
                $ {totalPesos.toLocaleString('es-CO')}
              </div>
            </div>

            {/* Payment Details */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Monto Pagado / Abonado</label>
              <input
                type="number"
                required
                step="0.01"
                className="block w-full border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 p-3"
                placeholder="0.00"
                value={paidAmount}
                onChange={(e) => setPaidAmount(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Método de Pago</label>
              <select
                className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 p-3"
                value={paymentType}
                onChange={(e) => setPaymentType(e.target.value)}
              >
                <option value="cash">Efectivo</option>
                <option value="transfer">Transferencia</option>
              </select>
            </div>

            {/* Pending Balance Warning */}
            {pendingBalance > 0 && (
              <div className="col-span-1 md:col-span-2 p-3 bg-yellow-50 text-yellow-800 rounded-md text-sm flex items-center">
                <AlertCircle className="h-4 w-4 mr-2" />
                <span>
                  Quedará un saldo pendiente de <strong>$ {pendingBalance.toLocaleString('es-CO')}</strong> 
                  (Cuenta por {activeTab === 'purchase' ? 'Pagar' : 'Cobrar'}).
                </span>
              </div>
            )}

            {/* Submit Button */}
            <div className="col-span-1 md:col-span-2 mt-4">
              <button
                type="submit"
                disabled={loading}
                className={`w-full py-4 px-6 border border-transparent rounded-lg shadow-sm text-lg font-bold text-white focus:outline-none focus:ring-2 focus:ring-offset-2 transition-colors ${
                  activeTab === 'purchase'
                    ? 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-500'
                    : 'bg-green-600 hover:bg-green-700 focus:ring-green-500'
                } ${loading ? 'opacity-70 cursor-not-allowed' : ''}`}
              >
                {loading ? 'Procesando...' : activeTab === 'purchase' ? 'REGISTRAR COMPRA' : 'REGISTRAR VENTA'}
              </button>
            </div>

          </form>
        </div>
      </div>
    </div>
  );
};

export default Operations;
