---
applyTo: "**/*.test.ts,**/*.spec.ts"
description: "Instructions for test files"
---

# Testing Directives

## Jest Configuration
- Use Jest exclusively for all tests
- Structure: `describe()` for test suites, `it()` or `test()` for individual test cases
- Include setup/teardown with `beforeEach`/`afterEach` if necessary
- Mock external dependencies with `jest.mock()`
- Verify assertions with `expect()`

## NestJS Testing
- Use NestJS Testing utilities (`@nestjs/testing`)
- Create testing modules with `Test.createTestingModule()`
- Mock providers and dependencies properly
- Test controllers with supertest for e2e tests
- Test services in isolation with mocked dependencies
- Use `beforeEach` to create fresh module instances

## Test Structure
```typescript
describe('ServiceName', () => {
  let service: ServiceName;
  let dependency: MockType<DependencyName>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ServiceName,
        {
          provide: DependencyName,
          useFactory: mockDependency,
        },
      ],
    }).compile();

    service = module.get<ServiceName>(ServiceName);
    dependency = module.get(DependencyName);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('methodName', () => {
    it('should handle success case', async () => {
      // Arrange
      // Act
      // Assert
    });

    it('should handle error case', async () => {
      // Arrange
      // Act
      // Assert
    });
  });
});
