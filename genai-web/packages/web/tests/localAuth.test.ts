import { describe, it, expect, beforeEach } from 'vitest';
import { clearToken, getToken } from '@/local/localAuth';

describe('localAuth clearToken and token management', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('clearToken successfully removes auth token from localStorage', () => {
    localStorage.setItem('open-genai-token', 'fake-jwt-token');
    expect(getToken()).toBe('fake-jwt-token');

    clearToken();

    expect(getToken()).toBeNull();
  });
});
