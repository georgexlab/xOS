import { startServer } from './server';
import { ZohoClient } from './zoho-client';
import { EventsClient } from './events-client';

// Create clients
const zohoClient = new ZohoClient();
const eventsClient = new EventsClient();

// Start the server
startServer(zohoClient, eventsClient);