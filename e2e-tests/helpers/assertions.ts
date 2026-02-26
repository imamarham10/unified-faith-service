import { AxiosResponse } from 'axios';

export function assertStatus(res: AxiosResponse, expected: number, context?: string): void {
  if (res.status !== expected) {
    const ctx = context ? ` [${context}]` : '';
    throw new Error(
      `${ctx} Expected status ${expected}, got ${res.status}. Body: ${JSON.stringify(res.data).substring(0, 300)}`
    );
  }
}

export function assertStatusIn(res: AxiosResponse, statuses: number[], context?: string): void {
  if (!statuses.includes(res.status)) {
    const ctx = context ? ` [${context}]` : '';
    throw new Error(
      `${ctx} Expected status in [${statuses.join(', ')}], got ${res.status}. Body: ${JSON.stringify(res.data).substring(0, 300)}`
    );
  }
}

export function assertHasFields(obj: any, fields: string[], context?: string): void {
  const ctx = context ? ` [${context}]` : '';
  if (!obj || typeof obj !== 'object') {
    throw new Error(`${ctx} Expected object, got ${typeof obj}: ${JSON.stringify(obj)}`);
  }
  for (const field of fields) {
    if (!(field in obj)) {
      throw new Error(`${ctx} Missing field "${field}" in object. Keys: [${Object.keys(obj).join(', ')}]`);
    }
  }
}

export function assertIsArray(value: any, context?: string): void {
  const ctx = context ? ` [${context}]` : '';
  if (!Array.isArray(value)) {
    throw new Error(`${ctx} Expected array, got ${typeof value}: ${JSON.stringify(value).substring(0, 200)}`);
  }
}

export function assertArrayLength(arr: any[], min: number, max?: number, context?: string): void {
  const ctx = context ? ` [${context}]` : '';
  if (arr.length < min) {
    throw new Error(`${ctx} Expected at least ${min} items, got ${arr.length}`);
  }
  if (max !== undefined && arr.length > max) {
    throw new Error(`${ctx} Expected at most ${max} items, got ${arr.length}`);
  }
}

export function assertString(value: any, context?: string): void {
  const ctx = context ? ` [${context}]` : '';
  if (typeof value !== 'string') {
    throw new Error(`${ctx} Expected string, got ${typeof value}: ${JSON.stringify(value)}`);
  }
}

export function assertNumber(value: any, context?: string): void {
  const ctx = context ? ` [${context}]` : '';
  if (typeof value !== 'number') {
    throw new Error(`${ctx} Expected number, got ${typeof value}: ${JSON.stringify(value)}`);
  }
}

export function assertMatches(value: string, pattern: RegExp, context?: string): void {
  const ctx = context ? ` [${context}]` : '';
  if (!pattern.test(value)) {
    throw new Error(`${ctx} Expected "${value}" to match ${pattern}`);
  }
}
