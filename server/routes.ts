import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { insertProductSchema, insertCustomerSchema, insertOrderSchema, insertOrderItemSchema } from "../shared/schema";
import * as bcrypt from "bcryptjs";
import * as jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "w3suite-secret-key-2025";

export async function registerRoutes(app: Express): Promise<Server> {
  // Local auth for username/password
  app.post("/api/auth/login", async (req: Request, res: Response) => {
    try {
      const { username, password } = req.body;
      
      if (!username || !password) {
        return res.status(400).json({ message: "Username e password richiesti" });
      }
      
      const user = await storage.getUserByUsername(username);
      
      if (!user || !user.password) {
        return res.status(401).json({ message: "Credenziali non valide" });
      }
      
      const validPassword = await bcrypt.compare(password, user.password);
      
      if (!validPassword) {
        return res.status(401).json({ message: "Credenziali non valide" });
      }
      
      // Create JWT token
      const token = jwt.sign(
        { id: user.id, email: user.email, tenantId: user.tenantId },
        JWT_SECRET,
        { expiresIn: "7d" }
      );
      
      // Set session data for compatibility
      (req as any).session = (req as any).session || {};
      (req as any).session.user = user;
      (req as any).session.token = token;
      
      res.json({ user, token });
    } catch (error) {
      console.error("Login error:", error);
      res.status(500).json({ message: "Errore durante il login" });
    }
  });
  
  // Logout
  app.post("/api/auth/logout", (req: Request, res: Response) => {
    res.clearCookie("auth_token");
    res.json({ message: "Logout effettuato" });
  });
  
  // Auth middleware
  await setupAuth(app);

  // Auth routes
  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Dashboard stats
  app.get("/api/dashboard/stats", isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
      if (!user?.tenantId) {
        return res.status(400).json({ message: "No tenant associated" });
      }
      
      const stats = await storage.getDashboardStats(user.tenantId);
      res.json(stats);
    } catch (error) {
      console.error("Error fetching dashboard stats:", error);
      res.status(500).json({ message: "Failed to fetch dashboard stats" });
    }
  });

  // Products routes
  app.get("/api/products", isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
      if (!user?.tenantId) {
        return res.status(400).json({ message: "No tenant associated" });
      }
      
      const products = await storage.getProducts(user.tenantId);
      res.json(products);
    } catch (error) {
      console.error("Error fetching products:", error);
      res.status(500).json({ message: "Failed to fetch products" });
    }
  });

  app.post("/api/products", isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
      if (!user?.tenantId) {
        return res.status(400).json({ message: "No tenant associated" });
      }
      
      const validatedData = insertProductSchema.parse(req.body);
      const product = await storage.createProduct({
        ...validatedData,
        tenantId: user.tenantId,
      });
      res.json(product);
    } catch (error) {
      console.error("Error creating product:", error);
      res.status(500).json({ message: "Failed to create product" });
    }
  });

  // Customers routes
  app.get("/api/customers", isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
      if (!user?.tenantId) {
        return res.status(400).json({ message: "No tenant associated" });
      }
      
      const customers = await storage.getCustomers(user.tenantId);
      res.json(customers);
    } catch (error) {
      console.error("Error fetching customers:", error);
      res.status(500).json({ message: "Failed to fetch customers" });
    }
  });

  app.post("/api/customers", isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
      if (!user?.tenantId) {
        return res.status(400).json({ message: "No tenant associated" });
      }
      
      const validatedData = insertCustomerSchema.parse(req.body);
      const customer = await storage.createCustomer({
        ...validatedData,
        tenantId: user.tenantId,
      });
      res.json(customer);
    } catch (error) {
      console.error("Error creating customer:", error);
      res.status(500).json({ message: "Failed to create customer" });
    }
  });

  // Orders routes
  app.get("/api/orders", isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
      if (!user?.tenantId) {
        return res.status(400).json({ message: "No tenant associated" });
      }
      
      const orders = await storage.getOrders(user.tenantId);
      res.json(orders);
    } catch (error) {
      console.error("Error fetching orders:", error);
      res.status(500).json({ message: "Failed to fetch orders" });
    }
  });

  app.post("/api/orders", isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
      if (!user?.tenantId) {
        return res.status(400).json({ message: "No tenant associated" });
      }
      
      const { items, ...orderData } = req.body;
      const validatedOrder = insertOrderSchema.parse(orderData);
      
      const order = await storage.createOrder({
        ...validatedOrder,
        tenantId: user.tenantId,
        userId: user.id,
        orderNumber: `ORD-${Date.now()}`,
      });
      
      // Create order items
      if (items && Array.isArray(items)) {
        for (const item of items) {
          await storage.createOrderItem({
            ...item,
            orderId: order.id,
          });
        }
      }
      
      res.json(order);
    } catch (error) {
      console.error("Error creating order:", error);
      res.status(500).json({ message: "Failed to create order" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}