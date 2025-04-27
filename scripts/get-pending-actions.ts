#!/usr/bin/env ts-node
/**
 * Script to demonstrate retrieving agents and pending actions
 * 
 * Run with:
 * npx ts-node scripts/get-pending-actions.ts
 */

import { workforce } from '../server/workforce';

async function getPendingActions() {
  try {
    console.log('Looking up test employee...');
    
    // Lookup our test employee by email
    const employee = await workforce.getEmployeeByEmail('test@example.com');
    
    if (!employee) {
      console.error('Test employee not found! Run create-test-employee.ts first.');
      return;
    }
    
    console.log('Found employee:', employee.fullName, 'with ID:', employee.id);
    
    // Get all agents owned by this employee
    console.log('Looking up agents owned by the employee...');
    const employeeAgents = await workforce.getAgentsByOwner(employee.id);
    
    console.log(`Found ${employeeAgents.length} agents:`);
    for (const agent of employeeAgents) {
      console.log(`- ${agent.codeName} (${agent.id})`);
      
      // Get pending actions for this agent
      console.log(`  Looking up pending actions for ${agent.codeName}...`);
      const pendingActions = await workforce.getPendingActionsByAgent(agent.id);
      
      console.log(`  Found ${pendingActions.length} pending actions`);
      for (const action of pendingActions) {
        console.log(`  - Action ID: ${action.id}, Type: ${action.type}`);
      }
      
      // Let's create a new pending action for this agent
      console.log(`  Creating a new pending action for ${agent.codeName}...`);
      const newAction = await workforce.createAction({
        type: 'demonstration_action',
        payload: {
          message: `This is a demonstration action for ${agent.codeName}`,
          timestamp: new Date().toISOString()
        },
        createdBy: agent.id,
        status: 'pending'
      });
      
      console.log(`  Created new pending action: ${newAction.id}`);
      
      // Now get pending actions again
      console.log(`  Looking up pending actions for ${agent.codeName} again...`);
      const updatedPendingActions = await workforce.getPendingActionsByAgent(agent.id);
      
      console.log(`  Now found ${updatedPendingActions.length} pending actions`);
    }
    
    console.log('All done!');
  } catch (error) {
    console.error('Error getting pending actions:', error);
  } finally {
    process.exit(0);
  }
}

// Run the script
getPendingActions();