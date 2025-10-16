# Testing Guide

## Running Tests

### Install Dependencies
```bash
npm install
```

### Run All Tests
```bash
npm test
```

### Watch Mode (for development)
```bash
npm run test:watch
```

### Generate Coverage Report
```bash
npm run test:coverage
```

## Test Structure

```
src/
├── services/
│   ├── __tests__/
│   │   └── KnowledgeGraph.test.ts
│   └── KnowledgeGraph.ts
├── utils/
│   ├── __tests__/
│   │   ├── markdown.test.ts
│   │   └── config.test.ts
│   ├── markdown.ts
│   └── config.ts
└── ...
```

## What's Tested

### ✅ Utils Tests
- **markdown.ts**: Link extraction, tag extraction, note parsing, serialization, word counting
- **config.ts**: Configuration validation and example generation

### ✅ Service Tests
- **KnowledgeGraph.ts**: Graph building, path finding, related notes, analysis, tag/folder queries

### 🚧 To Be Added
- LocalConnector tests (requires mocking file system)
- RemoteConnector tests (requires mocking HTTP)
- CanvasService tests
- DataviewService tests
- TemplateService tests
- PeriodicNotesService tests

## Coverage Goals

- **Branches**: 70%
- **Functions**: 70%
- **Lines**: 70%
- **Statements**: 70%

## CI/CD

Tests run automatically on:
- Push to `main`, `master`, or `develop` branches
- Pull requests to these branches

GitHub Actions tests on Node.js versions:
- 18.x
- 20.x
- 22.x

## Writing New Tests

### Example Test File
```typescript
import { MyService } from '../MyService.js';

describe('MyService', () => {
  let service: MyService;

  beforeEach(() => {
    service = new MyService();
  });

  describe('myMethod', () => {
    it('should do something', () => {
      const result = service.myMethod('input');
      expect(result).toBe('expected');
    });

    it('should handle edge cases', () => {
      expect(() => service.myMethod('')).toThrow();
    });
  });
});
```

### Best Practices
1. **Arrange-Act-Assert** pattern
2. Test both success and error cases
3. Use descriptive test names
4. Keep tests isolated and independent
5. Mock external dependencies
6. Test edge cases and boundary conditions

## Debugging Tests

### Run Specific Test File
```bash
npm test -- markdown.test.ts
```

### Run Tests Matching Pattern
```bash
npm test -- --testNamePattern="extractInternalLinks"
```

### Debug with VS Code
Add to `.vscode/launch.json`:
```json
{
  "type": "node",
  "request": "launch",
  "name": "Jest Current File",
  "program": "${workspaceFolder}/node_modules/.bin/jest",
  "args": [
    "${fileBasenameNoExtension}",
    "--config",
    "jest.config.js"
  ],
  "console": "integratedTerminal",
  "internalConsoleOptions": "neverOpen"
}
```

## Troubleshooting

### ESM Module Issues
If you see errors about ESM modules:
- Ensure `"type": "module"` is in package.json
- Use `.js` extensions in imports
- Check jest.config.js has ESM preset

### Type Errors
```bash
# Rebuild TypeScript
npm run build
```

### Stale Test Cache
```bash
# Clear Jest cache
npx jest --clearCache
```

## Test Dependencies

- **jest**: Test framework
- **ts-jest**: TypeScript support for Jest
- **@types/jest**: TypeScript types for Jest

## Continuous Integration

See `.github/workflows/test.yml` for CI configuration.

### Badges
Add to README:
```markdown
![Tests](https://github.com/YOUR_USERNAME/obsidian-mcp/actions/workflows/test.yml/badge.svg)
[![codecov](https://codecov.io/gh/YOUR_USERNAME/obsidian-mcp/branch/main/graph/badge.svg)](https://codecov.io/gh/YOUR_USERNAME/obsidian-mcp)
```


