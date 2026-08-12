---
description: Show the interactive API explorer (GraphiQL) for the backend
---
Point the user at the API (start it first if it isn't running — see /dev):

- GraphQL playground (GraphiQL): http://localhost:4000/graphql — browse the schema and run queries/mutations in the browser.

The app is **GraphQL-only** (no REST, no Swagger). Schema + resolvers live in
`backend/src/graphql/schema.ts`; they parse inputs with the Zod schemas in
`backend/src/validation/schemas.ts` and delegate to `backend/src/services/*`.
