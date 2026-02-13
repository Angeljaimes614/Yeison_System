import api from './axios';

export const capitalService = {
  findAll: () => api.get('/capital'),
  findOne: (id: string) => api.get(`/capital/${id}`),
};

export const inventoryService = {
  findAll: () => api.get('/inventory'),
};

export const salesService = {
  findAll: () => api.get('/sales'),
  create: (data: any) => api.post('/sales', data),
};

export const purchasesService = {
  findAll: () => api.get('/purchases'),
  create: (data: any) => api.post('/purchases', data),
};

export const currenciesService = {
  findAll: () => api.get('/currencies'),
};

export const providersService = {
  findAll: () => api.get('/providers'),
  create: (data: any) => api.post('/providers', data),
};

export const clientsService = {
  findAll: () => api.get('/clients'),
  create: (data: any) => api.post('/clients', data),
};

export const expensesService = {
  findAll: () => api.get('/expenses'),
  create: (data: any) => api.post('/expenses', data),
};

export const cashAuditService = {
  findAll: () => api.get('/cash-audit'),
  create: (data: any) => api.post('/cash-audit', data),
};
