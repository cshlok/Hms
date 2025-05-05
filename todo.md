# HMS TypeScript Error Fix Todo List

This list outlines the plan to fix the TypeScript errors in the HMS project, prioritizing common patterns and high-impact issues.

- [x] **Phase 1: Configuration & High-Impact Module Errors**
    - [x] Verify `tsconfig.json` paths, includes, excludes, and strictness settings.
    - [x] Fix `TS2307: Cannot find module` errors (e.g., `env`, `nanoid`). Check paths and install missing types (`@types/nanoid` if needed). (Batch 1 & 2: Removed invalid `env` imports, installed nanoid package)
    - [x] Fix `TS2305: Module has no exported member` errors (e.g., `Session`, `SessionUser` in `@/lib/session`). (Batch 3: Replaced with IronSessionData/IronSession/User)
    - [ ] Fix `TS2304: Cannot find name` errors (e.g., `IronSessionData`, `Invoice`). Ensure types are defined and imported correctly. (Batch 4: Fixed `IronSessionData` imports)
    - [ ] Fix `TS2339: Property 'env' does not exist on type 'Promise<CloudflareContext...'` errors in API routes.

- [ ] **Phase 2: Common Type Mismatches & Unknowns**
    - [x] Fix `TS18046: '...' is of type 'unknown'` errors (e.g., `insertResult.meta`). Provide explicit types for DB results/metadata. (Batch 5, 6 & 7: Fixed in appointments, auth/register, billable-items, consultations, doctors, inventory-items)
    - [ ] Fix `TS2339: Property '...' does not exist on type '{}' or 'unknown[]'` errors. Type API responses, fetched data, and array elements correctly.
    - [ ] Fix `TS2741: Property '...' is missing` errors (e.g., `User` type). Ensure objects match their type definitions.
    - [ ] Fix `TS2345: Argument of type '...' is not assignable` errors (e.g., `CookieStore`). Correct type mismatches in function calls.

- [ ] **Phase 3: Specific Type & Library Usage Errors**
    - [ ] Fix `TS7006: Parameter '...' implicitly has an 'any' type`. Add explicit type annotations.
    - [ ] Fix `TS2769: No overload matches this call` errors (e.g., Zod enums). Ensure correct library usage.
    - [ ] Fix `TS2322: Type '...' is not assignable to type '...'` errors. Adjust types or logic, respecting strict null checks.

- [ ] **Phase 4: Cleanup & Final Validation**
    - [ ] Address remaining miscellaneous errors (e.g., `TS6133` unused vars, `TS2552` typos).
    - [ ] Run final `npx tsc --noEmit` and `npx eslint . --ext .ts,.tsx` checks to ensure zero errors/warnings.
    - [ ] Commit and push all final changes.
