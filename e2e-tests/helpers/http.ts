import axios, { AxiosInstance, AxiosResponse, AxiosError } from 'axios';

const BASE_URL = process.env.API_BASE_URL || 'http://localhost:3000';

const client: AxiosInstance = axios.create({
  baseURL: BASE_URL,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
  validateStatus: () => true, // Don't throw on any status code
});

let authToken: string | null = null;

export function setAuthToken(token: string | null): void {
  authToken = token;
  if (token) {
    client.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  } else {
    delete client.defaults.headers.common['Authorization'];
  }
}

export function getAuthToken(): string | null {
  return authToken;
}

export async function get(path: string, params?: Record<string, any>): Promise<AxiosResponse> {
  return client.get(path, { params });
}

export async function post(path: string, data?: any): Promise<AxiosResponse> {
  return client.post(path, data);
}

export async function put(path: string, data?: any): Promise<AxiosResponse> {
  return client.put(path, data);
}

export async function patch(path: string, data?: any): Promise<AxiosResponse> {
  return client.patch(path, data);
}

export async function del(path: string): Promise<AxiosResponse> {
  return client.delete(path);
}

// Auth helpers
export async function loginAndGetToken(email?: string, password?: string): Promise<string> {
  const res = await post('/auth/login', {
    email: email || process.env.TEST_EMAIL || 'testuser@example.com',
    password: password || process.env.TEST_PASSWORD || 'Test@1234',
  });

  if (res.status === 200 || res.status === 201) {
    const token = res.data?.accessToken || res.data?.data?.accessToken || res.data?.token;
    if (token) {
      setAuthToken(token);
      return token;
    }
  }
  throw new Error(`Login failed with status ${res.status}: ${JSON.stringify(res.data)}`);
}

export async function registerTestUser(overrides?: Partial<{
  email: string; password: string; firstName: string; lastName: string; phone: string;
}>): Promise<AxiosResponse> {
  const user = {
    email: `test+${Date.now()}@example.com`,
    password: 'Test@1234',
    firstName: 'Test',
    lastName: 'User',
    phone: '1234567890',
    ...overrides,
  };
  return post('/auth/register', user);
}

export { BASE_URL, client };
