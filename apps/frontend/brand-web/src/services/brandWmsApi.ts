/**
 * Brand WMS API Service
 * Centralizes all Brand Interface WMS API calls to /brand-api/wms/*
 */

const BASE_URL = '/brand-api/wms';

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export const brandWmsApi = {
  // ========== PRODUCTS ==========
  async getProducts() {
    const response = await fetch(`${BASE_URL}/products`);
    return response.json() as Promise<ApiResponse<any[]>>;
  },

  async getProduct(id: string) {
    const response = await fetch(`${BASE_URL}/products/${id}`);
    return response.json() as Promise<ApiResponse<any>>;
  },

  async createProduct(data: any) {
    const response = await fetch(`${BASE_URL}/products`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return response.json() as Promise<ApiResponse<any>>;
  },

  async updateProduct(id: string, data: any) {
    const response = await fetch(`${BASE_URL}/products/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return response.json() as Promise<ApiResponse<any>>;
  },

  async deleteProduct(id: string) {
    const response = await fetch(`${BASE_URL}/products/${id}`, {
      method: 'DELETE'
    });
    return response.json() as Promise<ApiResponse<boolean>>;
  },

  // ========== CATEGORIES ==========
  async getCategories() {
    const response = await fetch(`${BASE_URL}/categories`);
    return response.json() as Promise<ApiResponse<any[]>>;
  },

  async getCategory(id: string) {
    const response = await fetch(`${BASE_URL}/categories/${id}`);
    return response.json() as Promise<ApiResponse<any>>;
  },

  async createCategory(data: any) {
    const response = await fetch(`${BASE_URL}/categories`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return response.json() as Promise<ApiResponse<any>>;
  },

  async updateCategory(id: string, data: any) {
    const response = await fetch(`${BASE_URL}/categories/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return response.json() as Promise<ApiResponse<any>>;
  },

  async deleteCategory(id: string) {
    const response = await fetch(`${BASE_URL}/categories/${id}`, {
      method: 'DELETE'
    });
    return response.json() as Promise<ApiResponse<boolean>>;
  },

  // ========== PRODUCT TYPES ==========
  async getProductTypes() {
    const response = await fetch(`${BASE_URL}/product-types`);
    return response.json() as Promise<ApiResponse<any[]>>;
  },

  async getProductType(id: string) {
    const response = await fetch(`${BASE_URL}/product-types/${id}`);
    return response.json() as Promise<ApiResponse<any>>;
  },

  async createProductType(data: any) {
    const response = await fetch(`${BASE_URL}/product-types`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return response.json() as Promise<ApiResponse<any>>;
  },

  async updateProductType(id: string, data: any) {
    const response = await fetch(`${BASE_URL}/product-types/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return response.json() as Promise<ApiResponse<any>>;
  },

  async deleteProductType(id: string) {
    const response = await fetch(`${BASE_URL}/product-types/${id}`, {
      method: 'DELETE'
    });
    return response.json() as Promise<ApiResponse<boolean>>;
  },

  // ========== SUPPLIERS ==========
  async getSuppliers() {
    const response = await fetch(`${BASE_URL}/suppliers`);
    return response.json() as Promise<ApiResponse<any[]>>;
  },

  async getSupplier(id: string) {
    const response = await fetch(`${BASE_URL}/suppliers/${id}`);
    return response.json() as Promise<ApiResponse<any>>;
  },

  async createSupplier(data: any) {
    const response = await fetch(`${BASE_URL}/suppliers`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return response.json() as Promise<ApiResponse<any>>;
  },

  async updateSupplier(id: string, data: any) {
    const response = await fetch(`${BASE_URL}/suppliers/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return response.json() as Promise<ApiResponse<any>>;
  },

  async deleteSupplier(id: string) {
    const response = await fetch(`${BASE_URL}/suppliers/${id}`, {
      method: 'DELETE'
    });
    return response.json() as Promise<ApiResponse<boolean>>;
  }
};
