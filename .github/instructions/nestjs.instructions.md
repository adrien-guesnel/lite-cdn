---
applyTo: "**/*.controller.ts,**/*.service.ts,**/*.module.ts,**/*.dto.ts"
description: "Instructions for NestJS files"
---

# NestJS Development Guidelines

## Controllers
- Keep controllers thin - delegate business logic to services
- Use appropriate HTTP decorators (`@Get`, `@Post`, `@Put`, `@Delete`, etc.)
- Apply validation pipes to DTOs
- Use guards for authentication/authorization
- Return appropriate HTTP status codes
- Handle exceptions with exception filters

## Services
- Contain all business logic
- Mark with `@Injectable()` decorator
- Inject dependencies through constructor
- Use interfaces for loose coupling
- Implement error handling with NestJS exceptions (`BadRequestException`, `NotFoundException`, etc.)
- Use NestJS Logger instead of console.log

## DTOs (Data Transfer Objects)
- Define strict input/output structures
- Use class-validator decorators for validation
- Use class-transformer decorators for transformation
- Keep DTOs immutable when possible
- Document required vs optional fields

## Modules
- Organize by feature/domain
- Import dependencies explicitly
- Export providers that other modules need
- Use `@Global()` sparingly
- Avoid circular dependencies

## Dependency Injection
- Prefer constructor injection
- Use interfaces instead of concrete classes when possible
- Avoid `forwardRef`
- Use custom providers when needed (useValue, useFactory, useClass)
