/**
 * Action Center API Tests
 * 
 * Tests the REST endpoints for the action center API:
 * - GET /api/actions?status=pending
 * - POST /api/actions/:id/approve
 * - POST /api/actions/:id/reject
 */

import { db } from '../db';
import { actions, employees, agents } from '../../../../shared/schema';
import { eq } from 'drizzle-orm';
import { server } from '../server';
import { randomUUID } from 'crypto';

describe('Action Center API', () => {
  // IDs for our test entities
  let testActionId: string;
  let testAgentId: string;
  let testEmployeeId: string;

  // Set up test data
  beforeAll(async () => {
    // Create test employee
    const employeeId = randomUUID();
    testEmployeeId = employeeId;
    
    const [testEmployee] = await db.insert(employees)
      .values({
        id: employeeId,
        fullName: 'Test Employee',
        email: `test-${Date.now()}@example.com`,
        role: 'Tester',
      })
      .returning();
    
    // Create test agent
    const agentId = randomUUID();
    testAgentId = agentId;
    
    const [testAgent] = await db.insert(agents)
      .values({
        id: agentId,
        codeName: `TEST-AGENT-${Date.now()}`,
        description: 'Agent for testing purposes',
        skills: ['testing'],
        ownerEmpId: testEmployee.id,
      })
      .returning();
    
    // Create test action
    const actionId = randomUUID();
    testActionId = actionId;
    
    await db.insert(actions)
      .values({
        id: actionId,
        type: 'test_action',
        status: 'pending',
        createdBy: testAgent.id,
        payload: {
          testData: 'This is a test action',
        },
      });
  });

  // Clean up test data
  afterAll(async () => {
    // Delete in reverse order of creation due to foreign key constraints
    await db.delete(actions).where(eq(actions.id, testActionId));
    await db.delete(agents).where(eq(agents.id, testAgentId));
    await db.delete(employees).where(eq(employees.id, testEmployeeId));
    await server.close();
  });

  // GET /api/actions?status=pending
  it('should list pending actions', async () => {
    const response = await server.inject({
      method: 'GET',
      url: '/api/actions?status=pending',
    });
    
    const result = JSON.parse(response.payload);
    
    expect(response.statusCode).toBe(200);
    expect(result.actions).toBeDefined();
    expect(Array.isArray(result.actions)).toBe(true);
    
    // Our test action should be in the results
    const foundTestAction = result.actions.some((action: any) => action.id === testActionId);
    expect(foundTestAction).toBe(true);
  });
  
  // POST /api/actions/:id/approve
  it('should approve an action', async () => {
    // Ensure the action is in pending state
    await db.update(actions)
      .set({
        status: 'pending',
        approvedBy: null,
        approvedAt: null,
      })
      .where(eq(actions.id, testActionId));
    
    const response = await server.inject({
      method: 'POST',
      url: `/api/actions/${testActionId}/approve`,
      payload: {
        employeeId: testEmployeeId,
      },
    });
    
    const result = JSON.parse(response.payload);
    
    expect(response.statusCode).toBe(200);
    expect(result.action).toBeDefined();
    expect(result.action.id).toBe(testActionId);
    expect(result.action.status).toBe('approved');
    expect(result.action.approvedBy).toBe(testEmployeeId);
  });
  
  // POST /api/actions/:id/reject
  it('should reject an action with a reason', async () => {
    // Ensure the action is in pending state
    await db.update(actions)
      .set({
        status: 'pending',
        approvedBy: null,
        approvedAt: null,
      })
      .where(eq(actions.id, testActionId));
    
    const reason = 'Test rejection reason';
    
    const response = await server.inject({
      method: 'POST',
      url: `/api/actions/${testActionId}/reject`,
      payload: {
        employeeId: testEmployeeId,
        reason,
      },
    });
    
    const result = JSON.parse(response.payload);
    
    expect(response.statusCode).toBe(200);
    expect(result.action).toBeDefined();
    expect(result.action.id).toBe(testActionId);
    expect(result.action.status).toBe('rejected');
    expect(result.action.approvedBy).toBe(testEmployeeId);
    expect(result.action.payload.rejectionReason).toBe(reason);
  });
  
  // POST /api/actions/:id/approve (404 for non-existent action)
  it('should return 404 for non-existent action', async () => {
    const nonExistentId = randomUUID();
    
    const response = await server.inject({
      method: 'POST',
      url: `/api/actions/${nonExistentId}/approve`,
      payload: {
        employeeId: testEmployeeId,
      },
    });
    
    const result = JSON.parse(response.payload);
    
    expect(response.statusCode).toBe(404);
    expect(result.error).toBeDefined();
  });
  
  // POST /api/actions/:id/approve (400 for already processed action)
  it('should return 400 for already processed action', async () => {
    // First make sure the action is rejected using our existing employee
    await db.update(actions)
      .set({
        status: 'rejected',
        approvedBy: testEmployeeId,
        approvedAt: new Date(),
      })
      .where(eq(actions.id, testActionId));
    
    const response = await server.inject({
      method: 'POST',
      url: `/api/actions/${testActionId}/approve`,
      payload: {
        employeeId: testEmployeeId,
      },
    });
    
    const result = JSON.parse(response.payload);
    
    expect(response.statusCode).toBe(400);
    expect(result.error).toBeDefined();
    expect(result.error).toContain('Only pending actions');
  });
});