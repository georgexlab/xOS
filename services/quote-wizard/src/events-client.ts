/**
 * Events Gateway Client
 * 
 * This client handles communication with the Events Gateway API
 * to create and retrieve events, clients, quotes, and payments.
 */

export interface Client {
  id?: number;
  name: string;
  email: string;
  phone?: string;
  zohoClientId?: string;
}

export interface Quote {
  id?: number;
  clientId: number;
  title: string;
  description?: string;
  amount: string;
  status?: string;
  zohoQuoteId?: string;
}

export interface Payment {
  id?: number;
  quoteId: number;
  amount: string;
  status?: string;
  transactionId?: string;
}

export interface Event {
  id?: string;
  type: string;
  payload: any;
}

export class EventsClient {
  private apiUrl: string;
  
  constructor() {
    // In a real implementation, we would get this from environment variables
    this.apiUrl = 'http://localhost:5000';
  }
  
  /**
   * Create a client in the system
   */
  async createClient(client: Client): Promise<Client> {
    try {
      const response = await fetch(`${this.apiUrl}/clients`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(client),
      });
      
      if (!response.ok) {
        throw new Error(`Failed to create client: ${response.statusText}`);
      }
      
      const result = await response.json();
      return result.client;
    } catch (error) {
      console.error('Error creating client:', error);
      throw new Error('Failed to create client');
    }
  }
  
  /**
   * Create a quote in the system
   */
  async createQuote(quote: Quote): Promise<Quote> {
    try {
      const response = await fetch(`${this.apiUrl}/quotes`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(quote),
      });
      
      if (!response.ok) {
        throw new Error(`Failed to create quote: ${response.statusText}`);
      }
      
      const result = await response.json();
      return result.quote;
    } catch (error) {
      console.error('Error creating quote:', error);
      throw new Error('Failed to create quote');
    }
  }
  
  /**
   * Create a payment in the system
   */
  async createPayment(payment: Payment): Promise<Payment> {
    try {
      const response = await fetch(`${this.apiUrl}/payments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payment),
      });
      
      if (!response.ok) {
        throw new Error(`Failed to create payment: ${response.statusText}`);
      }
      
      const result = await response.json();
      return result.payment;
    } catch (error) {
      console.error('Error creating payment:', error);
      throw new Error('Failed to create payment');
    }
  }
  
  /**
   * Create an event in the system
   */
  async createEvent(event: Event): Promise<Event> {
    try {
      const response = await fetch(`${this.apiUrl}/events`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(event),
      });
      
      if (!response.ok) {
        throw new Error(`Failed to create event: ${response.statusText}`);
      }
      
      const result = await response.json();
      return result.event;
    } catch (error) {
      console.error('Error creating event:', error);
      throw new Error('Failed to create event');
    }
  }
}