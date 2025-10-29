import logger from './logger';
import { z } from 'zod';

export interface FunctionToolDefinition {
  type: 'function';
  name: string;
  description: string;
  parameters: {
    type: 'object';
    properties: Record<string, any>;
    required?: string[];
  };
}

/**
 * CRM Lookup Tool - Search for customer by phone or email
 */
export const crmLookupTool: FunctionToolDefinition = {
  type: 'function',
  name: 'crm_lookup_customer',
  description: 'Look up customer information from CRM by phone number or email',
  parameters: {
    type: 'object',
    properties: {
      phone: {
        type: 'string',
        description: 'Customer phone number in E.164 format (e.g. +393401234567)'
      },
      email: {
        type: 'string',
        description: 'Customer email address'
      }
    },
    required: []
  }
};

/**
 * Create Support Ticket Tool
 */
export const createTicketTool: FunctionToolDefinition = {
  type: 'function',
  name: 'create_support_ticket',
  description: 'Create a support ticket for the customer issue',
  parameters: {
    type: 'object',
    properties: {
      customerId: {
        type: 'string',
        description: 'Customer ID from CRM (if available)'
      },
      subject: {
        type: 'string',
        description: 'Short summary of the issue'
      },
      description: {
        type: 'string',
        description: 'Detailed description of the customer problem'
      },
      priority: {
        type: 'string',
        enum: ['low', 'medium', 'high', 'urgent'],
        description: 'Ticket priority level'
      },
      category: {
        type: 'string',
        description: 'Issue category (e.g., technical, billing, general)'
      }
    },
    required: ['subject', 'description', 'priority']
  }
};

/**
 * Transfer Call to Extension Tool
 */
export const transferCallTool: FunctionToolDefinition = {
  type: 'function',
  name: 'transfer_to_extension',
  description: 'Transfer the call to a human operator extension',
  parameters: {
    type: 'object',
    properties: {
      extension: {
        type: 'string',
        description: 'Extension number to transfer to (e.g., "101", "sales", "support")'
      },
      reason: {
        type: 'string',
        description: 'Reason for transfer (optional, for logging)'
      }
    },
    required: ['extension']
  }
};

/**
 * Book Appointment Tool
 */
export const bookAppointmentTool: FunctionToolDefinition = {
  type: 'function',
  name: 'book_appointment',
  description: 'Book an appointment for the customer',
  parameters: {
    type: 'object',
    properties: {
      customerId: {
        type: 'string',
        description: 'Customer ID from CRM'
      },
      date: {
        type: 'string',
        description: 'Appointment date in YYYY-MM-DD format'
      },
      time: {
        type: 'string',
        description: 'Appointment time in HH:MM format (24-hour)'
      },
      service: {
        type: 'string',
        description: 'Type of service/appointment'
      },
      notes: {
        type: 'string',
        description: 'Additional notes or requests'
      }
    },
    required: ['customerId', 'date', 'time', 'service']
  }
};

/**
 * All available function tools for AI Agent
 */
export const allFunctionTools: FunctionToolDefinition[] = [
  crmLookupTool,
  createTicketTool,
  transferCallTool,
  bookAppointmentTool
];

/**
 * Execute a function tool call
 */
export async function executeFunctionTool(
  functionName: string,
  args: any,
  context: { tenantId: string; storeId: string; callId: string; w3ApiUrl: string; w3ApiKey: string }
): Promise<any> {
  logger.info('[FunctionTools] Executing function', {
    function: functionName,
    args,
    context: { tenantId: context.tenantId, storeId: context.storeId, callId: context.callId }
  });

  try {
    switch (functionName) {
      case 'crm_lookup_customer':
        return await crmLookupCustomer(args, context);
      
      case 'create_support_ticket':
        return await createSupportTicket(args, context);
      
      case 'transfer_to_extension':
        return await transferToExtension(args, context);
      
      case 'book_appointment':
        return await bookAppointment(args, context);
      
      default:
        logger.warn('[FunctionTools] Unknown function', { functionName });
        return { error: 'Unknown function', function: functionName };
    }
  } catch (error: any) {
    logger.error('[FunctionTools] Function execution error', {
      function: functionName,
      error: error.message
    });
    return { error: error.message };
  }
}

/**
 * CRM Lookup Implementation
 */
async function crmLookupCustomer(
  args: { phone?: string; email?: string },
  context: { tenantId: string; storeId: string; w3ApiUrl: string; w3ApiKey: string }
): Promise<any> {
  const { phone, email } = args;
  
  // Call W3 Suite CRM API
  const query = new URLSearchParams();
  if (phone) query.set('phone', phone);
  if (email) query.set('email', email);
  
  const response = await fetch(`${context.w3ApiUrl}/api/crm/customers/search?${query}`, {
    headers: {
      'x-tenant-id': context.tenantId,
      'x-api-key': context.w3ApiKey
    }
  });

  if (!response.ok) {
    throw new Error(`CRM API error: ${response.statusText}`);
  }

  const data = await response.json();
  
  if (data.success && data.data.length > 0) {
    const customer = data.data[0];
    return {
      found: true,
      customer: {
        id: customer.id,
        name: customer.fullName || customer.companyName,
        phone: customer.phone,
        email: customer.email,
        type: customer.type,
        status: customer.status
      }
    };
  }

  return { found: false, message: 'Customer not found in CRM' };
}

/**
 * Create Support Ticket Implementation
 */
async function createSupportTicket(
  args: { customerId?: string; subject: string; description: string; priority: string; category?: string },
  context: { tenantId: string; storeId: string; callId: string; w3ApiUrl: string; w3ApiKey: string }
): Promise<any> {
  const response = await fetch(`${context.w3ApiUrl}/api/support/tickets`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-tenant-id': context.tenantId,
      'x-api-key': context.w3ApiKey
    },
    body: JSON.stringify({
      customerId: args.customerId,
      subject: args.subject,
      description: args.description,
      priority: args.priority,
      category: args.category || 'general',
      source: 'voice_ai',
      sourceRef: context.callId
    })
  });

  if (!response.ok) {
    throw new Error(`Ticket API error: ${response.statusText}`);
  }

  const data = await response.json();
  return {
    success: true,
    ticketId: data.data.id,
    ticketNumber: data.data.ticketNumber,
    message: `Ticket ${data.data.ticketNumber} created successfully`
  };
}

/**
 * Transfer to Extension Implementation
 */
async function transferToExtension(
  args: { extension: string; reason?: string },
  context: { callId: string }
): Promise<any> {
  logger.info('[FunctionTools] Transfer request', {
    callId: context.callId,
    extension: args.extension,
    reason: args.reason
  });

  // Return transfer instruction for FreeSWITCH
  // The WebSocket server will handle the actual SIP transfer
  return {
    action: 'transfer',
    extension: args.extension,
    reason: args.reason || 'Customer requested human assistance',
    message: `Transferring call to extension ${args.extension}`
  };
}

/**
 * Book Appointment Implementation
 */
async function bookAppointment(
  args: { customerId: string; date: string; time: string; service: string; notes?: string },
  context: { tenantId: string; storeId: string; w3ApiUrl: string; w3ApiKey: string }
): Promise<any> {
  const response = await fetch(`${context.w3ApiUrl}/api/appointments`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-tenant-id': context.tenantId,
      'x-api-key': context.w3ApiKey
    },
    body: JSON.stringify({
      customerId: args.customerId,
      storeId: context.storeId,
      date: args.date,
      time: args.time,
      service: args.service,
      notes: args.notes,
      status: 'confirmed',
      source: 'voice_ai'
    })
  });

  if (!response.ok) {
    throw new Error(`Appointment API error: ${response.statusText}`);
  }

  const data = await response.json();
  return {
    success: true,
    appointmentId: data.data.id,
    datetime: `${args.date} ${args.time}`,
    message: `Appointment booked for ${args.date} at ${args.time}`
  };
}
