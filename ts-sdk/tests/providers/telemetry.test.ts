import { describe, it, expect } from 'vitest';
import { extractSDKVersion } from '@/providers/telemetry.js';

describe('Telemetry Utilities: extractSDKVersion', () => {
  it('should extract version from the .VERSION property', () => {
    const client = { VERSION: '1.2.3' };
    expect(extractSDKVersion(client)).toBe('1.2.3');
  });

  it('should extract version from the .version property', () => {
    const client = { version: '2.0.0-beta.1' };
    expect(extractSDKVersion(client)).toBe('2.0.0-beta.1');
  });

  it('should prioritize .VERSION over .version', () => {
    const client = { VERSION: '1.0.0', version: '2.0.0' };
    expect(extractSDKVersion(client)).toBe('1.0.0');
  });

  describe('User-Agent Sniffing', () => {
    it('should extract semver from a valid getUserAgent string', () => {
      const client = { getUserAgent: () => 'OpenAI/JS 4.28.0' };
      expect(extractSDKVersion(client)).toBe('4.28.0');
    });

    it('should extract semver with pre-release tags', () => {
      const client = { getUserAgent: () => 'Anthropic/JS 0.18.0-alpha.1' };
      expect(extractSDKVersion(client)).toBe('0.18.0-alpha.1');
    });

    it('should gracefully handle getUserAgent returning a string without a version', () => {
      const client = { getUserAgent: () => 'UnknownClient/JS' };
      expect(extractSDKVersion(client)).toBeNull();
    });

    it('should safely catch and ignore errors thrown by getUserAgent', () => {
      const client = {
        getUserAgent: () => {
          throw new Error('Internal failure');
        },
      };
      // Should not throw, should return null
      expect(extractSDKVersion(client)).toBeNull();
    });
  });

  describe('Default Headers Sniffing (Stainless)', () => {
    it('should extract version from x-stainless-package-version header', () => {
      const client = {
        defaultHeaders: () => ({
          'x-stainless-package-version': '3.1.4',
          'other-header': 'value',
        }),
      };
      expect(extractSDKVersion(client)).toBe('3.1.4');
    });

    it('should safely ignore defaultHeaders if the package version header is missing', () => {
      const client = {
        defaultHeaders: () => ({
          'content-type': 'application/json',
        }),
      };
      expect(extractSDKVersion(client)).toBeNull();
    });

    it('should safely catch and ignore errors thrown by defaultHeaders', () => {
      const client = {
        defaultHeaders: () => {
          throw new Error('Missing config');
        },
      };
      expect(extractSDKVersion(client)).toBeNull();
    });
  });

  describe('Edge Cases', () => {
    it('should return null for empty objects', () => {
      expect(extractSDKVersion({})).toBeNull();
    });

    it('should return null for null/undefined inputs', () => {
      expect(extractSDKVersion(null)).toBeNull();
      expect(extractSDKVersion(undefined)).toBeNull();
    });

    it('should return null for primitive types', () => {
      expect(extractSDKVersion('1.0.0')).toBeNull();
      expect(extractSDKVersion(123)).toBeNull();
    });

    it('should handle missing properties safely if a client masquerades as an object', () => {
      const client = { getUserAgent: 'not-a-function' };
      expect(extractSDKVersion(client)).toBeNull();
    });
  });
});
