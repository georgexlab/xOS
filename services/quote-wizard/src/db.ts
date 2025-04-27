import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import { eq } from 'drizzle-orm';
import * as schema from "../../../shared/schema";

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?"
  );
}

export const pool = new Pool({ connectionString: process.env.DATABASE_URL });
export const db = drizzle(pool, { schema });

// Function to insert a quote into the database
export async function createQuote(clientId: number, title: string, zohoQuoteId: string) {
  // Create an object that matches the insert type exactly
  const insertData = {
    // For serial columns, let the database generate the ID
    id: undefined as any, // Workaround for TypeScript checking
    clientId: clientId,
    title: title,
    amount: "1.00", // Default amount as required by schema
    status: "draft",
    zohoQuoteId: zohoQuoteId
  };

  const [quote] = await db
    .insert(schema.quotes)
    .values(insertData)
    .returning();
  
  return quote;
}

// Get client by ID
export async function getClient(clientId: number) {
  const [client] = await db
    .select()
    .from(schema.clients)
    .where(eq(schema.clients.id, clientId));
  
  return client;
}