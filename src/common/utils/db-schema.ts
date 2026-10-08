/**
 * MIGRATED (2026-10-08): the Faith tables live in a dedicated `faith` schema
 * on the habuild-dev RDS instance (database "utility"), not in `public`.
 *
 * node-postgres parses only host/user/db out of a connection string and
 * silently drops `?schema=`, so the schema name has to be handed to Prisma
 * itself via PrismaPg's `schema` option — that is what the query engine uses
 * to qualify every statement. Omit it and Prisma falls back to `public`,
 * where every query fails with "relation does not exist".
 *
 * Every PrismaPg instance needs this: the running app (PrismaService) and all
 * of the seed/maintenance scripts under prisma/ and scripts/, which build
 * their own pools. Returns undefined when the URL carries no `schema` param,
 * which keeps the old `public` behaviour for any environment still on Neon.
 */
export function prismaSchemaOptions(
  databaseUrl: string | undefined = process.env.DATABASE_URL,
): { schema: string } | undefined {
  if (!databaseUrl) return undefined;

  let schema: string | null = null;
  try {
    schema = new URL(databaseUrl).searchParams.get('schema');
  } catch {
    // Not a parseable URL (e.g. a libpq key=value DSN) — fall back to public.
    return undefined;
  }

  return schema ? { schema } : undefined;
}
