import { getExampleConfig } from '../config.js';

describe('Config Utils', () => {
  describe('getExampleConfig', () => {
    it('should return valid example configuration', () => {
      const config = getExampleConfig();
      
      expect(config).toHaveProperty('vaults');
      expect(config).toHaveProperty('server');
      expect(Array.isArray(config.vaults)).toBe(true);
      expect(config.vaults.length).toBeGreaterThan(0);
    });

    it('should have valid vault configurations', () => {
      const config = getExampleConfig();
      
      config.vaults.forEach(vault => {
        expect(vault).toHaveProperty('name');
        expect(vault).toHaveProperty('type');
        expect(['local', 'remote']).toContain(vault.type);
        
        if (vault.type === 'local') {
          expect(vault).toHaveProperty('path');
        } else if (vault.type === 'remote') {
          expect(vault).toHaveProperty('url');
        }
      });
    });

    it('should have server configuration', () => {
      const config = getExampleConfig();
      
      expect(config.server).toHaveProperty('name');
      expect(config.server).toHaveProperty('version');
      expect(typeof config.server?.name).toBe('string');
      expect(typeof config.server?.version).toBe('string');
    });

    it('should have Obsidian API configuration', () => {
      const config = getExampleConfig();
      
      if (config.obsidianApi) {
        expect(config.obsidianApi).toHaveProperty('restApiUrl');
        expect(config.obsidianApi).toHaveProperty('apiKey');
      }
    });
  });
});
