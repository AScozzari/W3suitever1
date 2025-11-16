/**
 * 📦 BRAND TEMPLATE STORAGE SERVICE
 * Hybrid Minimal Architecture: JSON files for templates (Git-versioned)
 * Handles CRUD operations for campaigns, pipelines, and funnels
 */

import fs from 'fs/promises';
import path from 'path';
import { nanoid } from 'nanoid';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

// Base directory for template storage (Git-tracked)
const TEMPLATES_DIR = path.join(process.cwd(), 'brand-templates');

// Template type paths
const TEMPLATE_PATHS = {
  campaign: path.join(TEMPLATES_DIR, 'campaigns'),
  pipeline: path.join(TEMPLATES_DIR, 'pipelines'),
  funnel: path.join(TEMPLATES_DIR, 'funnels')
} as const;

export type TemplateType = keyof typeof TEMPLATE_PATHS;
export type TemplateStatus = 'active' | 'draft' | 'archived';

// Base template interface
export interface BrandTemplate {
  id: string;
  type: TemplateType;
  code: string;
  name: string;
  description?: string;
  status: TemplateStatus;
  isActive: boolean;
  version: string;
  linkedItems?: Array<{ id: string; name: string; type: TemplateType }>;
  metadata?: Record<string, any>;
  templateData: Record<string, any>; // Wizard form data
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  updatedBy?: string;
}

class TemplateStorageService {
  /**
   * Initialize directories if they don't exist and setup Git
   */
  async initialize(): Promise<void> {
    for (const dir of Object.values(TEMPLATE_PATHS)) {
      try {
        await fs.mkdir(dir, { recursive: true });
      } catch (error) {
        console.error(`Error creating directory ${dir}:`, error);
      }
    }
    
    // Initialize Git repository if not already initialized
    await this.initGitRepo();
  }

  /**
   * Initialize Git repository
   */
  private async initGitRepo(): Promise<void> {
    try {
      const gitDir = path.join(TEMPLATES_DIR, '.git');
      
      try {
        await fs.access(gitDir);
        console.log('✅ [GIT] Repository already initialized');
        return;
      } catch {
        // Git not initialized, create it
        await execAsync('git init', { cwd: TEMPLATES_DIR });
        await execAsync('git config user.name "Brand Master Catalog"', { cwd: TEMPLATES_DIR });
        await execAsync('git config user.email "brand-catalog@w3suite.com"', { cwd: TEMPLATES_DIR });
        
        // Create initial .gitignore
        const gitignore = 'node_modules/\n.DS_Store\n';
        await fs.writeFile(path.join(TEMPLATES_DIR, '.gitignore'), gitignore, 'utf-8');
        
        console.log('✅ [GIT] Repository initialized');
      }
    } catch (error) {
      console.error('[GIT] Failed to initialize repository:', error);
      // Don't throw - Git is optional enhancement
    }
  }

  /**
   * Commit changes to Git with metadata
   */
  private async gitCommit(
    message: string,
    author: string = 'system'
  ): Promise<void> {
    try {
      // Stage all changes in templates directory
      await execAsync('git add .', { cwd: TEMPLATES_DIR });
      
      // Commit with author metadata
      const commitMsg = `${message}\n\nAuthor: ${author}\nTimestamp: ${new Date().toISOString()}`;
      await execAsync(`git commit -m "${commitMsg.replace(/"/g, '\\"')}"`, { cwd: TEMPLATES_DIR });
      
      console.log(`✅ [GIT] Committed: ${message}`);
    } catch (error: any) {
      // Ignore "nothing to commit" errors
      if (!error.message?.includes('nothing to commit')) {
        console.error('[GIT] Commit failed:', error.message);
      }
    }
  }

  /**
   * Get all templates of a specific type
   */
  async getTemplates(type: TemplateType): Promise<BrandTemplate[]> {
    const dir = TEMPLATE_PATHS[type];
    
    try {
      const files = await fs.readdir(dir);
      const jsonFiles = files.filter(f => f.endsWith('.json'));
      
      const templates = await Promise.all(
        jsonFiles.map(async (file) => {
          const filePath = path.join(dir, file);
          const content = await fs.readFile(filePath, 'utf-8');
          return JSON.parse(content) as BrandTemplate;
        })
      );
      
      // Sort by updatedAt descending
      return templates.sort((a, b) => 
        new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      );
    } catch (error: any) {
      if (error.code === 'ENOENT') {
        // Directory doesn't exist yet, return empty array
        return [];
      }
      throw error;
    }
  }

  /**
   * Get all templates across all types
   */
  async getAllTemplates(): Promise<BrandTemplate[]> {
    const [campaigns, pipelines, funnels] = await Promise.all([
      this.getTemplates('campaign'),
      this.getTemplates('pipeline'),
      this.getTemplates('funnel')
    ]);
    
    return [...campaigns, ...pipelines, ...funnels].sort((a, b) =>
      new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    );
  }

  /**
   * Get a single template by ID and type
   */
  async getTemplate(type: TemplateType, id: string): Promise<BrandTemplate | null> {
    const filePath = path.join(TEMPLATE_PATHS[type], `${id}.json`);
    
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      return JSON.parse(content) as BrandTemplate;
    } catch (error: any) {
      if (error.code === 'ENOENT') {
        return null;
      }
      throw error;
    }
  }

  /**
   * Create a new template
   */
  async createTemplate(
    type: TemplateType,
    data: Omit<BrandTemplate, 'id' | 'type' | 'createdAt' | 'updatedAt'>
  ): Promise<BrandTemplate> {
    const id = nanoid(12);
    const now = new Date().toISOString();
    
    const template: BrandTemplate = {
      id,
      type,
      ...data,
      createdAt: now,
      updatedAt: now
    };
    
    const filePath = path.join(TEMPLATE_PATHS[type], `${id}.json`);
    await fs.writeFile(filePath, JSON.stringify(template, null, 2), 'utf-8');
    
    // Git commit
    await this.gitCommit(
      `Create ${type} template: ${data.name} (${id})`,
      data.createdBy
    );
    
    console.log(`✅ [TEMPLATE-STORAGE] Created ${type} template: ${id}`);
    return template;
  }

  /**
   * Update an existing template
   */
  async updateTemplate(
    type: TemplateType,
    id: string,
    updates: Partial<Omit<BrandTemplate, 'id' | 'type' | 'createdAt' | 'createdBy'>>
  ): Promise<BrandTemplate | null> {
    const existing = await this.getTemplate(type, id);
    
    if (!existing) {
      return null;
    }
    
    const updated: BrandTemplate = {
      ...existing,
      ...updates,
      id: existing.id, // Ensure id doesn't change
      type: existing.type, // Ensure type doesn't change
      createdAt: existing.createdAt, // Preserve creation date
      createdBy: existing.createdBy, // Preserve creator
      updatedAt: new Date().toISOString()
    };
    
    const filePath = path.join(TEMPLATE_PATHS[type], `${id}.json`);
    await fs.writeFile(filePath, JSON.stringify(updated, null, 2), 'utf-8');
    
    // Git commit
    await this.gitCommit(
      `Update ${type} template: ${updated.name} (${id})`,
      updates.updatedBy || 'system'
    );
    
    console.log(`✅ [TEMPLATE-STORAGE] Updated ${type} template: ${id}`);
    return updated;
  }

  /**
   * Delete a template
   */
  async deleteTemplate(type: TemplateType, id: string): Promise<boolean> {
    const filePath = path.join(TEMPLATE_PATHS[type], `${id}.json`);
    
    // Get template info before deleting for commit message
    const template = await this.getTemplate(type, id);
    const templateName = template?.name || id;
    
    try {
      await fs.unlink(filePath);
      
      // Git commit
      await this.gitCommit(
        `Delete ${type} template: ${templateName} (${id})`,
        'system'
      );
      
      console.log(`✅ [TEMPLATE-STORAGE] Deleted ${type} template: ${id}`);
      return true;
    } catch (error: any) {
      if (error.code === 'ENOENT') {
        return false;
      }
      throw error;
    }
  }

  /**
   * Toggle template active state
   */
  async toggleTemplateActive(type: TemplateType, id: string): Promise<BrandTemplate | null> {
    const existing = await this.getTemplate(type, id);
    
    if (!existing) {
      return null;
    }
    
    return this.updateTemplate(type, id, {
      isActive: !existing.isActive,
      updatedBy: 'system' // In production, use actual user
    });
  }
}

// Export singleton instance
export const templateStorageService = new TemplateStorageService();
