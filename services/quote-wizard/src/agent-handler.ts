/**
 * Agent Handler for Quote Wizard
 * 
 * This module integrates with the Multi-Agent system to allow agents to create
 * and process quotes via the actions queue.
 */

import { db } from './db';
import { getClient, createQuote } from './db';
import { EventsClient } from './events-client';
import { createDraftEstimate } from './zoho';
import { actions } from '../../../shared/schema';
import { eq, and } from 'drizzle-orm';

// Client for communicating with the Events Gateway
const eventsClient = new EventsClient();

// Create a simple workforce-like interface for the agent-handler
// Since we can't directly import from the server directory into a service
class LocalWorkforceManager {
  async getPendingActionsByAgent(agentId: string): Promise<any[]> {
    return await db
      .select()
      .from(actions)
      .where(
        and(
          eq(actions.createdBy, agentId),
          eq(actions.status, 'pending')
        )
      );
  }

  async completeAction(actionId: string): Promise<any> {
    const [action] = await db
      .update(actions)
      .set({
        status: 'completed',
      })
      .where(eq(actions.id, actionId))
      .returning();
    return action;
  }

  async failAction(actionId: string): Promise<any> {
    const [action] = await db
      .update(actions)
      .set({
        status: 'failed',
      })
      .where(eq(actions.id, actionId))
      .returning();
    return action;
  }
}

const workforce = new LocalWorkforceManager();

/**
 * Log error to the events table
 * @param error The error object or message
 * @param context Additional context information
 */
async function logErrorToEvents(error: unknown, context: Record<string, unknown>): Promise<void> {
  try {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : undefined;

    await eventsClient.createEvent({
      type: 'agent_error',
      payload: {
        service: 'quote-wizard',
        error: errorMessage,
        stack: errorStack,
        context
      }
    });
  } catch (logError) {
    console.error('Failed to log error to events:', logError);
  }
}

/**
 * Process actions submitted by agents
 * 
 * This function polls for pending actions created by agents and
 * processes them based on the action type.
 */
export async function processAgentActions(): Promise<void> {
  try {
    console.log('Processing agent actions...');
    
    // Use direct SQL via client to get agents with either quote_generation or follow_up_emails skills
    // Since the Drizzle db instance doesn't have a query method
    const client = db.$client;
    const agentQuery = `
      SELECT * FROM agents 
      WHERE skills @> '["quote_generation"]'::jsonb
         OR skills @> '["follow_up_emails"]'::jsonb
    `;
    
    const { rows: activeAgents } = await client.query(agentQuery);
    
    if (activeAgents.length === 0) {
      console.log('No active agents found for quote generation or follow-up');
      return;
    }
    
    console.log(`Found ${activeAgents.length} active agents`);
    
    // Process actions for each agent
    for (const agent of activeAgents) {
      const pendingActions = await workforce.getPendingActionsByAgent(agent.id);
      
      console.log(`Processing ${pendingActions.length} pending actions for ${agent.code_name}`);
      
      for (const action of pendingActions) {
        console.log(`Processing action ${action.id} of type ${action.type}`);
        
        if (action.type === 'generate_quote') {
          await handleGenerateQuoteAction(action);
        } else if (action.type === 'send_quote_followup' || action.type === 'send_quote_secondary_followup') {
          await handleSendQuoteFollowupAction(action);
        } else {
          console.log(`Unknown action type: ${action.type}, skipping`);
        }
      }
    }
    
    console.log('Finished processing agent actions');
  } catch (error) {
    try {
      await logErrorToEvents(error, { operation: 'processAgentActions' });
    } catch (logError) {
      console.error('Failed to log error to events:', logError);
    }
    console.error('Error processing agent actions:', error);
  }
}

/**
 * Handle action to generate a quote
 * @param action The action object
 */
async function handleGenerateQuoteAction(action: any): Promise<void> {
  try {
    console.log(`Handling generate_quote action ${action.id}`);
    
    const { clientId, title, description, amount } = action.payload;
    
    if (!clientId || !title || !amount) {
      console.error('Missing required fields in generate_quote payload');
      await workforce.failAction(action.id);
      return;
    }
    
    // Get client info using the imported function
    const client = await getClient(clientId);
    
    if (!client) {
      console.error(`Client with ID ${clientId} not found`);
      await workforce.failAction(action.id);
      return;
    }
    
    console.log(`Creating draft estimate for client ${client.name}`);
    
    // Create a draft estimate in Zoho
    const estimate = await createDraftEstimate(client.zohoClientId || 'DEFAULT');
    
    if (!estimate || !estimate.estimate || !estimate.estimate.estimate_id) {
      console.error('Failed to create Zoho estimate');
      await workforce.failAction(action.id);
      return;
    }
    
    const zohoQuoteId = estimate.estimate.estimate_id;
    
    // Create a quote in our database using the imported function
    const quote = await createQuote(clientId, title, zohoQuoteId);
    
    console.log(`Created quote with ID ${quote.id} and Zoho ID ${zohoQuoteId}`);
    
    // Mark the action as completed
    await workforce.completeAction(action.id);
    
    // Create an event for the quote creation
    try {
      await eventsClient.createEvent({
        type: 'quote_created',
        payload: {
          quoteId: quote.id,
          clientId,
          zohoQuoteId,
          agentGenerated: true,
          agentId: action.createdBy
        }
      });
    } catch (eventError) {
      console.warn('Failed to create quote_created event:', eventError);
      // Continue even if the event creation fails
    }
    
  } catch (error) {
    try {
      await logErrorToEvents(error, { 
        operation: 'handleGenerateQuoteAction',
        actionId: action.id
      });
    } catch (logError) {
      console.error('Failed to log error to events:', logError);
    }
    console.error('Error handling generate_quote action:', error);
    await workforce.failAction(action.id);
  }
}

/**
 * Handle action to send a quote followup
 * @param action The action object
 */
async function handleSendQuoteFollowupAction(action: any): Promise<void> {
  try {
    console.log(`Handling ${action.type} action ${action.id}`);
    
    const { quoteId, message } = action.payload;
    const isSecondary = action.type === 'send_quote_secondary_followup';
    
    if (!quoteId) {
      console.error('Missing required quoteId in followup payload');
      await workforce.failAction(action.id);
      return;
    }
    
    // Generate email content if not provided
    const emailContent = message || (isSecondary
      ? 'This is a secondary follow-up to remind you about the quote we sent previously.'
      : 'This is a follow-up regarding the quote we sent. Please let us know if you have any questions.');
    
    // This would integrate with an email service in a real implementation
    console.log(`Would send ${isSecondary ? 'secondary ' : ''}followup email for quote ${quoteId}`);
    console.log(`Email content: ${emailContent}`);
    
    // Mark the action as completed
    await workforce.completeAction(action.id);
    
    // Create an event for the followup
    try {
      await eventsClient.createEvent({
        type: isSecondary ? 'quote_secondary_followup_sent' : 'quote_followup_sent',
        payload: {
          quoteId,
          agentId: action.createdBy,
          isSecondary,
          timestamp: new Date().toISOString()
        }
      });
    } catch (eventError) {
      console.warn(`Failed to create ${isSecondary ? 'quote_secondary_followup_sent' : 'quote_followup_sent'} event:`, eventError);
      // Continue even if the event creation fails
    }
    
  } catch (error) {
    try {
      await logErrorToEvents(error, { 
        operation: 'handleSendQuoteFollowupAction',
        actionId: action.id
      });
    } catch (logError) {
      console.error('Failed to log error to events:', logError);
    }
    console.error('Error handling send_quote_followup action:', error);
    await workforce.failAction(action.id);
  }
}

/**
 * Set up a recurring process to check for agent actions
 * @param intervalMs The interval in milliseconds between checks
 */
export function startAgentActionProcessor(intervalMs = 60000): NodeJS.Timeout {
  console.log(`Starting agent action processor with interval of ${intervalMs}ms`);
  
  // Process immediately on startup
  processAgentActions().catch(error => {
    console.error('Error in initial agent action processing:', error);
  });
  
  // Then set up recurring process
  return setInterval(() => {
    processAgentActions().catch(error => {
      console.error('Error in scheduled agent action processing:', error);
    });
  }, intervalMs);
}