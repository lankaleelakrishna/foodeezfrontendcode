import axios from 'axios';

const TOKEN_KEY = 'restaurant_onboarding_token';

const defaultApiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3001/api/v1';

export const api = axios.create({
  baseURL: defaultApiBaseUrl,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem(TOKEN_KEY);
    if (token) {
      config.headers = {
        ...config.headers,
        Authorization: `Bearer ${token}`,
      };
    }
  }
  return config;
});

export const setAuthToken = (token: string | null) => {
  if (token) {
    api.defaults.headers.common.Authorization = `Bearer ${token}`;
  } else {
    delete api.defaults.headers.common.Authorization;
  }
};

export type PaymentType = 'SUBSCRIPTION' | 'ONBOARDING' | 'COMMISSION';
export type PaymentStatus = 'PENDING' | 'PAID' | 'FAILED' | 'REFUNDED';
export type PaymentMethod = 'UPI' | 'CARD' | 'NET_BANKING' | 'CASH' | 'OTHER';

export type CreatePaymentPayload = {
  restaurantId: string;
  amount: number;
  currency?: string;
  type: PaymentType;
  status?: PaymentStatus;
  transactionId?: string;
  paymentMethod?: PaymentMethod;
  description?: string;
  paidAt?: string;
};

export const paymentApi = {
  create: (data: CreatePaymentPayload) =>
    api.post('/payment-analysis', data),
  list: (page = 1, limit = 20) =>
    api.get(`/payment-analysis?page=${page}&limit=${limit}`),
  summary: () =>
    api.get('/payment-analysis/summary'),
  daily: (year: number, month: number) =>
    api.get(`/payment-analysis/daily?year=${year}&month=${month}`),
  weekly: (year: number, quarter?: number) =>
    api.get(`/payment-analysis/weekly?year=${year}${quarter ? `&quarter=${quarter}` : ''}`),
  monthly: (year: number) =>
    api.get(`/payment-analysis/monthly?year=${year}`),
  quarterly: (year: number) =>
    api.get(`/payment-analysis/quarterly?year=${year}`),
};

// ── Delivery Types ─────────────────────────────────────────────────────────────

export type DeliveryStatus =
  | 'ASSIGNED' | 'ACCEPTED' | 'PICKED_UP' | 'ON_THE_WAY'
  | 'ARRIVED' | 'DELIVERED' | 'CANCELLED';

export type AssignmentType = 'AUTO' | 'MANUAL';

export type DeliveryPartnerStatus =
  | 'PENDING' | 'VERIFIED' | 'ACTIVE' | 'INACTIVE' | 'BLOCKED';

export type VehicleType =
  | 'BICYCLE' | 'MOTORCYCLE' | 'CAR' | 'SCOOTER' | 'ELECTRIC_SCOOTER';

export type SupportTicketType = 'SOS' | 'COMPLAINT' | 'QUERY' | 'INCIDENT';
export type SupportTicketPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type SupportTicketStatus = 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED';

export type PayoutStatus = 'PENDING' | 'PROCESSING' | 'PAID' | 'FAILED';
export type PayoutType = 'DELIVERY_FEE' | 'INCENTIVE' | 'BONUS' | 'PENALTY';

// ── Delivery Partners API ──────────────────────────────────────────────────────

export type CreateDeliveryPartnerPayload = {
  name: string;
  email: string;
  phone: string;
  vehicleType: VehicleType;
  vehicleNumber: string;
  vehicleModel?: string;
  licenseNumber: string;
  aadharNumber?: string;
  panNumber?: string;
  bankAccountNumber?: string;
  bankIfscCode?: string;
  bankName?: string;
  city?: string;
  state?: string;
  profilePhoto?: string;
};

export const deliveryPartnersApi = {
  list: (page = 1, limit = 20, status?: string) =>
    api.get(`/delivery-partners?page=${page}&limit=${limit}${status ? `&status=${status}` : ''}`),
  get: (id: string) =>
    api.get(`/delivery-partners/${id}`),
  create: (data: CreateDeliveryPartnerPayload) =>
    api.post('/delivery-partners', data),
  update: (id: string, data: Partial<CreateDeliveryPartnerPayload>) =>
    api.patch(`/delivery-partners/${id}`, data),
  updateStatus: (id: string, status: DeliveryPartnerStatus) =>
    api.patch(`/delivery-partners/${id}/status`, { status }),
  toggleOnline: (id: string, isOnline: boolean) =>
    api.patch(`/delivery-partners/${id}/online-status`, { isOnline }),
  rate: (id: string, rating: number, comment?: string) =>
    api.post(`/delivery-partners/${id}/rate`, { rating, comment }),
  earnings: (id: string) =>
    api.get(`/delivery-partners/${id}/earnings`),
  delete: (id: string) =>
    api.delete(`/delivery-partners/${id}`),
};

// ── Delivery Assignments API ───────────────────────────────────────────────────

export type AutoAssignPayload = {
  orderId: string;
  restaurantId: string;
  branchId?: string;
  restaurantLatitude: number;
  restaurantLongitude: number;
  customerLatitude: number;
  customerLongitude: number;
  customerAddress?: string;
  deliveryFee?: number;
};

export type ManualAssignPayload = {
  orderId: string;
  partnerId: string;
  restaurantId: string;
  branchId?: string;
  restaurantLatitude?: number;
  restaurantLongitude?: number;
  customerLatitude?: number;
  customerLongitude?: number;
  customerAddress?: string;
  deliveryFee?: number;
};

export const deliveryAssignmentsApi = {
  autoAssign: (data: AutoAssignPayload) =>
    api.post('/delivery-assignments/assign', data),
  manualAssign: (data: ManualAssignPayload) =>
    api.post('/delivery-assignments/manual', data),
  pending: () =>
    api.get('/delivery-assignments/pending'),
  get: (id: string) =>
    api.get(`/delivery-assignments/${id}`),
  byOrder: (orderId: string) =>
    api.get(`/delivery-assignments/order/${orderId}`),
  byPartner: (partnerId: string, page = 1, limit = 20) =>
    api.get(`/delivery-assignments/partner/${partnerId}?page=${page}&limit=${limit}`),
  updateStatus: (id: string, status: DeliveryStatus, cancellationReason?: string) =>
    api.patch(`/delivery-assignments/${id}/status`, { status, cancellationReason }),
  reassign: (id: string, partnerId: string, reason?: string) =>
    api.patch(`/delivery-assignments/${id}/reassign`, { partnerId, reason }),
};

// ── Delivery Tracking API ──────────────────────────────────────────────────────

export const deliveryTrackingApi = {
  updateLocation: (data: {
    partnerId: string; latitude: number; longitude: number;
    speed?: number; heading?: number; accuracy?: number;
    assignmentId?: string; orderId?: string;
  }) => api.post('/delivery-tracking/location', data),
  byOrder: (orderId: string) =>
    api.get(`/delivery-tracking/order/${orderId}`),
  byRider: (riderId: string) =>
    api.get(`/delivery-tracking/rider/${riderId}`),
  riderHistory: (riderId: string, assignmentId?: string) =>
    api.get(`/delivery-tracking/rider/${riderId}/history${assignmentId ? `?assignmentId=${assignmentId}` : ''}`),
  activeRiders: () =>
    api.get('/delivery-tracking/active-riders'),
};

// ── Delivery Support API ───────────────────────────────────────────────────────

export const deliverySupportApi = {
  createSos: (data: {
    partnerId: string; latitude: number; longitude: number;
    assignmentId?: string; description?: string;
  }) => api.post('/delivery-support/sos', data),
  createTicket: (data: {
    partnerId?: string; assignmentId?: string; orderId?: string;
    ticketType: SupportTicketType; priority?: SupportTicketPriority;
    title: string; description: string;
  }) => api.post('/delivery-support/ticket', data),
  listTickets: (page = 1, limit = 20, status?: string, type?: string) =>
    api.get(`/delivery-support/tickets?page=${page}&limit=${limit}${status ? `&status=${status}` : ''}${type ? `&type=${type}` : ''}`),
  sosAlerts: () =>
    api.get('/delivery-support/tickets/sos'),
  getTicket: (id: string) =>
    api.get(`/delivery-support/tickets/${id}`),
  ticketsByPartner: (partnerId: string, page = 1, limit = 20) =>
    api.get(`/delivery-support/tickets/partner/${partnerId}?page=${page}&limit=${limit}`),
  updateTicket: (id: string, data: { status?: SupportTicketStatus; priority?: SupportTicketPriority; adminNotes?: string }) =>
    api.patch(`/delivery-support/tickets/${id}`, data),
};

// ── Delivery Payouts API ───────────────────────────────────────────────────────

export const deliveryPayoutsApi = {
  create: (data: {
    partnerId: string; amount: number; payoutType: PayoutType;
    assignmentId?: string; description?: string;
    periodStart?: string; periodEnd?: string;
  }) => api.post('/delivery-payouts', data),
  list: (page = 1, limit = 20, status?: string) =>
    api.get(`/delivery-payouts?page=${page}&limit=${limit}${status ? `&status=${status}` : ''}`),
  byRider: (partnerId: string, page = 1, limit = 20) =>
    api.get(`/delivery-payouts/rider/${partnerId}?page=${page}&limit=${limit}`),
  process: (id: string) =>
    api.patch(`/delivery-payouts/${id}/process`),
  bulkProcess: (partnerId?: string) =>
    api.post(`/delivery-payouts/process/bulk${partnerId ? `?partnerId=${partnerId}` : ''}`),
};

// ── Delivery Analytics API ─────────────────────────────────────────────────────

export const deliveryAnalyticsApi = {
  overview: (from?: string, to?: string) =>
    api.get(`/delivery-analytics/overview${from ? `?from=${from}${to ? `&to=${to}` : ''}` : ''}`),
  riders: (page = 1, limit = 20) =>
    api.get(`/delivery-analytics/riders?page=${page}&limit=${limit}`),
  orders: (from?: string, to?: string) =>
    api.get(`/delivery-analytics/orders${from ? `?from=${from}${to ? `&to=${to}` : ''}` : ''}`),
  earnings: (from?: string, to?: string) =>
    api.get(`/delivery-analytics/earnings${from ? `?from=${from}${to ? `&to=${to}` : ''}` : ''}`),
};

// ── Restaurants API ────────────────────────────────────────────────────────────

export const restaurantsApi = {
  list: () => api.get('/restaurants'),
  get: (id: string) => api.get(`/restaurants/${id}`),
  create: (data: Record<string, any>) => api.post('/restaurants', data),
  update: (id: string, data: Record<string, any>) => api.patch(`/restaurants/${id}`, data),
  onboarding: (id: string) => api.get(`/restaurants/${id}/onboarding`),
  advanceOnboarding: (id: string) => api.patch(`/restaurants/${id}/onboarding-step`),
  users: (id: string) => api.get(`/restaurants/${id}/users`),
  createUser: (id: string, data: { displayName: string; email: string; role: string; password?: string }) =>
    api.post(`/restaurants/${id}/users`, data),
};

// ── Branches API ───────────────────────────────────────────────────────────────

export const branchesApi = {
  list: (restaurantId: string) =>
    api.get(`/restaurants/${restaurantId}/branches`),
  get: (restaurantId: string, branchId: string) =>
    api.get(`/restaurants/${restaurantId}/branches/${branchId}`),
  create: (restaurantId: string, data: Record<string, any>) =>
    api.post(`/restaurants/${restaurantId}/branches`, data),
  update: (restaurantId: string, branchId: string, data: Record<string, any>) =>
    api.patch(`/restaurants/${restaurantId}/branches/${branchId}`, data),
};

// ── Menu API ───────────────────────────────────────────────────────────────────

export type MenuPricingRuleType = 'DISCOUNT' | 'PRICE_OVERRIDE' | 'TIME_BASED';
export type MenuPricingValueType = 'PERCENTAGE' | 'FLAT';

export const menuApi = {
  // Categories
  listCategories: (branchId: string) =>
    api.get(`/branches/${branchId}/menu-categories`),
  createCategory: (branchId: string, data: { name: string; displayName: string }) =>
    api.post(`/branches/${branchId}/menu-categories`, data),
  updateCategory: (categoryId: string, data: { name?: string; displayName?: string }) =>
    api.patch(`/menu-categories/${categoryId}`, data),

  // Items
  listItems: (branchId: string) =>
    api.get(`/branches/${branchId}/menu-items`),
  createItem: (branchId: string, data: Record<string, any>) =>
    api.post(`/branches/${branchId}/menu-items`, data),
  updateItem: (itemId: string, data: Record<string, any>) =>
    api.patch(`/menu-items/${itemId}`, data),

  // Addons
  listAddons: (itemId: string) =>
    api.get(`/menu-items/${itemId}/addons`),
  createAddon: (itemId: string, data: {
    name: string; description?: string; price: number; currency?: string;
    isRequired: boolean; minSelections: number; maxSelections: number;
    sortOrder?: number; isVisible?: boolean;
  }) => api.post(`/menu-items/${itemId}/addons`, data),
  updateAddon: (addonId: string, data: Record<string, any>) =>
    api.patch(`/menu-addons/${addonId}`, data),

  // Pricing Rules
  listPricingRules: (itemId: string) =>
    api.get(`/menu-items/${itemId}/pricing-rules`),
  createPricingRule: (itemId: string, data: {
    ruleType: MenuPricingRuleType; valueType: MenuPricingValueType;
    value: number; title?: string; startsAt?: string; endsAt?: string;
  }) => api.post(`/menu-items/${itemId}/pricing-rules`, data),
  updatePricingRule: (ruleId: string, data: Record<string, any>) =>
    api.patch(`/menu-pricing-rules/${ruleId}`, data),

  // Bulk upload & AI scan
  bulkUpload: (branchId: string, data: { categories: any[] }) =>
    api.post(`/branches/${branchId}/menu-bulk-upload`, data),
  scan: (branchId: string, data: { imageBase64: string; mimeType?: string }) =>
    api.post(`/branches/${branchId}/menu-scan`, data),
};

// ── Auth / Users API ───────────────────────────────────────────────────────────

export const authApi = {
  me: () => api.get('/auth/me'),
  listUsers: () => api.get('/auth/users'),
  createUser: (data: { displayName: string; email: string; role: string; restaurantId?: string }) =>
    api.post('/auth/users', data),
};

// ── Documents API ──────────────────────────────────────────────────────────────

export type DocumentType = 'FSSAI' | 'GST' | 'BANK';

export const documentsApi = {
  list: (restaurantId: string) =>
    api.get(`/restaurants/${restaurantId}/documents`),
  upload: (restaurantId: string, data: { type: DocumentType; s3Key: string; filename: string }) =>
    api.post(`/restaurants/${restaurantId}/documents`, data),
};
