import { Client } from 'pg';
import dotenv from 'dotenv';
import { createDraftEstimate } from './zoho';
import { createQuote, getClient } from './db';
import { db } from './db';
import { events } from '../../../shared/schema';
import { startAgentActionProcessor } from './agent-handler';

dotenv.config();

// Interface for event payload
interface EventPayload {
  type: string;
  clientId?: number;
  [key: string]: unknown;
}

// Setup PostgreSQL client with notifications
const pgClient = new Client({
  connectionString: process.env.DATABASE_URL
});

// Track the agent action processor interval
let agentActionProcessor: NodeJS.Timeout | null = null;

/**
 * Log error to the events table
 * @param error The error object or message
 * @param context Additional context information
 */
async function logErrorToEvents(error: unknown, context: Record<string, unknown>): Promise<void> {
  try {
    let errorMessage = 'Unknown error';
    
    if (error instanceof Error) {
      errorMessage = error.message;
    } else if (typeof error === 'string') {
      errorMessage = error;
    } else if (error && typeof error === 'object') {
      errorMessage = JSON.stringify(error);
    }
    
    await db.insert(events).values({
      type: 'quote_error',
      payload: {
        error: errorMessage,
        timestamp: new Date().toISOString(),
        ...context
      }
    });
  } catch (dbError) {
    console.error('Failed to log error to events table:', dbError);
  }
}

async function main() {
  try {
    // Connect to the database
    await pgClient.connect();
    console.log('Connected to PostgreSQL database');

    // Listen for notifications on the new_event channel
    await pgClient.query('LISTEN new_event');
    console.log('Listening for new_event notifications');

    // Set up the notification handler
    pgClient.on('notification', async (msg) => {
      if (!msg.payload) {
        console.warn('Received empty notification payload');
        return;
      }

      try {
        // Parse the notification payload
        const payload = JSON.parse(msg.payload) as EventPayload;
        console.log('Received event:', payload);

        // Route events to appropriate handlers
        if (payload.type === 'client_created' && payload.clientId) {
          await handleClientCreated(payload.clientId);
        } else if (payload.type === 'agent_action_created') {
          // We'll let the agent action processor handle this
          console.log('Received agent_action_created event, will be processed by the action processor');
        }
      } catch (error) {
        console.error('Error processing notification:', error);
        await logErrorToEvents(error, {
          operation: 'notification_handler',
          payload: msg.payload
        });
      }
    });

    // Start the agent action processor (check every minute)
    agentActionProcessor = startAgentActionProcessor(60000);
    
    // Keep the process running
    console.log('Quote Wizard service is running...');
  } catch (error) {
    console.error('Error in Quote Wizard service:', error);
    await logErrorToEvents(error, {
      operation: 'service_startup'
    });
    process.exit(1);
  }
}

/**
 * Handle client_created event by creating a draft quote in Zoho
 * and storing it in the local database
 */
async function handleClientCreated(clientId: number) {
  try {
    console.log(`Processing client_created event for client ${clientId}`);

    // Get client details
    const client = await getClient(clientId);
    if (!client) {
      const errorMsg = `Client with ID ${clientId} not found`;
      console.error(errorMsg);
      await logErrorToEvents(errorMsg, {
        operation: 'handleClientCreated',
        clientId
      });
      return;
    }

    // Use the Zoho client ID if available, or a placeholder
    const zohoClientId = client.zohoClientId || 'placeholder_client_id';

    // Create draft estimate in Zoho (now with built-in retry logic)
    const estimateResponse = await createDraftEstimate(zohoClientId);
    const zohoQuoteId = estimateResponse.estimate.estimate_id;
    
    // Create quote in local database
    const quote = await createQuote(
      clientId,
      'Draft Quote', 
      zohoQuoteId
    );

    console.log(`Draft quote ${zohoQuoteId} created for client ${clientId}`);
    return quote;
  } catch (error) {
    console.error('Error handling client_created event:', error);
    await logErrorToEvents(error, {
      operation: 'handleClientCreated',
      clientId
    });
    // Don't rethrow since we've already handled and logged the error
    // This prevents crashing the notification handler
  }
}

// Handle termination signals
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down...');
  
  // Clear the agent action processor interval if it exists
  if (agentActionProcessor) {
    clearInterval(agentActionProcessor);
  }
  
  pgClient.end();
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down...');
  
  // Clear the agent action processor interval if it exists
  if (agentActionProcessor) {
    clearInterval(agentActionProcessor);
  }
  
  pgClient.end();
  process.exit(0);
});

// Start the service
main();