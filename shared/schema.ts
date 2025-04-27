import { pgTable, integer, text, timestamp, jsonb, uuid } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// User model
export const users = pgTable('users', {
  id: integer('id').primaryKey().notNull(),
  username: text('username').notNull().unique(),
  email: text('email').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Define User type from the schema
export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// Event model for the event-driven architecture
export const events = pgTable('events', {
  id: uuid('id').primaryKey().defaultRandom(),
  type: text('type').notNull(),
  payload: jsonb('payload').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Define Event type from the schema
export type Event = typeof events.$inferSelect;
export type InsertEvent = typeof events.$inferInsert;

// Quote model for the quote-wizard service
export const quotes = pgTable('quotes', {
  id: integer('id').primaryKey().notNull(),
  clientId: integer('client_id').notNull(),
  title: text('title').notNull(),
  description: text('description'),
  amount: text('amount').notNull(),
  status: text('status').notNull().default('draft'),
  zohoQuoteId: text('zoho_quote_id'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Define Quote type from the schema
export type Quote = typeof quotes.$inferSelect;
export type InsertQuote = typeof quotes.$inferInsert;

// Client model
export const clients = pgTable('clients', {
  id: integer('id').primaryKey().notNull(),
  name: text('name').notNull(),
  email: text('email').notNull(),
  phone: text('phone'),
  zohoClientId: text('zoho_client_id'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Define Client type from the schema
export type Client = typeof clients.$inferSelect;
export type InsertClient = typeof clients.$inferInsert;

// Payment model for the payment-reconcile service
export const payments = pgTable('payments', {
  id: integer('id').primaryKey().notNull(),
  quoteId: integer('quote_id').notNull(),
  amount: text('amount').notNull(),
  status: text('status').notNull().default('pending'),
  transactionId: text('transaction_id'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Define Payment type from the schema
export type Payment = typeof payments.$inferSelect;
export type InsertPayment = typeof payments.$inferInsert;

// Define relations
export const quotesRelations = relations(quotes, ({ one }) => ({
  client: one(clients, {
    fields: [quotes.clientId],
    references: [clients.id],
  }),
}));

export const clientsRelations = relations(clients, ({ many }) => ({
  quotes: many(quotes),
}));

export const paymentsRelations = relations(payments, ({ one }) => ({
  quote: one(quotes, {
    fields: [payments.quoteId],
    references: [quotes.id],
  }),
}));