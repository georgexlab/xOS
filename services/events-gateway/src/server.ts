import Fastify, { FastifyInstance } from 'fastify';
import { db, pool } from './db';
import { events, users, quotes, clients, payments } from '../../../shared/schema';
import { eq } from 'drizzle-orm';

// Create Fastify server
export const server: FastifyInstance = Fastify({
  logger: true,
});

// Register body parser
server.addContentTypeParser('application/json', { parseAs: 'string' }, (req, body, done) => {
  try {
    const json = JSON.parse(body as string);
    done(null, json);
  } catch (err) {
    done(err as Error, undefined);
  }
});

// Root endpoint - API documentation
server.get('/', async () => {
  return {
    api: 'xOS Events Gateway API',
    version: '1.0.0',
    endpoints: [
      { path: '/', method: 'GET', description: 'API information' },
      { path: '/health', method: 'GET', description: 'Health check' },
      { path: '/events', method: 'GET', description: 'List all events' },
      { path: '/events', method: 'POST', description: 'Create a new event' },
      { path: '/users', method: 'GET', description: 'List all users' },
      { path: '/quotes', method: 'GET', description: 'List all quotes' },
      { path: '/quotes', method: 'POST', description: 'Create a new quote' },
      { path: '/clients', method: 'GET', description: 'List all clients' },
      { path: '/clients', method: 'POST', description: 'Create a new client' },
      { path: '/payments', method: 'GET', description: 'List all payments' },
      { path: '/payments', method: 'POST', description: 'Create a new payment' },
    ]
  };
});

// Register health check route
server.get('/health', async () => {
  try {
    // Test database connection
    const result = await pool.query('SELECT 1');
    return { status: 'ok', db: 'connected' };
  } catch (error) {
    server.log.error(error);
    return { status: 'error', message: 'Database connection failed' };
  }
});

// Register events endpoints
server.get('/events', async () => {
  try {
    const allEvents = await db.select().from(events);
    return { events: allEvents };
  } catch (error) {
    server.log.error(error);
    return { status: 'error', message: 'Failed to fetch events' };
  }
});

server.post('/events', async (request, reply) => {
  try {
    const { type, payload } = request.body as { type: string; payload: any };
    
    if (!type || !payload) {
      reply.code(400);
      return { error: 'Type and payload are required' };
    }
    
    const [newEvent] = await db.insert(events)
      .values({
        type,
        payload: payload,
      })
      .returning();
    
    reply.code(201);
    return { event: newEvent };
  } catch (error) {
    server.log.error(error);
    reply.code(500);
    return { status: 'error', message: 'Failed to create event' };
  }
});

// Register users endpoints
server.get('/users', async () => {
  try {
    const allUsers = await db.select().from(users);
    return { users: allUsers };
  } catch (error) {
    server.log.error(error);
    return { status: 'error', message: 'Failed to fetch users' };
  }
});

// Register quotes endpoints
server.get('/quotes', async () => {
  try {
    const allQuotes = await db.select().from(quotes);
    return { quotes: allQuotes };
  } catch (error) {
    server.log.error(error);
    return { status: 'error', message: 'Failed to fetch quotes' };
  }
});

server.post('/quotes', async (request, reply) => {
  try {
    const { clientId, title, description, amount, status, zohoQuoteId } = request.body as { 
      clientId: number; 
      title: string; 
      description?: string; 
      amount: string;
      status?: string;
      zohoQuoteId?: string;
    };
    
    if (!clientId || !title || !amount) {
      reply.code(400);
      return { error: 'Client ID, title and amount are required' };
    }
    
    // Check if client exists
    const client = await db.select().from(clients).where(eq(clients.id, clientId)).limit(1);
    if (client.length === 0) {
      reply.code(404);
      return { error: 'Client not found' };
    }
    
    const [newQuote] = await db.insert(quotes)
      .values({
        clientId,
        title,
        description,
        amount,
        status: status || 'draft',
        zohoQuoteId,
      })
      .returning();
    
    // Create an event for quote creation
    await db.insert(events)
      .values({
        type: 'quote_created',
        payload: {
          quote: newQuote,
          client: client[0]
        },
      });
    
    reply.code(201);
    return { quote: newQuote };
  } catch (error) {
    server.log.error(error);
    reply.code(500);
    return { status: 'error', message: 'Failed to create quote' };
  }
});

// Register payments endpoints
server.get('/payments', async () => {
  try {
    const allPayments = await db.select().from(payments);
    return { payments: allPayments };
  } catch (error) {
    server.log.error(error);
    return { status: 'error', message: 'Failed to fetch payments' };
  }
});

server.post('/payments', async (request, reply) => {
  try {
    const { quoteId, amount, status, transactionId } = request.body as { 
      quoteId: number; 
      amount: string; 
      status?: string; 
      transactionId?: string;
    };
    
    if (!quoteId || !amount) {
      reply.code(400);
      return { error: 'Quote ID and amount are required' };
    }
    
    // Check if quote exists
    const quote = await db.select().from(quotes).where(eq(quotes.id, quoteId)).limit(1);
    if (quote.length === 0) {
      reply.code(404);
      return { error: 'Quote not found' };
    }
    
    const [newPayment] = await db.insert(payments)
      .values({
        quoteId,
        amount,
        status: status || 'pending',
        transactionId,
      })
      .returning();
    
    // Create an event for payment creation
    await db.insert(events)
      .values({
        type: 'payment_created',
        payload: {
          payment: newPayment,
          quote: quote[0]
        },
      });
    
    reply.code(201);
    return { payment: newPayment };
  } catch (error) {
    server.log.error(error);
    reply.code(500);
    return { status: 'error', message: 'Failed to create payment' };
  }
});

// Register clients endpoints
server.get('/clients', async () => {
  try {
    const allClients = await db.select().from(clients);
    return { clients: allClients };
  } catch (error) {
    server.log.error(error);
    return { status: 'error', message: 'Failed to fetch clients' };
  }
});

server.post('/clients', async (request, reply) => {
  try {
    const { name, email, phone, zohoClientId } = request.body as { 
      name: string; 
      email: string; 
      phone?: string; 
      zohoClientId?: string;
    };
    
    if (!name || !email) {
      reply.code(400);
      return { error: 'Name and email are required' };
    }
    
    const [newClient] = await db.insert(clients)
      .values({
        name,
        email,
        phone,
        zohoClientId,
      })
      .returning();
    
    // Also create an event for this client creation
    await db.insert(events)
      .values({
        type: 'client_created',
        payload: newClient,
      });
    
    reply.code(201);
    return { client: newClient };
  } catch (error) {
    server.log.error(error);
    reply.code(500);
    return { status: 'error', message: 'Failed to create client' };
  }
});

// Graceful shutdown
process.on('SIGINT', async () => {
  await server.close();
  await pool.end();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await server.close();
  await pool.end();
  process.exit(0);
});
