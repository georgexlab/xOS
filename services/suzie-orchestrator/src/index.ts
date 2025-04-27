import cron from 'node-cron';
import { db } from './db';
import { quotes, actions, agents } from '../../../shared/schema';
import { eq, and, lt, gte, sql } from 'drizzle-orm';
import { randomUUID } from 'crypto';

// Environment variables with defaults
const QUOTE_FOLLOW_DAYS = process.env.QUOTE_FOLLOW_DAYS ? parseInt(process.env.QUOTE_FOLLOW_DAYS) : 3;
const QUOTE_MAX_FOLLOWUPS = process.env.QUOTE_MAX_FOLLOWUPS ? parseInt(process.env.QUOTE_MAX_FOLLOWUPS) : 3;

/**
 * Find quotes that need follow-up
 * - Must be in 'sent' status
 * - Sent at least QUOTE_FOLLOW_DAYS ago
 * - Have not been followed up on yet (followupCount = 0)
 */
export async function findQuotesNeedingFollowup() {
  console.log(`Finding quotes that need follow-up (sent ${QUOTE_FOLLOW_DAYS}+ days ago with no follow-ups)...`);
  
  // Calculate the cutoff date for follow-up (quotes sent X days ago or more)
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - QUOTE_FOLLOW_DAYS);
  
  try {
    const quotesNeedingFollowup = await db
      .select()
      .from(quotes)
      .where(
        and(
          eq(quotes.status, 'sent'),
          lt(quotes.sentAt, cutoffDate),
          eq(quotes.followupCount, 0)
        )
      );
    
    console.log(`Found ${quotesNeedingFollowup.length} quotes needing first follow-up`);
    return quotesNeedingFollowup;
  } catch (error) {
    console.error('Error finding quotes needing follow-up:', error);
    return [];
  }
}

/**
 * Find quotes that need secondary follow-up
 * - Must be in 'sent' status
 * - Already had at least one follow-up
 * - Last follow-up was at least QUOTE_FOLLOW_DAYS ago
 * - Have not reached max follow-ups (QUOTE_MAX_FOLLOWUPS)
 */
export async function findQuotesNeedingSecondaryFollowup() {
  console.log(`Finding quotes that need secondary follow-up...`);
  
  // Calculate the cutoff date for secondary follow-up
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - QUOTE_FOLLOW_DAYS);
  
  try {
    const quotesNeedingFollowup = await db
      .select()
      .from(quotes)
      .where(
        and(
          eq(quotes.status, 'sent'),
          gte(quotes.followupCount, 1), 
          lt(quotes.followupCount, QUOTE_MAX_FOLLOWUPS),
          lt(quotes.updatedAt, cutoffDate)
        )
      );
    
    console.log(`Found ${quotesNeedingFollowup.length} quotes needing secondary follow-up`);
    return quotesNeedingFollowup;
  } catch (error) {
    console.error('Error finding quotes needing secondary follow-up:', error);
    return [];
  }
}

/**
 * Create a follow-up action for a specific quote
 */
export async function createFollowupAction(quoteId: number, isSecondary = false) {
  try {
    // Find the SUZIE agent
    const [suzieAgent] = await db
      .select()
      .from(agents)
      .where(eq(agents.codeName, 'SUZIE'));
    
    if (!suzieAgent) {
      console.error('SUZIE agent not found - cannot create follow-up actions');
      return null;
    }
    
    // Create the action
    const actionType = isSecondary ? 'send_quote_secondary_followup' : 'send_quote_followup';
    const [action] = await db
      .insert(actions)
      .values({
        id: randomUUID(),
        type: actionType,
        status: 'pending',
        createdBy: suzieAgent.id,
        payload: {
          quoteId: quoteId,
          isSecondary: isSecondary,
          message: isSecondary ? 
            'This is a secondary follow-up to remind the client about their quote.' :
            'This is an initial follow-up to check if the client has any questions about their quote.'
        }
      })
      .returning();
    
    // Increment the followup count for the quote
    await db
      .update(quotes)
      .set({ 
        followupCount: sql`${quotes.followupCount} + 1`,
        updatedAt: new Date()
      })
      .where(eq(quotes.id, quoteId));
    
    console.log(`Created ${isSecondary ? 'secondary' : 'initial'} follow-up action ${action.id} for quote ${quoteId}`);
    return action;
  } catch (error) {
    console.error(`Error creating follow-up action for quote ${quoteId}:`, error);
    return null;
  }
}

/**
 * Run the daily quote follow-up check
 */
export async function runQuoteFollowupCheck() {
  console.log('Running quote follow-up check...');
  
  try {
    // Find quotes needing initial follow-up
    const quotesNeedingFollowup = await findQuotesNeedingFollowup();
    
    // Create follow-up actions for each quote
    for (const quote of quotesNeedingFollowup) {
      await createFollowupAction(quote.id);
    }
    
    // Find quotes needing secondary follow-up
    const quotesNeedingSecondaryFollowup = await findQuotesNeedingSecondaryFollowup();
    
    // Create secondary follow-up actions for each quote
    for (const quote of quotesNeedingSecondaryFollowup) {
      await createFollowupAction(quote.id, true);
    }
    
    console.log('Quote follow-up check completed successfully');
  } catch (error) {
    console.error('Error in quote follow-up check:', error);
  }
}

/**
 * Initialize the cron job to run daily at 06:00 UTC
 */
function initializeFollowupCron() {
  console.log('Initializing SUZIE follow-up scheduler');
  
  // Run daily at 06:00 UTC
  cron.schedule('0 6 * * *', () => {
    console.log('Running scheduled quote follow-up check...');
    runQuoteFollowupCheck();
  });
  
  console.log('SUZIE follow-up scheduler initialized');
}

// Run the service
async function main() {
  console.log('Starting SUZIE Orchestrator service...');
  console.log(`Quote follow-up days: ${QUOTE_FOLLOW_DAYS}`);
  console.log(`Max follow-ups per quote: ${QUOTE_MAX_FOLLOWUPS}`);
  
  // Initialize the cron job
  initializeFollowupCron();
  
  // Run an initial check at startup
  await runQuoteFollowupCheck();
  
  console.log('SUZIE Orchestrator service is running');
}

// Start the service
main().catch(error => {
  console.error('Error starting SUZIE Orchestrator service:', error);
});