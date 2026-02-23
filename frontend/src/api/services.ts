import api from './axios';

export const usersService = {
  findAll: () => api.get('/users'),
  create: (data: any) => api.post('/users', data),
  update: (id: string, data: any) => api.patch(`/users/${id}`, data),
  remove: (id: string) => api.delete(`/users/${id}`),
};

export const branchesService = {
  findAll: () => api.get('/branches'),
  create: (data: any) => api.post('/branches', data),
  update: (id: string, data: any) => api.patch(`/branches/${id}`, data),
};

export const capitalService = {
  findAll: () => api.get('/capital'),
  findOne: (id: string) => api.get(`/capital/${id}`),
  update: (id: string, data: any) => api.patch(`/capital/${id}`, data),
  // Financial Movements
  registerMovement: (data: { type: 'INJECTION' | 'WITHDRAWAL_PROFIT' | 'WITHDRAWAL_CAPITAL', amount: number, description: string, userId: string }) => 
    api.post('/capital/movements', data),
  getMovements: () => api.get('/capital/movements'),
};

export const inventoryService = {
  findAll: () => api.get('/inventory'),
  findGlobal: () => api.get('/inventory/global'),
};

export const exchangesService = {
  findAll: () => api.get('/exchanges'),
  create: (data: any) => api.post('/exchanges', data),
};

export const salesService = {
  findAll: () => api.get('/sales'),
  create: (data: any) => api.post('/sales', data),
  reverse: (id: string, data: { userId: string, reason: string }) => api.post(`/sales/${id}/reverse`, data),
};

export const purchasesService = {
  findAll: () => api.get('/purchases'),
  create: (data: any) => api.post('/purchases', data),
  reverse: (id: string, data: { userId: string, reason: string }) => api.post(`/purchases/${id}/reverse`, data),
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

export const paymentsService = {
  create: (data: any) => api.post('/payments', data),
  findAll: () => api.get('/payments'),
};

export const investmentsService = {
  create: (data: any) => api.post('/investments', data),
  findAll: () => api.get('/investments'),
};

export const cashAuditService = {
  findAll: () => api.get('/cash-audit'),
  create: (data: any) => api.post('/cash-audit', data),
};
