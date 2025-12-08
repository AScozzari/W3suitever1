import { db } from '../core/db';
import { crmCustomers, crmOrders } from './schema/w3suite';
import { sql } from 'drizzle-orm';

const productCatalog = [
  { name: 'Premium Package', category: 'Software', basePrice: 299 },
  { name: 'Enterprise License', category: 'Software', basePrice: 999 },
  { name: 'Consulting Hours (10h)', category: 'Services', basePrice: 1500 },
  { name: 'Support Plan Pro', category: 'Services', basePrice: 199 },
  { name: 'Training Session', category: 'Services', basePrice: 450 },
  { name: 'Custom Integration', category: 'Services', basePrice: 2500 },
  { name: 'Data Migration', category: 'Services', basePrice: 1200 },
  { name: 'Mobile App License', category: 'Software', basePrice: 499 },
  { name: 'API Access Premium', category: 'Software', basePrice: 399 },
  { name: 'White Label Package', category: 'Software', basePrice: 1999 }
];

const paymentMethods = ['carta_credito', 'bonifico', 'paypal', 'stripe', 'contanti'];
const statuses = ['completed', 'pending', 'processing', 'cancelled'];

function generateRandomOrder(customerId: string, tenantId: string, index: number): any {
  const numProducts = Math.floor(Math.random() * 3) + 1;
  const selectedProducts = [];
  let subtotal = 0;

  for (let i = 0; i < numProducts; i++) {
    const product = productCatalog[Math.floor(Math.random() * productCatalog.length)];
    const quantity = Math.floor(Math.random() * 3) + 1;
    const price = product.basePrice;
    const itemTotal = price * quantity;

    selectedProducts.push({
      name: product.name,
      category: product.category,
      quantity,
      price,
      total: itemTotal
    });

    subtotal += itemTotal;
  }

  const tax = Math.round(subtotal * 0.22 * 100) / 100;
  const totalAmount = subtotal + tax;

  const daysAgo = Math.floor(Math.random() * 365);
  const orderDate = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000);

  const orderNumber = `ORD-${new Date().getFullYear()}-${String(index).padStart(6, '0')}`;
  
  const status = statuses[Math.floor(Math.random() * statuses.length)];
  const paymentMethod = paymentMethods[Math.floor(Math.random() * paymentMethods.length)];

  return {
    id: sql`gen_random_uuid()`,
    tenantId,
    customerId,
    orderNumber,
    orderDate,
    totalAmount: String(totalAmount),
    currency: 'EUR',
    status,
    paymentMethod,
    paymentStatus: 'paid',
    shippingAddress: null,
    billingAddress: null,
    items: selectedProducts,
    discountAmount: '0',
    taxAmount: String(tax),
    shippingAmount: '0',
    notes: null,
    storeId: null,
    channelType: 'online',
    createdBy: null,
    updatedBy: null,
    createdAt: orderDate,
    updatedAt: orderDate
  };
}

export async function seedCRMOrders() {
  console.log('🛍️ Seeding CRM Orders...');

  try {
    const customers = await db.select().from(crmCustomers).limit(20);

    if (customers.length === 0) {
      console.log('⚠️ No customers found. Skipping order seeding.');
      return;
    }

    console.log(`Found ${customers.length} customers. Generating orders...`);

    let orderIndex = 1;
    const ordersToInsert = [];

    for (const customer of customers) {
      const numOrders = Math.floor(Math.random() * 6) + 3;
      
      for (let i = 0; i < numOrders; i++) {
        const order = generateRandomOrder(customer.id, customer.tenantId, orderIndex);
        ordersToInsert.push(order);
        orderIndex++;
      }
    }

    console.log(`Inserting ${ordersToInsert.length} orders...`);
    
    await db.insert(crmOrders).values(ordersToInsert);

    console.log(`✅ Successfully seeded ${ordersToInsert.length} CRM orders`);
  } catch (error) {
    console.error('❌ Error seeding CRM orders:', error);
    throw error;
  }
}

seedCRMOrders()
  .then(() => {
    console.log('✅ CRM Orders seeding completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ CRM Orders seeding failed:', error);
    process.exit(1);
  });
