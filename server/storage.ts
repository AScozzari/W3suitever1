import {
  users,
  tenants,
  products,
  customers,
  orders,
  orderItems,
  categories,
  type User,
  type UpsertUser,
  type Tenant,
  type InsertTenant,
  type Product,
  type InsertProduct,
  type Customer,
  type InsertCustomer,
  type Order,
  type InsertOrder,
  type OrderItem,
  type InsertOrderItem,
  type Category,
  type InsertCategory,
} from "../shared/schema";
import { db } from "./db";
import { eq, and, desc, gte, sql } from "drizzle-orm";

// Interface for storage operations
export interface IStorage {
  // User operations (MANDATORY for Replit Auth)
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  
  // Tenant operations
  getTenant(id: string): Promise<Tenant | undefined>;
  createTenant(tenant: InsertTenant): Promise<Tenant>;
  
  // Product operations
  getProducts(tenantId: string): Promise<Product[]>;
  getProduct(id: string, tenantId: string): Promise<Product | undefined>;
  createProduct(product: InsertProduct): Promise<Product>;
  updateProductQuantity(id: string, tenantId: string, quantity: number): Promise<Product | undefined>;
  
  // Customer operations
  getCustomers(tenantId: string): Promise<Customer[]>;
  getCustomer(id: string, tenantId: string): Promise<Customer | undefined>;
  createCustomer(customer: InsertCustomer): Promise<Customer>;
  
  // Order operations
  getOrders(tenantId: string): Promise<Order[]>;
  getOrder(id: string, tenantId: string): Promise<Order | undefined>;
  createOrder(order: InsertOrder): Promise<Order>;
  getOrderItems(orderId: string): Promise<OrderItem[]>;
  createOrderItem(item: InsertOrderItem): Promise<OrderItem>;
  
  // Category operations
  getCategories(tenantId: string): Promise<Category[]>;
  createCategory(category: InsertCategory): Promise<Category>;
  
  // Analytics
  getDashboardStats(tenantId: string): Promise<{
    totalRevenue: number;
    totalOrders: number;
    totalCustomers: number;
    averageOrderValue: number;
    todayRevenue: number;
    todayOrders: number;
  }>;
}

export class DatabaseStorage implements IStorage {
  // User operations (MANDATORY for Replit Auth)
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  // Tenant operations
  async getTenant(id: string): Promise<Tenant | undefined> {
    const [tenant] = await db.select().from(tenants).where(eq(tenants.id, id));
    return tenant;
  }

  async createTenant(tenantData: InsertTenant): Promise<Tenant> {
    const [tenant] = await db.insert(tenants).values(tenantData).returning();
    return tenant;
  }

  // Product operations
  async getProducts(tenantId: string): Promise<Product[]> {
    return await db
      .select()
      .from(products)
      .where(and(eq(products.tenantId, tenantId), eq(products.isActive, true)))
      .orderBy(products.name);
  }

  async getProduct(id: string, tenantId: string): Promise<Product | undefined> {
    const [product] = await db
      .select()
      .from(products)
      .where(and(eq(products.id, id), eq(products.tenantId, tenantId)));
    return product;
  }

  async createProduct(productData: InsertProduct): Promise<Product> {
    const [product] = await db.insert(products).values(productData).returning();
    return product;
  }

  async updateProductQuantity(id: string, tenantId: string, quantity: number): Promise<Product | undefined> {
    const [product] = await db
      .update(products)
      .set({ quantity, updatedAt: new Date() })
      .where(and(eq(products.id, id), eq(products.tenantId, tenantId)))
      .returning();
    return product;
  }

  // Customer operations
  async getCustomers(tenantId: string): Promise<Customer[]> {
    return await db
      .select()
      .from(customers)
      .where(eq(customers.tenantId, tenantId))
      .orderBy(desc(customers.createdAt));
  }

  async getCustomer(id: string, tenantId: string): Promise<Customer | undefined> {
    const [customer] = await db
      .select()
      .from(customers)
      .where(and(eq(customers.id, id), eq(customers.tenantId, tenantId)));
    return customer;
  }

  async createCustomer(customerData: InsertCustomer): Promise<Customer> {
    const [customer] = await db.insert(customers).values(customerData).returning();
    return customer;
  }

  // Order operations
  async getOrders(tenantId: string): Promise<Order[]> {
    return await db
      .select()
      .from(orders)
      .where(eq(orders.tenantId, tenantId))
      .orderBy(desc(orders.createdAt));
  }

  async getOrder(id: string, tenantId: string): Promise<Order | undefined> {
    const [order] = await db
      .select()
      .from(orders)
      .where(and(eq(orders.id, id), eq(orders.tenantId, tenantId)));
    return order;
  }

  async createOrder(orderData: InsertOrder): Promise<Order> {
    const [order] = await db.insert(orders).values(orderData).returning();
    return order;
  }

  async getOrderItems(orderId: string): Promise<OrderItem[]> {
    return await db
      .select()
      .from(orderItems)
      .where(eq(orderItems.orderId, orderId));
  }

  async createOrderItem(itemData: InsertOrderItem): Promise<OrderItem> {
    const [item] = await db.insert(orderItems).values(itemData).returning();
    return item;
  }

  // Category operations
  async getCategories(tenantId: string): Promise<Category[]> {
    return await db
      .select()
      .from(categories)
      .where(eq(categories.tenantId, tenantId))
      .orderBy(categories.name);
  }

  async createCategory(categoryData: InsertCategory): Promise<Category> {
    const [category] = await db.insert(categories).values(categoryData).returning();
    return category;
  }

  // Analytics
  async getDashboardStats(tenantId: string): Promise<{
    totalRevenue: number;
    totalOrders: number;
    totalCustomers: number;
    averageOrderValue: number;
    todayRevenue: number;
    todayOrders: number;
  }> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Total stats
    const [totalStats] = await db
      .select({
        totalRevenue: sql<number>`COALESCE(SUM(${orders.total}::numeric), 0)`,
        totalOrders: sql<number>`COUNT(*)`,
        averageOrderValue: sql<number>`COALESCE(AVG(${orders.total}::numeric), 0)`,
      })
      .from(orders)
      .where(and(eq(orders.tenantId, tenantId), eq(orders.status, 'completed')));

    // Today's stats
    const [todayStats] = await db
      .select({
        todayRevenue: sql<number>`COALESCE(SUM(${orders.total}::numeric), 0)`,
        todayOrders: sql<number>`COUNT(*)`,
      })
      .from(orders)
      .where(
        and(
          eq(orders.tenantId, tenantId),
          eq(orders.status, 'completed'),
          gte(orders.createdAt, today)
        )
      );

    // Total customers
    const [customerStats] = await db
      .select({
        totalCustomers: sql<number>`COUNT(*)`,
      })
      .from(customers)
      .where(eq(customers.tenantId, tenantId));

    return {
      totalRevenue: Number(totalStats?.totalRevenue || 0),
      totalOrders: Number(totalStats?.totalOrders || 0),
      totalCustomers: Number(customerStats?.totalCustomers || 0),
      averageOrderValue: Number(totalStats?.averageOrderValue || 0),
      todayRevenue: Number(todayStats?.todayRevenue || 0),
      todayOrders: Number(todayStats?.todayOrders || 0),
    };
  }
}

export const storage = new DatabaseStorage();