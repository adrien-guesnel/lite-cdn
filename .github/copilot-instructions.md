# Project Instructions

## Package Manager
- Use `pnpm` for all dependency and script commands

## Development Tools

### Formatting and Linting
- **Use EXCLUSIVELY Biome** for code formatting and linting
- All generated code MUST comply with Biome rules configured in `biome.json`
- NEVER suggest ESLint or Prettier as alternatives
- Before proposing code, ensure it passes `biome check`

#### CI Lint Rule
- CI runs `pnpm lint` which maps to `biome check .`
- All changes must keep `pnpm lint` green locally and in CI

### Testing
- **Use EXCLUSIVELY Jest** as the testing framework
- All tests must follow Jest's `describe/it` structure
- Test files must have `.test.ts` or `.spec.ts` extension
- Include appropriate mocks for external dependencies
- Test both success and error cases
- Write isolated tests - each test should be independent and not rely on other tests' state

#### CI Test Rule
- CI runs `pnpm test` which maps to `jest`
- For new or modified features, ensure relevant unit tests pass
- If you change API behavior, update/extend e2e tests when applicable (`pnpm test:e2e`)

## NestJS Framework Guidelines

### Architecture
- Follow NestJS best practices and modular architecture
- Controllers handle HTTP requests and validation only
- Services contain business logic
- Use DTOs to define strict input/output structures
- Avoid `forwardRef` to prevent circular dependencies
- Prefer dependency injection using interfaces rather than concrete classes

### TypeScript Best Practices
- Never use `any` type
- Avoid unhandled promises
- Do not use unsafe parameters
- Avoid logging with `console.*` - use NestJS Logger instead
- Favor interfaces for defining shapes and classes for encapsulating behavior

### Code Structure
- Use decorators appropriately (`@Controller`, `@Injectable`, `@Module`, etc.)
- Implement proper exception handling with NestJS exception filters
- Use Guards for authentication/authorization
- Use Interceptors for request/response transformation
- Use Pipes for validation and transformation
- Organize code by feature modules

## Code Rules

- Respect formatting conventions defined in Biome configuration
- Every new feature must be accompanied by Jest tests
- Use `async/await` with appropriate `try-catch` blocks for asynchronous operations
- Use TypeScript strict mode
- Document complex business logic with comments
