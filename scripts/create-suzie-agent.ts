#!/usr/bin/env ts-node
/**
 * Script to create a SUZIE agent for automated follow-ups
 * 
 * Run with:
 * npx ts-node scripts/create-suzie-agent.ts
 */

import { workforce } from '../server/workforce';
import { Pool } from 'pg';

async function createSuzieAgent() {
  try {
    console.log('Looking up test employee...');
    
    // Lookup our test employee by email
    const employee = await workforce.getEmployeeByEmail('test@example.com');
    
    if (!employee) {
      console.error('Test employee not found! Run create-test-employee.ts first.');
      return;
    }
    
    console.log('Found employee:', employee.fullName, 'with ID:', employee.id);
    
    // See if SUZIE already exists
    const existingAgent = await workforce.getAgentByCodeName('SUZIE');
    
    if (existingAgent) {
      console.log('SUZIE agent already exists with ID:', existingAgent.id);
      return;
    }
    
    // Create the SUZIE agent owned by the employee
    console.log('Creating SUZIE agent...');
    const agent = await workforce.createAgent({
      codeName: 'SUZIE',
      description: 'Automated follow-up assistant for quotes and client communications',
      avatar: 'https://ui-avatars.com/api/?name=Suzie&background=E91E63&color=fff',
      skills: ['follow_up_emails', 'quote_status_checking', 'client_communication'],
      ownerEmpId: employee.id
    });
    
    console.log('Created agent:', agent);
    console.log('Agent ID:', agent.id);
    
    console.log('All done!');
  } catch (error) {
    console.error('Error creating SUZIE agent:', error);
  } finally {
    process.exit(0);
  }
}

// Run the script
createSuzieAgent();