import axios from 'axios';
import dotenv from 'dotenv';

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

// Create a function to get a Zoho client with the latest token
const getZohoClient = () => {
  return axios.create({
    baseURL: ZOHO_API_URL,
    headers: {
      'Authorization': `Zoho-oauthtoken ${process.env.ZOHO_AUTH_TOKEN}`,
      'Content-Type': 'application/json'
    }
  });
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
 * Creates a draft estimate in Zoho Books
 * 
 * @param customerId The Zoho customer ID or a placeholder if not available
 * @returns The created estimate data from Zoho
 */
export async function createDraftEstimate(customerId: string): Promise<ZohoEstimateResponse> {
  try {
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

    // Get client with latest token and make the API call to create the estimate
    const client = getZohoClient();
    const response = await client.post(`/books/v3/estimates?organization_id=${ZOHO_ORG_ID}`, estimateData);
    
    return response.data;
  } catch (error) {
    console.error('Error creating draft estimate in Zoho:', error);
    throw error;
  }
}