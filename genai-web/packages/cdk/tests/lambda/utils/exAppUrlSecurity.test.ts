import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  assertPublicEndpointUrl,
  assertPublicStatusUrl,
  parseHttpsUrl,
  requestValidatedExAppUrl,
  resolveRelativeStatusUrl,
  toRelativeStatusUrl,
  UnsafeExAppUrlError,
} from '../../../lambda/utils/exAppUrlSecurity';

describe('exAppUrlSecurity', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe('parseHttpsUrl', () => {
    it('HTTPS URLをパースする', () => {
      const url = parseHttpsUrl('https://api.example.com/invoke?x=1');

      expect(url.toString()).toBe('https://api.example.com/invoke?x=1');
    });

    it.each([
      'http://api.example.com/invoke',
      'file:///etc/passwd',
      'https://user:pass@api.example.com/invoke',
      'https://api.example.com/invoke#fragment',
      ' https://api.example.com/invoke',
      'https://api.example.com/invoke\n',
      'not-a-url',
    ])('不正なendpoint URLを拒否する: %s', (value) => {
      expect(() => parseHttpsUrl(value)).toThrow(UnsafeExAppUrlError);
    });
  });

  describe('assertPublicEndpointUrl', () => {
    it('HTTPSドメインをDNS解決せず許可する', async () => {
      const result = await assertPublicEndpointUrl('https://api.example.com/invoke');

      expect(result.url.hostname).toBe('api.example.com');
    });

    it('public IP literalを許可する', async () => {
      const result = await assertPublicEndpointUrl('https://8.8.8.8/invoke');

      expect(result.url.hostname).toBe('8.8.8.8');
    });

    it('public IPv6 literalを許可する', async () => {
      const result = await assertPublicEndpointUrl('https://[2001:4860:4860::8888]/invoke');

      expect(result.url.hostname).toBe('[2001:4860:4860::8888]');
    });

    it.each([
      'https://localhost/invoke',
      'https://LOCALHOST/invoke',
      'https://localhost./invoke',
      'https://./invoke',
      'https://.../invoke',
      'https://api.localhost/invoke',
      'https://api.localhost./invoke',
      'https://127.0.0.1/invoke',
      'https://127.0.0.1./invoke',
      'https://127.1/invoke',
      'https://0177.0.0.1/invoke',
      'https://127.000.000.001/invoke',
      'https://2130706433/invoke',
      'https://0x7f000001/invoke',
      'https://0.0.0.0/invoke',
      'https://255.255.255.255/invoke',
      'https://224.0.0.1/invoke',
      'https://[::1]/invoke',
      'https://[::]/invoke',
      'https://[fe80::1]/invoke',
      'https://[fd00::1]/invoke',
      'https://[ff02::1]/invoke',
      'https://[2001:db8::1]/invoke',
      'https://[::ffff:127.0.0.1]/invoke',
      'https://169.254.169.254/latest/meta-data',
      'https://10.0.0.1/invoke',
      'https://172.16.0.1/invoke',
      'https://192.168.0.1/invoke',
      'https://100.64.0.1/invoke',
      'https://203.0.113.10/invoke',
    ])('内部・特殊用途IP literalを拒否する: %s', async (value) => {
      await expect(assertPublicEndpointUrl(value)).rejects.toBeInstanceOf(UnsafeExAppUrlError);
    });

    it.each([
      'https://localhost/test',
      'https://127.0.0.1/test',
      'https://10.0.0.1/test',
      'https://172.16.0.1/test',
      'https://192.168.0.1/test',
      'https://169.254.169.254/latest/meta-data/',
      'https://[::1]/test',
      'https://[fe80::1]/test',
      'https://[fd00::1]/test',
      'https://[::ffff:127.0.0.1]/test',
    ])('代表的な内部向けendpointを拒否する: %s', async (value) => {
      await expect(assertPublicEndpointUrl(value)).rejects.toBeInstanceOf(UnsafeExAppUrlError);
    });
  });

  describe('resolveRelativeStatusUrl', () => {
    it('相対status_urlをendpoint originに解決する', async () => {
      const endpoint = await assertPublicEndpointUrl('https://api.example.com/prod/invoke');

      const result = resolveRelativeStatusUrl('/status/123?poll=1', endpoint);

      expect(result.url.toString()).toBe('https://api.example.com/status/123?poll=1');
      expect(toRelativeStatusUrl(result.url)).toBe('/status/123?poll=1');
    });

    it.each([
      'https://evil.example/status/123',
      'http://10.0.0.5/internal-service',
      '//evil.example/status/123',
      '/\\evil.example/status/123',
      '\t/status/123',
      '/status/123#fragment',
      'status/123',
      '',
    ])('不正なstatus_urlを拒否する: %s', async (statusUrl) => {
      const endpoint = await assertPublicEndpointUrl('https://api.example.com/invoke');

      expect(() => resolveRelativeStatusUrl(statusUrl, endpoint)).toThrow(UnsafeExAppUrlError);
    });

    it.each(['/%2F%2Fevil.example/status', '/%5Cevil.example/status'])(
      'エンコード済みの紛らわしいstatus_urlも同一originのパスとして扱う: %s',
      async (statusUrl) => {
        const endpoint = await assertPublicEndpointUrl('https://api.example.com/invoke');

        const result = resolveRelativeStatusUrl(statusUrl, endpoint);

        expect(result.url.origin).toBe('https://api.example.com');
        expect(toRelativeStatusUrl(result.url)).toBe(statusUrl);
      },
    );

    it('assertPublicStatusUrlはendpoint検証とstatus_url解決をまとめて行う', async () => {
      const result = await assertPublicStatusUrl('/prod/status/123', 'https://api.example.com/prod/invoke');

      expect(result.url.toString()).toBe('https://api.example.com/prod/status/123');
    });
  });

  describe('requestValidatedExAppUrl', () => {
    it('redirectを追従せずに外部リクエストを送信する', async () => {
      const response = new Response('{"ok":true}', { status: 200 });
      const fetchMock = vi.fn().mockResolvedValue(response);
      vi.stubGlobal('fetch', fetchMock);
      const endpoint = await assertPublicEndpointUrl('https://api.example.com/invoke');

      const result = await requestValidatedExAppUrl(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: '{"input":"test"}',
      });

      expect(result.status).toBe(200);
      expect(fetchMock).toHaveBeenCalledWith(endpoint.url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: '{"input":"test"}',
        redirect: 'manual',
      });
    });

    it('method未指定時はGETで外部リクエストを送信する', async () => {
      const response = new Response('{"ok":true}', { status: 200 });
      const fetchMock = vi.fn().mockResolvedValue(response);
      vi.stubGlobal('fetch', fetchMock);
      const endpoint = await assertPublicEndpointUrl('https://api.example.com/invoke');

      await requestValidatedExAppUrl(endpoint);

      expect(fetchMock).toHaveBeenCalledWith(endpoint.url, {
        method: 'GET',
        headers: undefined,
        body: undefined,
        redirect: 'manual',
      });
    });

    it('redirectレスポンスを拒否する', async () => {
      const fetchMock = vi.fn().mockResolvedValue(new Response('', { status: 302 }));
      vi.stubGlobal('fetch', fetchMock);
      const endpoint = await assertPublicEndpointUrl('https://api.example.com/invoke');

      await expect(requestValidatedExAppUrl(endpoint)).rejects.toBeInstanceOf(UnsafeExAppUrlError);
    });
  });
});
