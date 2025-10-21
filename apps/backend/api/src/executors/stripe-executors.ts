import { db } from '../core/db';
import { mcpServerCredentials } from '../db/schema/w3suite';
import { eq, and } from 'drizzle-orm';
import { decryptMCPCredentials } from '../services/mcp-credential-encryption';
import { logger } from '../core/logger';

/**
 * Stripe MCP Executors
 * 
 * 6 action executors for Stripe integration:
 * - Create Payment Intent, Create Customer, Create Subscription
 * - Cancel Subscription, Refund Payment, Create Invoice
 */

const STRIPE_API_VERSION = '2023-10-16';

async function getStripeApiKey(serverId: string, tenantId: string): Promise<string> {
  const [creds] = await db
    .select()
    .from(mcpServerCredentials)
    .where(and(
      eq(mcpServerCredentials.serverId, serverId),
      eq(mcpServerCredentials.tenantId, tenantId)
    ))
    .limit(1);

  if (!creds) {
    throw new Error('Stripe API key not found');
  }

  const credentials = await decryptMCPCredentials(
    creds.encryptedCredentials,
    tenantId
  );

  return credentials.apiKey;
}

export async function executeStripeCreatePaymentIntent(params: {
  serverId: string;
  tenantId: string;
  config: {
    amount: number; // in cents
    currency: string;
    customerId?: string;
    description?: string;
    metadata?: Record<string, string>;
  };
}): Promise<{ paymentIntentId: string; clientSecret: string }> {
  const { serverId, tenantId, config } = params;

  try {
    const apiKey = await getStripeApiKey(serverId, tenantId);

    const response = await fetch('https://api.stripe.com/v1/payment_intents', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/x-www-form-urlencoded',
        'Stripe-Version': STRIPE_API_VERSION
      },
      body: new URLSearchParams({
        amount: config.amount.toString(),
        currency: config.currency,
        ...(config.customerId ? { customer: config.customerId } : {}),
        ...(config.description ? { description: config.description } : {}),
        ...(config.metadata ? Object.entries(config.metadata).reduce((acc, [key, value]) => ({
          ...acc,
          [`metadata[${key}]`]: value
        }), {}) : {})
      })
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Stripe create payment intent failed: ${error}`);
    }

    const data = await response.json();

    logger.info('✅ [Stripe Create Payment Intent] Created successfully', {
      paymentIntentId: data.id,
      amount: config.amount
    });

    return {
      paymentIntentId: data.id,
      clientSecret: data.client_secret
    };

  } catch (error) {
    logger.error('❌ [Stripe Create Payment Intent] Failed', {
      error: error instanceof Error ? error.message : String(error)
    });
    throw error;
  }
}

export async function executeStripeCreateCustomer(params: {
  serverId: string;
  tenantId: string;
  config: {
    email: string;
    name?: string;
    phone?: string;
    metadata?: Record<string, string>;
  };
}): Promise<{ customerId: string }> {
  const { serverId, tenantId, config } = params;

  try {
    const apiKey = await getStripeApiKey(serverId, tenantId);

    const response = await fetch('https://api.stripe.com/v1/customers', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/x-www-form-urlencoded',
        'Stripe-Version': STRIPE_API_VERSION
      },
      body: new URLSearchParams({
        email: config.email,
        ...(config.name ? { name: config.name } : {}),
        ...(config.phone ? { phone: config.phone } : {}),
        ...(config.metadata ? Object.entries(config.metadata).reduce((acc, [key, value]) => ({
          ...acc,
          [`metadata[${key}]`]: value
        }), {}) : {})
      })
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Stripe create customer failed: ${error}`);
    }

    const data = await response.json();

    return { customerId: data.id };

  } catch (error) {
    logger.error('❌ [Stripe Create Customer] Failed', {
      error: error instanceof Error ? error.message : String(error)
    });
    throw error;
  }
}

export async function executeStripeCreateSubscription(params: {
  serverId: string;
  tenantId: string;
  config: {
    customerId: string;
    priceId: string;
    trialDays?: number;
    metadata?: Record<string, string>;
  };
}): Promise<{ subscriptionId: string; status: string }> {
  const { serverId, tenantId, config } = params;

  try {
    const apiKey = await getStripeApiKey(serverId, tenantId);

    const params: Record<string, string> = {
      customer: config.customerId,
      'items[0][price]': config.priceId
    };

    if (config.trialDays) {
      params.trial_period_days = config.trialDays.toString();
    }

    if (config.metadata) {
      Object.entries(config.metadata).forEach(([key, value]) => {
        params[`metadata[${key}]`] = value;
      });
    }

    const response = await fetch('https://api.stripe.com/v1/subscriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/x-www-form-urlencoded',
        'Stripe-Version': STRIPE_API_VERSION
      },
      body: new URLSearchParams(params)
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Stripe create subscription failed: ${error}`);
    }

    const data = await response.json();

    return {
      subscriptionId: data.id,
      status: data.status
    };

  } catch (error) {
    logger.error('❌ [Stripe Create Subscription] Failed', {
      error: error instanceof Error ? error.message : String(error)
    });
    throw error;
  }
}

export async function executeStripeCancelSubscription(params: {
  serverId: string;
  tenantId: string;
  config: {
    subscriptionId: string;
    cancelAtPeriodEnd?: boolean;
  };
}): Promise<{ status: string }> {
  const { serverId, tenantId, config } = params;

  try {
    const apiKey = await getStripeApiKey(serverId, tenantId);

    const response = await fetch(`https://api.stripe.com/v1/subscriptions/${config.subscriptionId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/x-www-form-urlencoded',
        'Stripe-Version': STRIPE_API_VERSION
      },
      body: new URLSearchParams({
        ...(config.cancelAtPeriodEnd !== undefined ? { cancel_at_period_end: config.cancelAtPeriodEnd.toString() } : {})
      })
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Stripe cancel subscription failed: ${error}`);
    }

    const data = await response.json();

    return { status: data.status };

  } catch (error) {
    logger.error('❌ [Stripe Cancel Subscription] Failed', {
      error: error instanceof Error ? error.message : String(error)
    });
    throw error;
  }
}

export async function executeStripeRefundPayment(params: {
  serverId: string;
  tenantId: string;
  config: {
    paymentIntentId: string;
    amount?: number; // in cents, partial refund if provided
    reason?: 'duplicate' | 'fraudulent' | 'requested_by_customer';
  };
}): Promise<{ refundId: string; status: string }> {
  const { serverId, tenantId, config } = params;

  try {
    const apiKey = await getStripeApiKey(serverId, tenantId);

    const response = await fetch('https://api.stripe.com/v1/refunds', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/x-www-form-urlencoded',
        'Stripe-Version': STRIPE_API_VERSION
      },
      body: new URLSearchParams({
        payment_intent: config.paymentIntentId,
        ...(config.amount ? { amount: config.amount.toString() } : {}),
        ...(config.reason ? { reason: config.reason } : {})
      })
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Stripe refund payment failed: ${error}`);
    }

    const data = await response.json();

    return {
      refundId: data.id,
      status: data.status
    };

  } catch (error) {
    logger.error('❌ [Stripe Refund Payment] Failed', {
      error: error instanceof Error ? error.message : String(error)
    });
    throw error;
  }
}

export async function executeStripeCreateInvoice(params: {
  serverId: string;
  tenantId: string;
  config: {
    customerId: string;
    dueDate?: string; // Unix timestamp or "now"
    description?: string;
  };
}): Promise<{ invoiceId: string; invoiceUrl: string }> {
  const { serverId, tenantId, config } = params;

  try {
    const apiKey = await getStripeApiKey(serverId, tenantId);

    const response = await fetch('https://api.stripe.com/v1/invoices', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/x-www-form-urlencoded',
        'Stripe-Version': STRIPE_API_VERSION
      },
      body: new URLSearchParams({
        customer: config.customerId,
        ...(config.dueDate ? { due_date: config.dueDate } : {}),
        ...(config.description ? { description: config.description } : {})
      })
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Stripe create invoice failed: ${error}`);
    }

    const data = await response.json();

    return {
      invoiceId: data.id,
      invoiceUrl: data.hosted_invoice_url || ''
    };

  } catch (error) {
    logger.error('❌ [Stripe Create Invoice] Failed', {
      error: error instanceof Error ? error.message : String(error)
    });
    throw error;
  }
}
