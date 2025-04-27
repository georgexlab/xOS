#!/usr/bin/env ts-node
/**
 * Simple script to create a test employee to validate database functionality
 * 
 * Run with:
 * npx ts-node scripts/create-test-employee.ts
 */

import { workforce } from '../server/workforce';

async function createTestEmployee() {
  try {
    console.log('Creating a test employee...');
    
    // Create a test employee
    const employee = await workforce.createEmployee({
      fullName: 'Test Employee',
      email: 'test@example.com',
      role: 'Tester',
      profilePhoto: 'https://ui-avatars.com/api/?name=Test+Employee&background=0D8ABC&color=fff'
    });
    
    console.log('Created employee:', employee);
    console.log('Employee ID:', employee.id);
    console.log('All done!');
  } catch (error) {
    console.error('Error creating test employee:', error);
  } finally {
    process.exit(0);
  }
}

// Run the script
createTestEmployee();