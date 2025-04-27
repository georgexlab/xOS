import axios, { AxiosInstance } from 'axios';
import dotenv from 'dotenv';
import { db } from './db';
import { events } from '../../../shared/schema';

dotenv.config();

// Ensure required environment variables are set
const ZOHO_AUTH_TOKEN = process.env.ZOHO_AUTH_TOKEN;
const ZOHO_ORG_ID = process.env.ZOHO_ORG_ID;
const ZOHO_API_URL = process.env.ZOHO_API_URL || 'https://books.zoho.com/api';

if (!ZOHO_AUTH_TOKEN) {
  console.warn('ZOHO_AUTH_TOKEN is not set. Zoho API calls will fail.');
}

if (!ZOHO_ORG_ID) {
  console.warn('ZOHO_ORG_ID is not set. Zoho API calls will fail.');
}

// Token cache management
interface TokenCache {
  token: string;
  expiresAt: number;
}

let tokenCache: TokenCache | null = null;

// Initialize cache if token is available
if (ZOHO_AUTH_TOKEN) {
  tokenCache = {
    token: ZOHO_AUTH_TOKEN,
    // Cache for 55 minutes (in milliseconds)
    expiresAt: Date.now() + 55 * 60 * 1000
  };
}

/**
 * Gets the current token, using the cached one if valid
 * @returns The current valid token
 */
function getToken(): string {
  // If we have a cached token and it's still valid, use it
  if (tokenCache && tokenCache.expiresAt > Date.now()) {
    return tokenCache.token;
  }
  
  // If token is available from env, refresh the cache
  if (ZOHO_AUTH_TOKEN) {
    tokenCache = {
      token: ZOHO_AUTH_TOKEN,
      expiresAt: Date.now() + 55 * 60 * 1000
    };
    return ZOHO_AUTH_TOKEN;
  }
  
  // No token available
  throw new Error('No valid Zoho authentication token available');
}

/**
 * Create a function to get a Zoho client with the latest token
 */
const getZohoClient = (): AxiosInstance => {
  try {
    const token = getToken();
    return axios.create({
      baseURL: ZOHO_API_URL,
      headers: {
        'Authorization': `Zoho-oauthtoken ${token}`,
        'Content-Type': 'application/json'
      }
    });
  } catch (error) {
    console.error('Error creating Zoho client:', error);
    // Create a client without auth that will fail properly
    return axios.create({
      baseURL: ZOHO_API_URL,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }
};

// Interface for the response from Zoho API
interface ZohoEstimateResponse {
  estimate: {
    estimate_id: string;
    [key: string]: any;
  };
  [key: string]: any;
}

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

/**
 * Creates a draft estimate in Zoho Books with retry logic
 * 
 * @param customerId The Zoho customer ID or a placeholder if not available
 * @returns The created estimate data from Zoho
 */
export async function createDraftEstimate(customerId: string): Promise<ZohoEstimateResponse> {
  // Construct the estimate payload
  const estimateData = {
    customer_id: customerId,
    line_items: [
      {
        name: "New project",
        rate: 1,
        quantity: 1
      }
    ],
    status: "draft"
  };

  // Implement retry logic (3 attempts with 2 second backoff)
  let lastError: unknown = null;
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      console.log(`Attempting to create draft estimate (attempt ${attempt}/3)`);
      
      // Get client with latest token and make the API call to create the estimate
      const client = getZohoClient();
      const response = await client.post(`/books/v3/estimates?organization_id=${ZOHO_ORG_ID}`, estimateData);
      
      console.log(`Successfully created draft estimate on attempt ${attempt}`);
      return response.data;
    } catch (error) {
      lastError = error;
      console.error(`Error creating draft estimate in Zoho (attempt ${attempt}/3):`, error);
      
      // If we've exhausted all retries, log the error and throw
      if (attempt === 3) {
        await logErrorToEvents(error, {
          operation: 'createDraftEstimate',
          customerId,
          attemptsMade: 3
        });
        break;
      }
      
      // Wait before the next retry (2 seconds)
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }

  // If we're here, all retry attempts failed
  let errorMessage = 'Unknown error';
  if (lastError instanceof Error) {
    errorMessage = lastError.message;
  } else if (typeof lastError === 'string') {
    errorMessage = lastError;
  }
  
  throw new Error(`Failed to create draft estimate after 3 attempts: ${errorMessage}`);
}