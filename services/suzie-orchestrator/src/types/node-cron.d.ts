declare module 'node-cron' {
  namespace cron {
    interface ScheduledTask {
      stop(): void;
      start(): void;
      getStatus(): string;
    }

    /**
     * Schedule a task
     * 
     * @param cronExpression The cron expression to use for scheduling
     * @param func The function to run at the scheduled time
     * @param options Options for scheduling
     * @returns A scheduled task that can be stopped or started
     */
    function schedule(
      cronExpression: string,
      func: () => void,
      options?: {
        scheduled?: boolean;
        timezone?: string;
      }
    ): ScheduledTask;

    /**
     * Validate a cron expression
     * 
     * @param cronExpression The cron expression to validate
     * @returns Whether the expression is valid
     */
    function validate(cronExpression: string): boolean;
  }

  export = cron;
}