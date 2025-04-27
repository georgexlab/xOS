#!/usr/bin/env ts-node
/**
 * Simple script to create a test agent associated with our test employee
 * 
 * Run with:
 * npx ts-node scripts/create-test-agent.ts
 */

import { workforce } from '../server/workforce';

async function createTestAgent() {
  try {
    console.log('Looking up test employee...');
    
    // Lookup our test employee by email
    const employee = await workforce.getEmployeeByEmail('test@example.com');
    
    if (!employee) {
      console.error('Test employee not found! Run create-test-employee.ts first.');
      return;
    }
    
    console.log('Found employee:', employee.fullName, 'with ID:', employee.id);
    
    // Create a test agent owned by the employee
    console.log('Creating a test agent...');
    const agent = await workforce.createAgent({
      codeName: 'TEST-BOT',
      description: 'A test bot for validating the multi-agent architecture',
      avatar: 'https://ui-avatars.com/api/?name=Test+Bot&background=FF9800&color=fff',
      skills: ['testing', 'validation', 'documentation'],
      ownerEmpId: employee.id
    });
    
    console.log('Created agent:', agent);
    console.log('Agent ID:', agent.id);
    
    // Create a test action from the agent that needs approval
    console.log('Creating a test action...');
    const action = await workforce.createAction({
      type: 'test_action',
      payload: {
        message: 'This is a test action created by TEST-BOT',
        timestamp: new Date().toISOString()
      },
      createdBy: agent.id,
      status: 'pending'
    });
    
    console.log('Created action:', action);
    
    // Approve the action
    console.log('Approving the test action...');
    const approvedAction = await workforce.approveAction(action.id, employee.id);
    
    console.log('Action approved by employee:', approvedAction);
    
    console.log('All done!');
  } catch (error) {
    console.error('Error creating test agent:', error);
  } finally {
    process.exit(0);
  }
}

// Run the script
createTestAgent();