import { 
  employees, agents, actions, 
  type Employee, type InsertEmployee,
  type Agent, type InsertAgent,
  type Action, type InsertAction 
} from "../shared/schema";
import { db } from "./db";
import { eq, and } from "drizzle-orm";

// Workforce management class for handling employees and agents
export class WorkforceManager {
  /**
   * Create a new employee
   * @param employeeData The employee data to insert
   * @returns The created employee record
   */
  async createEmployee(employeeData: InsertEmployee): Promise<Employee> {
    const [employee] = await db
      .insert(employees)
      .values(employeeData)
      .returning();
    return employee;
  }

  /**
   * Get an employee by ID
   * @param id The employee ID
   * @returns The employee or undefined if not found
   */
  async getEmployee(id: string): Promise<Employee | undefined> {
    // UUID is a string in TypeScript but passed directly to PostgreSQL
    const [employee] = await db
      .select()
      .from(employees)
      .where(eq(employees.id, id));
    return employee;
  }

  /**
   * Get an employee by email
   * @param email The employee email
   * @returns The employee or undefined if not found
   */
  async getEmployeeByEmail(email: string): Promise<Employee | undefined> {
    const [employee] = await db
      .select()
      .from(employees)
      .where(eq(employees.email, email));
    return employee;
  }

  /**
   * Create a new agent
   * @param agentData The agent data to insert
   * @returns The created agent record
   */
  async createAgent(agentData: InsertAgent): Promise<Agent> {
    const [agent] = await db
      .insert(agents)
      .values(agentData)
      .returning();
    return agent;
  }

  /**
   * Get an agent by ID
   * @param id The agent ID
   * @returns The agent or undefined if not found
   */
  async getAgent(id: string): Promise<Agent | undefined> {
    const [agent] = await db
      .select()
      .from(agents)
      .where(eq(agents.id, id));
    return agent;
  }

  /**
   * Get an agent by code name (unique identifier)
   * @param codeName The agent code name (e.g., 'SUZIE')
   * @returns The agent or undefined if not found
   */
  async getAgentByCodeName(codeName: string): Promise<Agent | undefined> {
    const [agent] = await db
      .select()
      .from(agents)
      .where(eq(agents.codeName, codeName));
    return agent;
  }

  /**
   * Get all agents owned by a specific employee
   * @param employeeId The employee ID
   * @returns Array of agents owned by the employee
   */
  async getAgentsByOwner(employeeId: string): Promise<Agent[]> {
    return await db
      .select()
      .from(agents)
      .where(eq(agents.ownerEmpId, employeeId));
  }

  /**
   * Create a new action (task)
   * @param actionData The action data to insert
   * @returns The created action record
   */
  async createAction(actionData: InsertAction): Promise<Action> {
    const [action] = await db
      .insert(actions)
      .values(actionData)
      .returning();
    return action;
  }

  /**
   * Get an action by ID
   * @param id The action ID
   * @returns The action or undefined if not found
   */
  async getAction(id: string): Promise<Action | undefined> {
    const [action] = await db
      .select()
      .from(actions)
      .where(eq(actions.id, id));
    return action;
  }

  /**
   * Get pending actions created by a specific agent
   * @param agentId The agent ID
   * @returns Array of pending actions created by the agent
   */
  async getPendingActionsByAgent(agentId: string): Promise<Action[]> {
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

  /**
   * Approve an action
   * @param actionId The action ID
   * @param employeeId The employee ID who is approving
   * @returns The updated action record
   */
  async approveAction(actionId: string, employeeId: string): Promise<Action | undefined> {
    const [action] = await db
      .update(actions)
      .set({
        status: 'approved',
        approvedBy: employeeId,
        approvedAt: new Date(),
      })
      .where(eq(actions.id, actionId))
      .returning();
    return action;
  }

  /**
   * Reject an action
   * @param actionId The action ID
   * @param employeeId The employee ID who is rejecting
   * @returns The updated action record
   */
  async rejectAction(actionId: string, employeeId: string): Promise<Action | undefined> {
    const [action] = await db
      .update(actions)
      .set({
        status: 'rejected',
        approvedBy: employeeId,
        approvedAt: new Date(),
      })
      .where(eq(actions.id, actionId))
      .returning();
    return action;
  }

  /**
   * Mark an action as completed
   * @param actionId The action ID
   * @returns The updated action record
   */
  async completeAction(actionId: string): Promise<Action | undefined> {
    const [action] = await db
      .update(actions)
      .set({
        status: 'completed',
      })
      .where(eq(actions.id, actionId))
      .returning();
    return action;
  }

  /**
   * Mark an action as failed
   * @param actionId The action ID
   * @returns The updated action record
   */
  async failAction(actionId: string): Promise<Action | undefined> {
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

// Export a singleton instance
export const workforce = new WorkforceManager();