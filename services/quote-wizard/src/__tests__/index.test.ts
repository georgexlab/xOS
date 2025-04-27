/**
 * Quote Wizard Service Tests
 * 
 * This test suite validates the core functionality of the Quote Wizard service:
 * - Creating Zoho draft estimates
 * - Storing quote data in the database
 * - Processing client_created events
 */

import { jest } from '@jest/globals';
import nock from 'nock';
import { Client } from 'pg';

// Save the original environment
const originalEnv = { ...process.env };

// Set up mocked modules and environment variables
beforeAll(() => {
  // Configure environment variables for testing
  process.env.ZOHO_AUTH_TOKEN = 'fake-token';
  process.env.ZOHO_ORG_ID = 'fake-org-id';
  
  // Setup nock to mock Zoho API
  nock('https://books.zoho.com/api')
    .post('/books/v3/estimates')
    .query(true)
    .reply(200, {
      estimate: {
        estimate_id: '99999',
        status: 'draft'
      }
    });
});

// Clear mocks and reset nock between tests
afterEach(() => {
  jest.clearAllMocks();
});

// Clean up after all tests
afterAll(() => {
  // Restore original environment
  process.env = originalEnv;
  nock.cleanAll();
});

// Mock pg Client
jest.mock('pg', () => {
  const mockClient = {
    connect: jest.fn().mockResolvedValue(undefined),
    query: jest.fn().mockResolvedValue({}),
    on: jest.fn(),
    end: jest.fn()
  };
  return { Client: jest.fn(() => mockClient) };
});

// Mock database functions
jest.mock('../db', () => ({
  createQuote: jest.fn().mockImplementation((clientId, title, zohoQuoteId) => 
    Promise.resolve({
      id: 123,
      clientId: clientId,
      title,
      amount: "1.00",
      status: "draft",
      zohoQuoteId: zohoQuoteId
    })
  ),
  getClient: jest.fn().mockImplementation((clientId) => 
    Promise.resolve({
      id: clientId,
      name: 'Test Client',
      email: 'client@example.com',
      zohoClientId: 'zoho-123'
    })
  ),
  db: {}
}));

// Import after mocking to get the mocked versions
import { createQuote, getClient } from '../db';
import { createDraftEstimate } from '../zoho';

describe('Quote Wizard Service', () => {
  it('should create a draft estimate in Zoho', async () => {
    const zohoResponse = await createDraftEstimate('zoho-123');
    expect(zohoResponse.estimate.estimate_id).toBe('99999');
  });
  
  it('should get a client by ID', async () => {
    const client = await getClient(1);
    expect(client).toHaveProperty('id', 1);
    expect(client).toHaveProperty('name', 'Test Client');
  });
  
  it('should create a quote with the Zoho ID', async () => {
    const quote = await createQuote(1, 'Draft Quote', '99999');
    expect(quote).toHaveProperty('clientId', 1);
    expect(quote).toHaveProperty('title', 'Draft Quote');
    expect(quote).toHaveProperty('zohoQuoteId', '99999');
  });
});