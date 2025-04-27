import { Client } from 'pg';
import dotenv from 'dotenv';
import { createDraftEstimate } from './zoho';
import { createQuote, getClient } from './db';

dotenv.config();

// Interface for event payload
interface EventPayload {
  type: string;
  clientId?: number;
  [key: string]: any;
}

// Setup PostgreSQL client with notifications
const pgClient = new Client({
  connectionString: process.env.DATABASE_URL
});

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

        // Check if this is a client_created event
        if (payload.type === 'client_created' && payload.clientId) {
          await handleClientCreated(payload.clientId);
        }
      } catch (error) {
        console.error('Error processing notification:', error);
      }
    });

    // Keep the process running
    console.log('Quote Wizard service is running...');
  } catch (error) {
    console.error('Error in Quote Wizard service:', error);
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
      console.error(`Client with ID ${clientId} not found`);
      return;
    }

    // Use the Zoho client ID if available, or a placeholder
    const zohoClientId = client.zohoClientId || 'placeholder_client_id';

    // Create draft estimate in Zoho
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
    throw error;
  }
}

// Handle termination signals
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down...');
  pgClient.end();
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down...');
  pgClient.end();
  process.exit(0);
});

// Start the service
main();