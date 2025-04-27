import Fastify, { FastifyInstance } from 'fastify';
import { db, pool } from './db';
import { events, users, quotes, clients, payments, actions } from '../../../shared/schema';
import { eq, and, sql } from 'drizzle-orm';

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
      { path: '/api/events', method: 'GET', description: 'List all events' },
      { path: '/api/events', method: 'POST', description: 'Create a new event' },
      { path: '/api/users', method: 'GET', description: 'List all users' },
      { path: '/api/quotes', method: 'GET', description: 'List all quotes' },
      { path: '/api/quotes', method: 'POST', description: 'Create a new quote' },
      { path: '/api/clients', method: 'GET', description: 'List all clients' },
      { path: '/api/clients', method: 'POST', description: 'Create a new client' },
      { path: '/api/payments', method: 'GET', description: 'List all payments' },
      { path: '/api/payments', method: 'POST', description: 'Create a new payment' },
      { path: '/api/actions', method: 'GET', description: 'List actions with optional status filter' },
      { path: '/api/actions/:id/approve', method: 'POST', description: 'Approve an action' },
      { path: '/api/actions/:id/reject', method: 'POST', description: 'Reject an action' },
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
server.get('/api/events', async () => {
  try {
    const allEvents = await db.select().from(events);
    return { events: allEvents };
  } catch (error) {
    server.log.error(error);
    return { status: 'error', message: 'Failed to fetch events' };
  }
});

server.post('/api/events', async (request, reply) => {
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
server.get('/api/users', async () => {
  try {
    const allUsers = await db.select().from(users);
    return { users: allUsers };
  } catch (error) {
    server.log.error(error);
    return { status: 'error', message: 'Failed to fetch users' };
  }
});

// Register quotes endpoints
server.get('/api/quotes', async () => {
  try {
    const allQuotes = await db.select().from(quotes);
    return { quotes: allQuotes };
  } catch (error) {
    server.log.error(error);
    return { status: 'error', message: 'Failed to fetch quotes' };
  }
});

server.post('/api/quotes', async (request, reply) => {
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
    
    // For our test purposes, generate a random ID for the quote
    // In production, this would use a sequence
    const [newQuote] = await db.insert(quotes)
      .values({
        id: Math.floor(Math.random() * 10000) + 1, // Random ID for testing
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
server.get('/api/payments', async () => {
  try {
    const allPayments = await db.select().from(payments);
    return { payments: allPayments };
  } catch (error) {
    server.log.error(error);
    return { status: 'error', message: 'Failed to fetch payments' };
  }
});

server.post('/api/payments', async (request, reply) => {
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
    
    // For our test purposes, generate a random ID for the payment
    // In production, this would use a sequence
    const [newPayment] = await db.insert(payments)
      .values({
        id: Math.floor(Math.random() * 10000) + 1, // Random ID for testing
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

// Register actions endpoints
server.get('/api/actions', async (request, reply) => {
  try {
    const { status } = request.query as { status?: string };
    
    // Build query based on filter conditions
    if (status) {
      const actionsList = await db.select().from(actions).where(eq(actions.status, status));
      return { actions: actionsList };
    } else {
      const actionsList = await db.select().from(actions);
      return { actions: actionsList };
    }
  } catch (error) {
    server.log.error(error);
    reply.code(500);
    return { status: 'error', message: 'Failed to fetch actions' };
  }
});

// Register clients endpoints
server.get('/api/clients', async () => {
  try {
    const allClients = await db.select().from(clients);
    return { clients: allClients };
  } catch (error) {
    server.log.error(error);
    return { status: 'error', message: 'Failed to fetch clients' };
  }
});

server.post('/api/clients', async (request, reply) => {
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
    
    // For our test purposes, generate a random ID for the client
    // In production, this would use a sequence
    const [newClient] = await db.insert(clients)
      .values({
        id: Math.floor(Math.random() * 10000) + 1, // Random ID for testing
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

// Action approval endpoint
server.post('/api/actions/:id/approve', async (request, reply) => {
  try {
    const { id } = request.params as { id: string };
    const { employeeId } = request.body as { employeeId: string };
    
    if (!id || !employeeId) {
      reply.code(400);
      return { error: 'Action ID and employee ID are required' };
    }
    
    // Check if action exists and is pending
    const action = await db.select().from(actions).where(eq(actions.id, id)).limit(1);
    
    if (action.length === 0) {
      reply.code(404);
      return { error: 'Action not found' };
    }
    
    if (action[0].status !== 'pending') {
      reply.code(400);
      return { error: 'Only pending actions can be approved' };
    }
    
    // Update the action
    const [updatedAction] = await db.update(actions)
      .set({
        status: 'approved',
        approvedBy: employeeId,
        approvedAt: new Date(),
      })
      .where(eq(actions.id, id))
      .returning();
    
    // Notify subscribers about action approval
    try {
      await pool.query(`NOTIFY action_approved, '${id}'`);
    } catch (notifyError) {
      server.log.error('Error sending notification:', notifyError);
      // Continue even if notification fails
    }
    
    return { action: updatedAction };
  } catch (error) {
    server.log.error(error);
    reply.code(500);
    return { status: 'error', message: 'Failed to approve action' };
  }
});

// Action rejection endpoint
server.post('/api/actions/:id/reject', async (request, reply) => {
  try {
    const { id } = request.params as { id: string };
    const { employeeId, reason } = request.body as { employeeId: string; reason?: string };
    
    if (!id || !employeeId) {
      reply.code(400);
      return { error: 'Action ID and employee ID are required' };
    }
    
    // Check if action exists and is pending
    const action = await db.select().from(actions).where(eq(actions.id, id)).limit(1);
    
    if (action.length === 0) {
      reply.code(404);
      return { error: 'Action not found' };
    }
    
    if (action[0].status !== 'pending') {
      reply.code(400);
      return { error: 'Only pending actions can be rejected' };
    }
    
    // Update the action
    // Create new payload object
    const updatedPayload = action[0].payload ? 
      { ...action[0].payload, rejectionReason: reason || 'No reason provided' } : 
      { rejectionReason: reason || 'No reason provided' };
      
    const [updatedAction] = await db.update(actions)
      .set({
        status: 'rejected',
        approvedBy: employeeId,
        approvedAt: new Date(),
        // Store the rejection reason in the payload
        payload: updatedPayload
      })
      .where(eq(actions.id, id))
      .returning();
    
    // Notify subscribers about action rejection
    try {
      await pool.query(`NOTIFY action_rejected, '${id}'`);
    } catch (notifyError) {
      server.log.error('Error sending notification:', notifyError);
      // Continue even if notification fails
    }
    
    return { action: updatedAction };
  } catch (error) {
    server.log.error(error);
    reply.code(500);
    return { status: 'error', message: 'Failed to reject action' };
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
