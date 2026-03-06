import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useLocation } from 'react-router-dom';
import { ArrowDownRight, ArrowUpRight, Calculator, Check, AlertCircle, Building2, RefreshCw } from 'lucide-react';
import { 
  currenciesService, 
  providersService, 
  clientsService, 
  purchasesService, 
  salesService,
  branchesService,
  inventoryService,
  exchangesService
} from '../api/services';

const Operations = () => {
  const { user } = useAuth();
  const location = useLocation();
  const [activeTab, setActiveTab] = useState<'purchase' | 'sale' | 'exchange'>('purchase');
  
  // Initialize tab from location state if present
  useEffect(() => {
    if (location.state && location.state.tab) {
      setActiveTab(location.state.tab);
    }
  }, [location]);
  
  // Data State
  const [currencies, setCurrencies] = useState<any[]>([]);
  const [providers, setProviders] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [branches, setBranches] = useState<any[]>([]);
  const [globalInventory, setGlobalInventory] = useState<any[]>([]);
  
  // Form State
  const [currencyId, setCurrencyId] = useState('');
  const [entityId, setEntityId] = useState(''); // Provider or Client Name Input
  const [selectedEntityId, setSelectedEntityId] = useState(''); // The actual UUID if found
  
  const [amount, setAmount] = useState('');
  const [rate, setRate] = useState('');
  const [paidAmount, setPaidAmount] = useState('');
  const [paymentType, setPaymentType] = useState('cash');
  const [operationType, setOperationType] = useState<'INVENTORY' | 'DIRECT'>('INVENTORY');
  const [selectedBranchId, setSelectedBranchId] = useState(user?.branchId || '');

  // Exchange Form State
  const [sourceCurrencyId, setSourceCurrencyId] = useState('');
  const [targetCurrencyId, setTargetCurrencyId] = useState('');
  const [sourceAmount, setSourceAmount] = useState('');
  const [targetAmount, setTargetAmount] = useState('');
  
  // UI State
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    // Use individual try-catch blocks to prevent total failure
    try {
      try {
        const res = await currenciesService.findAll();
        setCurrencies(Array.isArray(res?.data) ? res.data : []);
      } catch (e) { console.error(e); setCurrencies([]); }

      try {
        const res = await providersService.findAll();
        console.log('Providers loaded:', res);
        setProviders(Array.isArray(res?.data) ? res.data : (Array.isArray(res) ? res : []));
      } catch (e) { console.error('Provider Error', e); setProviders([]); }

      try {
        const res = await clientsService.findAll();
        console.log('Clients loaded:', res);
        setClients(Array.isArray(res?.data) ? res.data : (Array.isArray(res) ? res : []));
      } catch (e) { console.error('Client Error', e); setClients([]); }

      try {
        const res = await inventoryService.findGlobal();
        setGlobalInventory(Array.isArray(res?.data) ? res.data : []);
      } catch (e) { console.error(e); setGlobalInventory([]); }

      if (!user?.branchId) {
        try {
          const res = await branchesService.findAll();
          setBranches(Array.isArray(res?.data) ? res.data : []);
        } catch (e) { console.error(e); setBranches([]); }
      }
    } catch (err) {
      console.error('Critical Error in loadData', err);
      setError('Error cargando datos iniciales. Verifica tu conexión.');
    } finally {
      setLoading(false);
    }
  };

  const totalPesos = (Number(amount) || 0) * (Number(rate) || 0);
  const pendingBalance = totalPesos - (Number(paidAmount) || 0);

  // Helper to find average cost safely
  const getAverageCost = (currId: string) => {
    if (!Array.isArray(globalInventory)) return 0;
    const item = globalInventory.find((i: any) => i && i.currencyId === currId);
    return item ? Number(item.averageCost) : 0;
  };

  const handleEntitySelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    if (val === 'new_entity') {
      setSelectedEntityId('');
      setEntityId('');
      return;
    }
    
    // Find the entity object
    let found = null;
    const list = activeTab === 'purchase' ? providers : clients;
    
    if (Array.isArray(list)) {
      for(let i=0; i<list.length; i++) {
        if(list[i] && list[i].id === val) {
          found = list[i];
          break;
        }
      }
    }
    
    if (found) {
      setSelectedEntityId(found.id);
      setEntityId(found.name);
    } else {
      setSelectedEntityId('');
      setEntityId('');
    }
  };

  // --- SAFE RENDER HELPERS (NO .MAP IN JSX) ---

  const renderEntityOptions = () => {
    const items = [];
    items.push(<option key="default" value="">-- Seleccione un {activeTab === 'purchase' ? 'Proveedor' : 'Cliente'} --</option>);
    
    const list = activeTab === 'purchase' ? providers : clients;
    
    if (Array.isArray(list)) {
      for (let i = 0; i < list.length; i++) {
        const item = list[i];
        if (item && item.id && item.name) {
          items.push(<option key={item.id} value={item.id}>{item.name}</option>);
        }
      }
    }
    
    items.push(<option key="new" value="new_entity">+ Registrar Nuevo (Escribir nombre)</option>);
    
    return items;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    if (activeTab === 'exchange') {
      if (!sourceCurrencyId || !targetCurrencyId || !sourceAmount || !targetAmount) {
         setError('Todos los campos son obligatorios para la conversión.');
         setLoading(false);
         return;
      }
      if (sourceCurrencyId === targetCurrencyId) {
        setError('La moneda de origen y destino no pueden ser la misma.');
        setLoading(false);
        return;
      }

      try {
        await exchangesService.create({
           sourceCurrencyId,
           targetCurrencyId,
           sourceAmount: Number(sourceAmount),
           targetAmount: Number(targetAmount),
           userId: user?.id
        });
        setSuccess('Conversión realizada con éxito (Valor trasladado).');
        setSourceAmount('');
        setTargetAmount('');
        loadData(); 
      } catch (err: any) {
        console.error(err);
        setError(err.response?.data?.message || 'Error en la conversión');
      } finally {
        setLoading(false);
      }
      return;
    }

    if (!selectedBranchId) {
      setError('Debes seleccionar una sucursal para operar.');
      setLoading(false);
      return;
    }

    try {
      const commonData = {
        date: new Date().toISOString(),
        branchId: selectedBranchId,
        currencyId,
        amount: Number(amount),
        rate: Number(rate),
        paidAmount: Number(paidAmount),
        paymentType,
        operationType: activeTab === 'sale' ? operationType : 'INVENTORY',
        createdById: user?.id,
      };

      if (activeTab === 'purchase') {
        await purchasesService.create({
          ...commonData,
          operationType: operationType,
          providerName: entityId,
          providerId: selectedEntityId || undefined,
        });
        setSuccess('Compra registrada exitosamente');
      } else {
        await salesService.create({
          ...commonData,
          clientName: entityId,
          clientId: selectedEntityId || undefined,
        });
        setSuccess('Venta registrada exitosamente');
      }
      
      setAmount('');
      setPaidAmount('');
      setEntityId('');
      setSelectedEntityId('');
      
      loadData();
    } catch (err: any) {
      console.error(err);
      setError(err.response?.data?.message || 'Error al procesar la operación');
    } finally {
      setLoading(false);
    }
  };

  // --- SAFE RENDER HELPERS (NO .MAP IN JSX) ---

  const renderCurrencyButtons = () => {
    const items = [];
    if (Array.isArray(currencies)) {
      for (let i = 0; i < currencies.length; i++) {
        const curr = currencies[i];
        if (!curr || !curr.id) continue;
        
        items.push(
          <button
            key={curr.id}
            type="button"
            disabled={loading}
            onClick={() => setCurrencyId(curr.id)}
            className={`p-3 rounded-lg border text-center transition-all ${
              currencyId === curr.id
                ? activeTab === 'purchase' ? 'border-blue-500 bg-blue-50 text-blue-700 font-bold' : 'border-green-500 bg-green-50 text-green-700 font-bold'
                : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            {curr.code || '???'}
          </button>
        );
      }
    }
    
    if (items.length === 0) {
      return <div className="text-gray-500 text-sm">No hay monedas disponibles.</div>;
    }
    
    return <div className="grid grid-cols-2 md:grid-cols-4 gap-3">{items}</div>;
  };

  const renderCurrencyOptions = () => {
    const items = [];
    items.push(<option key="default" value="">-- Seleccione --</option>);
    
    if (Array.isArray(currencies)) {
      for (let i = 0; i < currencies.length; i++) {
        const curr = currencies[i];
        if (curr && curr.id) {
          items.push(<option key={curr.id} value={curr.id}>{curr.code}</option>);
        }
      }
    }
    return items;
  };

  const renderBranchOptions = () => {
    const items = [];
    items.push(<option key="default" value="">-- Seleccione una Sucursal --</option>);
    
    if (Array.isArray(branches)) {
      for (let i = 0; i < branches.length; i++) {
        const b = branches[i];
        if (b && b.id) {
          items.push(<option key={b.id} value={b.id}>{b.name}</option>);
        }
      }
    }
    return items;
  };

  const renderDataListOptions = () => {
    const items = [];
    
    if (activeTab === 'purchase') {
      if (Array.isArray(providers)) {
        for (let i = 0; i < providers.length; i++) {
          const p = providers[i];
          if (p && p.name) {
            items.push(<option key={p.id || `prov-${i}`} value={p.name} />);
          }
        }
      }
    } else {
      if (Array.isArray(clients)) {
        for (let i = 0; i < clients.length; i++) {
          const c = clients[i];
          if (c && c.name) {
            items.push(<option key={c.id || `cli-${i}`} value={c.name} />);
          }
        }
      }
    }
    return items;
  };

  // --- END HELPERS ---

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">Operaciones de Cambio</h1>

      {/* Branch Selection */}
      {!user?.branchId && activeTab !== 'exchange' && (
        <div className="mb-6 bg-white p-4 rounded-lg shadow-sm border border-orange-200">
          <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center">
            <Building2 className="h-4 w-4 mr-2 text-orange-500" />
            Selecciona la Sucursal de Operación
          </label>
          <select
            className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-orange-500 focus:border-orange-500 p-2"
            value={selectedBranchId}
            onChange={(e) => setSelectedBranchId(e.target.value)}
          >
            {renderBranchOptions()}
          </select>
        </div>
      )}

      {/* Operation Type Selector (Only for Purchase/Sale) */}
      {activeTab !== 'exchange' && (
        <div className="flex justify-center mb-6">
          <div className="bg-gray-100 p-1 rounded-lg inline-flex">
            <button
              type="button"
              onClick={() => setOperationType('INVENTORY')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                operationType === 'INVENTORY'
                  ? 'bg-white text-gray-800 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Afectar Inventario (Normal)
            </button>
            <button
              type="button"
              onClick={() => setOperationType('DIRECT')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                operationType === 'DIRECT'
                  ? 'bg-white text-gray-800 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Operación Directa (Sin Inventario)
            </button>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex space-x-2 mb-6 overflow-x-auto pb-2">
        <button
          onClick={() => { setActiveTab('purchase'); setEntityId(''); setSelectedEntityId(''); }}
          className={`flex-1 py-4 px-6 rounded-lg font-bold text-lg flex items-center justify-center transition-all min-w-[150px] ${
            activeTab === 'purchase' 
              ? 'bg-blue-600 text-white shadow-lg ring-2 ring-blue-300' 
              : 'bg-white text-gray-500 hover:bg-gray-50'
          }`}
        >
          <ArrowDownRight className="mr-2 h-6 w-6" />
          COMPRA
        </button>
        <button
          onClick={() => { setActiveTab('sale'); setEntityId(''); setSelectedEntityId(''); }}
          className={`flex-1 py-4 px-6 rounded-lg font-bold text-lg flex items-center justify-center transition-all min-w-[150px] ${
            activeTab === 'sale' 
              ? 'bg-green-600 text-white shadow-lg ring-2 ring-green-300' 
              : 'bg-white text-gray-500 hover:bg-gray-50'
          }`}
        >
          <ArrowUpRight className="mr-2 h-6 w-6" />
          VENTA
        </button>
        <button
          onClick={() => setActiveTab('exchange')}
          className={`flex-1 py-4 px-6 rounded-lg font-bold text-lg flex items-center justify-center transition-all min-w-[150px] ${
            activeTab === 'exchange' 
              ? 'bg-purple-600 text-white shadow-lg ring-2 ring-purple-300' 
              : 'bg-white text-gray-500 hover:bg-gray-50'
          }`}
        >
          <RefreshCw className="mr-2 h-6 w-6" />
          CONVERSIÓN
        </button>
      </div>

      {/* Form Card */}
      <div className="bg-white rounded-xl shadow-md overflow-hidden">
        <div className={`h-2 w-full ${
          activeTab === 'purchase' ? 'bg-blue-600' : 
          activeTab === 'sale' ? 'bg-green-600' : 'bg-purple-600'
        }`}></div>
        
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

          <form onSubmit={handleSubmit}>
            {activeTab === 'exchange' ? (
              // EXCHANGE FORM
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                 <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Moneda Origen (Sale)</label>
                    <select
                      className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-purple-500 focus:border-purple-500 p-3"
                      value={sourceCurrencyId}
                      onChange={(e) => setSourceCurrencyId(e.target.value)}
                    >
                      {renderCurrencyOptions()}
                    </select>
                 </div>
                 <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Moneda Destino (Entra)</label>
                    <select
                      className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-purple-500 focus:border-purple-500 p-3"
                      value={targetCurrencyId}
                      onChange={(e) => setTargetCurrencyId(e.target.value)}
                    >
                      {renderCurrencyOptions()}
                    </select>
                 </div>

                 <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Cantidad a Entregar</label>
                    <input
                      type="number"
                      required
                      step="0.01"
                      className="block w-full border-gray-300 rounded-md focus:ring-purple-500 focus:border-purple-500 p-3 text-lg"
                      placeholder="0.00"
                      value={sourceAmount}
                      onChange={(e) => setSourceAmount(e.target.value)}
                    />
                    {sourceCurrencyId && (
                      <p className="text-xs text-gray-500 mt-1">
                        Costo Promedio Actual: <strong>$ {getAverageCost(sourceCurrencyId).toLocaleString('es-CO')}</strong>
                      </p>
                    )}
                 </div>

                 <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Cantidad a Recibir</label>
                    <input
                      type="number"
                      required
                      step="0.01"
                      className="block w-full border-gray-300 rounded-md focus:ring-purple-500 focus:border-purple-500 p-3 text-lg"
                      placeholder="0.00"
                      value={targetAmount}
                      onChange={(e) => setTargetAmount(e.target.value)}
                    />
                 </div>

                 <div className="col-span-1 md:col-span-2 bg-purple-50 p-4 rounded-lg text-sm text-purple-800">
                    <p><strong>Nota:</strong> Esta operación moverá el costo acumulado de la moneda origen a la destino. No genera utilidad.</p>
                 </div>

                 <div className="col-span-1 md:col-span-2 mt-4">
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-4 px-6 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-bold text-lg transition-colors"
                  >
                    {loading ? 'Procesando...' : 'REALIZAR CONVERSIÓN'}
                  </button>
                </div>
              </div>
            ) : (
              // PURCHASE / SALE FORM
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* Currency Selection */}
                <div className="col-span-1 md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Moneda</label>
                  {renderCurrencyButtons()}
                </div>

                {/* Entity Selection (Provider/Client) */}
                <div className="col-span-1 md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nombre del {activeTab === 'purchase' ? 'Proveedor' : 'Cliente'}
                  </label>
                  
                  {/* Mode Selector: Existing vs New */}
                  <div className="flex gap-2 mb-2">
                    <button
                      type="button"
                      onClick={() => { setSelectedEntityId(''); setEntityId(''); }}
                      className={`text-xs px-2 py-1 rounded border ${!selectedEntityId ? 'bg-blue-50 border-blue-200 text-blue-700' : 'bg-white border-gray-200'}`}
                    >
                      Escribir Nombre Nuevo
                    </button>
                    <button
                      type="button"
                      onClick={() => { setSelectedEntityId('PENDING_SELECTION'); setEntityId(''); }}
                      className={`text-xs px-2 py-1 rounded border ${selectedEntityId ? 'bg-blue-50 border-blue-200 text-blue-700' : 'bg-white border-gray-200'}`}
                    >
                      Seleccionar Existente
                    </button>
                  </div>

                  {selectedEntityId || selectedEntityId === 'PENDING_SELECTION' ? (
                     <select
                       className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 p-3"
                       value={selectedEntityId === 'PENDING_SELECTION' ? '' : selectedEntityId}
                       onChange={handleEntitySelect}
                     >
                       {renderEntityOptions()}
                     </select>
                  ) : (
                      <input
                        type="text"
                        autoComplete="off"
                        className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 p-3"
                        placeholder={`Escriba el nombre del nuevo ${activeTab === 'purchase' ? 'proveedor' : 'cliente'}...`}
                        value={entityId}
                        onChange={(e) => setEntityId(e.target.value)}
                      />
                  )}
                  
                  {selectedEntityId && selectedEntityId !== 'PENDING_SELECTION' && (
                      <p className="text-xs text-green-600 mt-1 flex items-center">
                          <Check className="h-3 w-3 mr-1" />
                          {activeTab === 'purchase' ? 'Proveedor' : 'Cliente'} vinculado correctamente.
                      </p>
                  )}
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
                  {currencyId && operationType === 'INVENTORY' && activeTab === 'sale' && (
                     <p className="text-xs text-gray-500 mt-1">
                       Costo Promedio: <strong>$ {getAverageCost(currencyId).toLocaleString('es-CO')}</strong>
                     </p>
                  )}
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
              </div>
            )}
          </form>
        </div>
      </div>
    </div>
  );
};

export default Operations;
