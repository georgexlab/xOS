#!/usr/bin/env ts-node
/**
 * Script to create initial agents and employees for testing the multi-agent system
 * 
 * Run with:
 * npx ts-node scripts/create-agents.ts
 */

import { workforce } from '../server/workforce';
import { employees, agents, actions } from '../shared/schema';

async function createInitialWorkforce() {
  try {
    console.log('Creating initial employees and agents...');
    
    // Create a test account manager employee
    const accountManager = await workforce.createEmployee({
      fullName: 'Alex Manager',
      email: 'alex@example.com',
      role: 'Account Manager',
      profilePhoto: 'https://ui-avatars.com/api/?name=Alex+Manager&background=0D8ABC&color=fff'
    });
    
    console.log('Created employee:', accountManager);
    
    // Create a test designer employee
    const designer = await workforce.createEmployee({
      fullName: 'Sam Designer',
      email: 'sam@example.com',
      role: 'Designer',
      profilePhoto: 'https://ui-avatars.com/api/?name=Sam+Designer&background=4CAF50&color=fff'
    });
    
    console.log('Created employee:', designer);
    
    // Create a quote-bot agent owned by the account manager
    const quoteBot = await workforce.createAgent({
      codeName: 'QUOTE-BOT',
      description: 'Creates and follows up on quotes',
      avatar: 'https://ui-avatars.com/api/?name=Quote+Bot&background=FF9800&color=fff',
      skills: ['quote_generation', 'follow_up_emails', 'price_calculation'],
      ownerEmpId: accountManager.id
    });
    
    console.log('Created agent:', quoteBot);
    
    // Create a pay-bot agent owned by the account manager
    const payBot = await workforce.createAgent({
      codeName: 'PAY-BOT',
      description: 'Handles payment reminders and reconciliation',
      avatar: 'https://ui-avatars.com/api/?name=Pay+Bot&background=F44336&color=fff',
      skills: ['payment_reminders', 'invoice_generation', 'payment_reconciliation'],
      ownerEmpId: accountManager.id
    });
    
    console.log('Created agent:', payBot);
    
    // Create a design-bot agent owned by the designer
    const designBot = await workforce.createAgent({
      codeName: 'DESIGN-BOT',
      description: 'Assists with design tasks and feedback',
      avatar: 'https://ui-avatars.com/api/?name=Design+Bot&background=9C27B0&color=fff',
      skills: ['design_feedback', 'asset_generation', 'design_iteration'],
      ownerEmpId: designer.id
    });
    
    console.log('Created agent:', designBot);
    
    // Create a sample action from QUOTE-BOT that needs approval
    const quoteAction = await workforce.createAction({
      type: 'quote_followup_email',
      payload: {
        clientId: 1,
        quoteId: 1,
        emailSubject: 'Following up on your recent quote',
        emailBody: 'Hello, I wanted to follow up on the quote we sent last week. Please let me know if you have any questions!'
      },
      createdBy: quoteBot.id,
      status: 'pending'
    });
    
    console.log('Created action:', quoteAction);
    
    // Create another sample action from PAY-BOT
    const paymentAction = await workforce.createAction({
      type: 'payment_reminder',
      payload: {
        clientId: 2,
        quoteId: 2,
        emailSubject: 'Payment reminder for quote #2',
        emailBody: 'This is a friendly reminder that payment for quote #2 is due next week.'
      },
      createdBy: payBot.id,
      status: 'pending'
    });
    
    console.log('Created action:', paymentAction);
    
    console.log('Workforce creation completed successfully!');
    
    // Example of approving an action
    console.log('Approving an action...');
    const approvedAction = await workforce.approveAction(quoteAction.id, accountManager.id);
    console.log('Action approved:', approvedAction);
    
    console.log('All done!');
  } catch (error) {
    console.error('Error creating workforce:', error);
  } finally {
    process.exit(0);
  }
}

// Run the script
createInitialWorkforce();