/**
 * Expected, mapped application errors. Thrown by services; the GraphQL layer
 * (see graphql/schema.ts `guard`) maps these onto GraphQLErrors with the same
 * code + HTTP status.
 */
export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public details?: unknown,
  ) {
    super(message);
    this.name = "ApiError";
  }

  static notFound(message = "Resource not found") {
    return new ApiError(404, "not_found", message);
  }

  static badRequest(message = "Bad request", details?: unknown) {
    return new ApiError(400, "bad_request", message, details);
  }

  static conflict(message = "Conflict") {
    return new ApiError(409, "conflict", message);
  }
}
