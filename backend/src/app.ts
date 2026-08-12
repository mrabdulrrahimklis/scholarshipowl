import cors from "cors";
import express from "express";
import { GraphQLError } from "graphql";
import { createYoga } from "graphql-yoga";
import { corsOrigins } from "./env.ts";
import { schema } from "./graphql/schema.ts";

/**
 * The app is GraphQL-only. Everything is served from a single GraphQL endpoint
 * at /graphql (with a GraphiQL playground and a GET /graphql/health liveness
 * probe provided by Yoga).
 */
export function createApp() {
  const app = express();

  app.use(cors({ origin: corsOrigins }));

  const yoga = createYoga({
    schema,
    graphqlEndpoint: "/graphql",
    // Pass through our intentional (coded) errors; mask only genuine bugs.
    maskedErrors: {
      maskError(error, message) {
        const code = (error as { extensions?: { code?: string } })?.extensions?.code;
        if (code) return error as Error;
        return new GraphQLError(message);
      },
    },
  });
  app.use(yoga.graphqlEndpoint, yoga);

  return app;
}
