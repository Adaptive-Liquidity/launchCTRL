```markdown
# launchCTRL Development Patterns

> Auto-generated skill from repository analysis

## Overview
This skill teaches best practices and conventions for contributing to the `launchCTRL` TypeScript codebase. It covers file organization, code style, commit patterns, and testing approaches, ensuring consistency and maintainability across the project.

## Coding Conventions

### File Naming
- Use **camelCase** for all file names.
  - Example: `userService.ts`, `launchManager.ts`

### Import Style
- Use **relative imports** for referencing modules within the project.
  - Example:
    ```typescript
    import { launchTask } from './launchTask'
    ```

### Export Style
- Use **named exports** for all modules.
  - Example:
    ```typescript
    // launchTask.ts
    export function launchTask() { /* ... */ }
    ```

### Commit Message Format
- Follow **Conventional Commits** with prefixes such as `build`.
  - Example:
    ```
    build: update dependencies to latest versions
    ```

## Workflows

### Building the Project
**Trigger:** When you need to compile or prepare the project for deployment or testing  
**Command:** `/build`

1. Ensure all dependencies are installed.
2. Run the TypeScript compiler (typically `tsc`).
3. Verify that build artifacts are generated as expected.

### Writing Code
**Trigger:** When adding new features or updating existing code  
**Command:** `/write-code`

1. Create new files using camelCase naming.
2. Use relative imports for internal modules.
3. Use named exports for all functions, classes, or constants.
4. Write clear, conventional commit messages when committing changes.

### Testing Code
**Trigger:** When verifying code correctness or adding new features  
**Command:** `/test`

1. Create test files matching the `*.test.*` pattern (e.g., `userService.test.ts`).
2. Write tests using the project's preferred (currently undetected) testing framework.
3. Run tests to ensure all pass before committing.

## Testing Patterns

- Test files are named using the `*.test.*` pattern, such as `launchManager.test.ts`.
- The specific testing framework is not detected; follow existing patterns in the repository.
- Example test file structure:
  ```typescript
  // launchManager.test.ts
  import { launchManager } from './launchManager'

  describe('launchManager', () => {
    it('should initialize correctly', () => {
      // test logic here
    })
  })
  ```

## Commands
| Command    | Purpose                                   |
|------------|-------------------------------------------|
| /build     | Build the TypeScript project              |
| /write-code| Start writing or updating code            |
| /test      | Run all tests in the codebase             |
```
