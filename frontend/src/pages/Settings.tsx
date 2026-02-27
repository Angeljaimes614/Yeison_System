import React, { useState } from 'react';
import api from '../api/axios';
import { AlertTriangle, Trash2, CheckCircle } from 'lucide-react';

const Settings = () => {
  const [step, setStep] = useState(0); // 0: Normal, 1: Confirm, 2: Final Input
  const [confirmationText, setConfirmationText] = useState('');
  const [loading, setLoading] = useState(false);

  const handleReset = async () => {
    if (confirmationText !== 'BORRAR TODO') return;
    
    setLoading(true);
    try {
      await api.delete('/reset-database');
      alert('Sistema reiniciado correctamente.');
      window.location.href = '/'; // Reload
    } catch (error) {
      console.error(error);
      alert('Error al reiniciar sistema.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto mt-10 p-6 bg-white rounded-lg shadow-md border border-gray-200">
      <div className="flex items-center mb-6 text-gray-800">
        <Trash2 className="h-8 w-8 mr-3 text-red-600" />
        <h1 className="text-2xl font-bold">Zona de Peligro</h1>
      </div>

      <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-6">
        <div className="flex">
          <div className="flex-shrink-0">
            <AlertTriangle className="h-5 w-5 text-red-500" />
          </div>
          <div className="ml-3">
            <p className="text-sm text-red-700 font-bold">
              ¡ADVERTENCIA CRÍTICA!
            </p>
            <p className="text-sm text-red-700 mt-1">
              Esta acción borrará PERMANENTEMENTE toda la información del sistema:
            </p>
            <ul className="list-disc list-inside text-sm text-red-700 mt-2 ml-2">
              <li>Ventas y Compras</li>
              <li>Inversiones y Productos</li>
              <li>Deudas y Cartera</li>
              <li>Historial de Caja</li>
              <li>Inventario de Divisas</li>
            </ul>
            <p className="text-sm text-red-800 font-bold mt-2">
              Solo se conservarán los Usuarios y la configuración de Monedas.
            </p>
          </div>
        </div>
      </div>

      <div className="mt-8 border-t pt-6">
        {step === 0 && (
          <button
            onClick={() => setStep(1)}
            className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-4 rounded focus:outline-none focus:shadow-outline transition duration-150 ease-in-out"
          >
            REINICIAR SISTEMA (BORRAR TODO)
          </button>
        )}

        {step === 1 && (
          <div className="text-center">
            <p className="mb-4 text-lg font-bold text-gray-800">¿Estás absolutamente seguro?</p>
            <div className="flex justify-center gap-4">
              <button
                onClick={() => setStep(0)}
                className="bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold py-2 px-6 rounded"
              >
                Cancelar
              </button>
              <button
                onClick={() => setStep(2)}
                className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-6 rounded"
              >
                Sí, estoy seguro
              </button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="text-center">
            <p className="mb-4 text-gray-700">
              Escribe <strong>BORRAR TODO</strong> para confirmar:
            </p>
            <input
              type="text"
              value={confirmationText}
              onChange={(e) => setConfirmationText(e.target.value)}
              className="border-2 border-red-300 rounded px-4 py-2 w-full mb-4 text-center font-bold text-red-600 uppercase"
              placeholder="BORRAR TODO"
            />
            <div className="flex justify-center gap-4">
              <button
                onClick={() => setStep(0)}
                className="bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold py-2 px-6 rounded"
              >
                Cancelar
              </button>
              <button
                onClick={handleReset}
                disabled={confirmationText !== 'BORRAR TODO' || loading}
                className={`font-bold py-2 px-6 rounded ${
                  confirmationText === 'BORRAR TODO' 
                    ? 'bg-red-600 hover:bg-red-700 text-white' 
                    : 'bg-red-200 text-red-400 cursor-not-allowed'
                }`}
              >
                {loading ? 'Borrando...' : 'CONFIRMAR BORRADO'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Settings;
