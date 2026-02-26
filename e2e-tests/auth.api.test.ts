import { describe, it, beforeAll } from './api-test-runner';
import { post, get, setAuthToken, registerTestUser, loginAndGetToken, BASE_URL } from './helpers/http';
import { assertStatus, assertStatusIn, assertHasFields, assertString } from './helpers/assertions';

describe('Auth API — Registration', () => {
  it('should register a new user with valid data', async () => {
    const res = await registerTestUser();
    assertStatusIn(res, [200, 201], 'Register valid user');
  });

  it('should reject registration with missing email', async () => {
    const res = await post('/auth/register', {
      password: 'Test@1234',
      firstName: 'Test',
      lastName: 'User',
      phone: '1234567890',
    });
    assertStatus(res, 400, 'Missing email');
  });

  it('should reject registration with invalid email format', async () => {
    const res = await post('/auth/register', {
      email: 'not-an-email',
      password: 'Test@1234',
      firstName: 'Test',
      lastName: 'User',
      phone: '1234567890',
    });
    assertStatus(res, 400, 'Invalid email format');
  });

  it('should reject registration with missing password', async () => {
    const res = await post('/auth/register', {
      email: `test+${Date.now()}@example.com`,
      firstName: 'Test',
      lastName: 'User',
      phone: '1234567890',
    });
    assertStatus(res, 400, 'Missing password');
  });

  it('should reject registration with password shorter than 8 chars', async () => {
    const res = await post('/auth/register', {
      email: `test+${Date.now()}@example.com`,
      password: 'short',
      firstName: 'Test',
      lastName: 'User',
      phone: '1234567890',
    });
    assertStatus(res, 400, 'Short password');
  });

  it('[BUG #4] should accept weak password with only lowercase (no uppercase/number/special)', async () => {
    // Backend only validates MinLength(8), not complexity
    const res = await post('/auth/register', {
      email: `test+weak${Date.now()}@example.com`,
      password: 'abcdefgh', // 8 chars, all lowercase — frontend would reject this
      firstName: 'Test',
      lastName: 'User',
      phone: '1234567890',
    });
    // BUG: This SHOULD be 400 (matching frontend validation) but backend accepts it
    assertStatusIn(res, [200, 201], 'Weak password accepted by backend');
  });

  it('[BUG #5] should accept non-numeric phone number', async () => {
    // Backend only checks IsNotEmpty, no format validation
    const res = await post('/auth/register', {
      email: `test+phone${Date.now()}@example.com`,
      password: 'Test@1234',
      firstName: 'Test',
      lastName: 'User',
      phone: 'hello', // Not a phone number — backend should reject
    });
    // BUG: Backend accepts "hello" as a phone number
    assertStatusIn(res, [200, 201], 'Non-numeric phone accepted');
  });

  it('should reject registration with missing firstName', async () => {
    const res = await post('/auth/register', {
      email: `test+${Date.now()}@example.com`,
      password: 'Test@1234',
      lastName: 'User',
      phone: '1234567890',
    });
    assertStatus(res, 400, 'Missing firstName');
  });

  it('should reject registration with missing lastName', async () => {
    const res = await post('/auth/register', {
      email: `test+${Date.now()}@example.com`,
      password: 'Test@1234',
      firstName: 'Test',
      phone: '1234567890',
    });
    assertStatus(res, 400, 'Missing lastName');
  });

  it('should reject registration with empty body', async () => {
    const res = await post('/auth/register', {});
    assertStatus(res, 400, 'Empty body');
  });

  it('should reject duplicate email registration', async () => {
    const email = `test+dup${Date.now()}@example.com`;
    await registerTestUser({ email });
    const res = await registerTestUser({ email });
    assertStatusIn(res, [400, 409], 'Duplicate email');
  });
});

describe('Auth API — Login', () => {
  let testEmail: string;
  const testPassword = 'Test@1234';

  beforeAll(async () => {
    testEmail = `test+login${Date.now()}@example.com`;
    await registerTestUser({ email: testEmail, password: testPassword });
  });

  it('should login with valid credentials', async () => {
    const res = await post('/auth/login', { email: testEmail, password: testPassword });
    assertStatusIn(res, [200, 201], 'Valid login');
    const data = res.data?.data || res.data;
    // Should return tokens
    const hasToken = data?.accessToken || data?.token;
    if (!hasToken) throw new Error('Login response missing accessToken');
  });

  it('should reject login with wrong password', async () => {
    const res = await post('/auth/login', { email: testEmail, password: 'WrongPass@123' });
    assertStatus(res, 401, 'Wrong password');
  });

  it('should reject login with non-existent email', async () => {
    const res = await post('/auth/login', { email: 'nonexistent@example.com', password: 'Test@1234' });
    assertStatusIn(res, [401, 404], 'Non-existent email');
  });

  it('should reject login with empty body', async () => {
    const res = await post('/auth/login', {});
    assertStatus(res, 400, 'Empty login body');
  });

  it('should reject login with missing password', async () => {
    const res = await post('/auth/login', { email: testEmail });
    assertStatus(res, 400, 'Missing password in login');
  });
});

describe('Auth API — Token Validation & Profile', () => {
  beforeAll(async () => {
    const email = `test+profile${Date.now()}@example.com`;
    await registerTestUser({ email, password: 'Test@1234' });
    await loginAndGetToken(email, 'Test@1234');
  });

  it('should validate a valid token', async () => {
    const res = await get('/auth/validate');
    assertStatusIn(res, [200, 201], 'Validate token');
  });

  it('should get user profile with valid token', async () => {
    const res = await get('/auth/profile');
    assertStatusIn(res, [200, 201], 'Get profile');
  });

  it('should reject profile request without token', async () => {
    const currentToken = require('./helpers/http').getAuthToken();
    setAuthToken(null);
    const res = await get('/auth/profile');
    assertStatus(res, 401, 'Profile without token');
    setAuthToken(currentToken);
  });

  it('should reject request with invalid token', async () => {
    setAuthToken('invalid-token-string');
    const res = await get('/auth/profile');
    assertStatus(res, 401, 'Invalid token');
    // Re-login to restore valid token
    const email = `test+reauth${Date.now()}@example.com`;
    await registerTestUser({ email, password: 'Test@1234' });
    await loginAndGetToken(email, 'Test@1234');
  });
});

describe('Auth API — OTP Flow', () => {
  it('should request OTP for valid email', async () => {
    const email = `test+otp${Date.now()}@example.com`;
    await registerTestUser({ email });
    const res = await post('/auth/login/request-otp', { email });
    assertStatusIn(res, [200, 201], 'Request OTP');
  });

  it('should reject OTP request with missing email', async () => {
    const res = await post('/auth/login/request-otp', {});
    assertStatus(res, 400, 'OTP missing email');
  });

  it('should reject OTP verification with invalid code', async () => {
    const res = await post('/auth/login/verify-otp', {
      email: 'testuser@example.com',
      otp: '000000',
    });
    assertStatusIn(res, [400, 401], 'Invalid OTP code');
  });

  it('[BUG #7] should not have rate limiting (unlimited OTP requests)', async () => {
    const email = `test+rate${Date.now()}@example.com`;
    await registerTestUser({ email });

    // Send 10 rapid OTP requests — should all succeed (no rate limiting)
    const results: number[] = [];
    for (let i = 0; i < 10; i++) {
      const res = await post('/auth/login/request-otp', { email });
      results.push(res.status);
    }

    // BUG: All requests succeed — no 429 Too Many Requests
    const has429 = results.includes(429);
    if (!has429) {
      // This documents the bug — rate limiting should exist
      console.log('      [BUG #7] No rate limiting detected — all 10 OTP requests succeeded');
    }
  });
});

describe('Auth API — Security Checks', () => {
  it('[BUG #10] CORS should be restricted but is open to all origins', async () => {
    // Send request with Origin header from a random domain
    const axios = require('axios');
    const res = await axios.get(`${BASE_URL}/auth/validate`, {
      headers: { 'Origin': 'https://evil-site.com' },
      validateStatus: () => true,
    });

    const corsHeader = res.headers['access-control-allow-origin'];
    // BUG: CORS allows * (all origins)
    if (corsHeader === '*') {
      console.log('      [BUG #10] CORS is open to all origins: access-control-allow-origin: *');
    }
  });
});
