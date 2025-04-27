#!/usr/bin/env ts-node
/**
 * Script to create a quote generation agent
 * 
 * Run with:
 * npx ts-node scripts/create-quote-agent.ts
 */

import { workforce } from '../server/workforce';
import { Pool } from 'pg';

async function createQuoteAgent() {
  try {
    console.log('Looking up test employee...');
    
    // Lookup our test employee by email
    const employee = await workforce.getEmployeeByEmail('test@example.com');
    
    if (!employee) {
      console.error('Test employee not found! Run create-test-employee.ts first.');
      return;
    }
    
    console.log('Found employee:', employee.fullName, 'with ID:', employee.id);
    
    // Create a quote bot agent owned by the employee
    console.log('Creating a quote generation agent...');
    const agent = await workforce.createAgent({
      codeName: 'QUOTE-BOT',
      description: 'Specializes in generating quotes and sending follow-ups',
      avatar: 'https://ui-avatars.com/api/?name=Quote+Bot&background=0D47A1&color=fff',
      skills: ['quote_generation', 'follow_up_emails', 'price_calculation'],
      ownerEmpId: employee.id
    });
    
    console.log('Created agent:', agent);
    console.log('Agent ID:', agent.id);
    
    // Create a test action from the agent that needs approval
    console.log('Creating a test quote generation action...');
    const action = await workforce.createAction({
      type: 'generate_quote',
      payload: {
        clientId: 1, // This should be a valid client ID in your database
        title: 'Website Development Project',
        description: 'Full website development with responsive design',
        amount: '5000.00'
      },
      createdBy: agent.id,
      status: 'pending'
    });
    
    console.log('Created action:', action);
    
    // Create a pool to query the database
    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    
    // Insert direct notification for the agent_action_created event
    await pool.query(`
      NOTIFY new_event, '{"type":"agent_action_created","agentId":"${agent.id}","actionId":"${action.id}"}';
    `);
    
    console.log('Sent agent_action_created notification');
    
    // Cleanup
    await pool.end();
    
    console.log('All done!');
  } catch (error) {
    console.error('Error creating quote agent:', error);
  } finally {
    process.exit(0);
  }
}

// Run the script
createQuoteAgent();