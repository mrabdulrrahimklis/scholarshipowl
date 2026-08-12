---
description: Scaffold a new GraphQL capability the project's way (service → Zod → schema → test)
---
Add a new GraphQL capability described by the argument, following this repo's
conventions end to end. Keep domain logic pure and keep resolvers thin.

Follow these steps in order:

1. **Clarify** the shape if ambiguous: a query (read) or a mutation (write)? What
   inputs, what return type? Reuse existing GraphQL types where possible.

2. **Pure logic (only if there's real computation).** Put it in `backend/src/domain/`
   as a pure function (no DB/IO) and add a Vitest unit test in `backend/tests/`.

3. **Service.** Add/extend a function in the matching `backend/src/services/*.ts`
   (`programs.ts`, `profiles.ts`, or `checklist.ts`). Throw `ApiError.notFound/badRequest/…`
   for expected errors. This is the single source the resolver calls.

4. **Validation.** Add a Zod schema in `backend/src/validation/schemas.ts` for the
   inputs. Reuse enums and existing schemas where possible.

5. **GraphQL schema.** In `backend/src/graphql/schema.ts`: extend the SDL
   (`Query`/`Mutation` + any object/input types) and add a resolver that parses inputs
   with the Zod schema and calls the service inside `guard(() => ...)`. Do NOT put
   business logic in the resolver.

6. **Tests.** Extend `backend/tests/graphql.test.ts` with a happy-path assertion and one
   validation/404 case for the new field.

7. **Docs.** Add the new query/mutation to the README API section.

8. **Verify.** Run `cd backend && npm run typecheck && npm test && npm run lint` and fix
   anything. If you edited `prisma/schema.prisma`, also run `npm run db:push`.

Report the files you touched and the new GraphQL field name.
