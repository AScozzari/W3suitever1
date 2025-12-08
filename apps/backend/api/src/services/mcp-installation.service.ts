/**
 * 📦 MCP INSTALLATION SERVICE
 * Handles installation of MCP servers from npm packages, pip packages, and custom sources
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs/promises';
import * as path from 'path';
import { logger } from '../core/logger';

const execAsync = promisify(exec);

export interface InstallationProgress {
  step: 'downloading' | 'installing' | 'verifying' | 'registering' | 'discovering' | 'completed' | 'failed';
  message: string;
  progress: number; // 0-100
  error?: string;
}

export interface InstallPackageOptions {
  packageName: string; // e.g., '@modelcontextprotocol/server-slack'
  packageManager: 'npm' | 'pip';
  version?: string;
  onProgress?: (progress: InstallationProgress) => void;
}

export interface InstallFromGitHubOptions {
  repoUrl: string; // e.g., 'https://github.com/user/custom-mcp-server'
  targetDir: string; // Where to clone, e.g., '/mcp-servers/custom-server'
  onProgress?: (progress: InstallationProgress) => void;
}

export interface InstallFromZipOptions {
  zipBuffer: Buffer;
  targetDir: string;
  onProgress?: (progress: InstallationProgress) => void;
}

export interface InstallFromCodeOptions {
  code: string;
  fileName: string;
  targetDir: string;
  onProgress?: (progress: InstallationProgress) => void;
}

export interface InstallationResult {
  success: boolean;
  installLocation: string;
  installMethod: string;
  error?: string;
}

export class MCPInstallationService {
  private readonly MCP_SERVERS_DIR = path.join(process.cwd(), 'mcp-servers');
  private readonly NPM_PACKAGES_DIR = path.join(this.MCP_SERVERS_DIR, 'npm-packages');
  private readonly PIP_PACKAGES_DIR = path.join(this.MCP_SERVERS_DIR, 'pip-packages');

  constructor() {
    // Ensure mcp-servers directory exists
    this.ensureMCPServersDirectory().catch((err) => {
      logger.error('❌ [MCP Installation] Failed to create mcp-servers directory', {
        error: err instanceof Error ? err.message : String(err)
      });
    });
  }

  /**
   * Install MCP server from npm/pip package
   */
  async installFromPackage(options: InstallPackageOptions): Promise<InstallationResult> {
    const { packageName, packageManager, version, onProgress } = options;

    try {
      logger.info('📦 [MCP Installation] Installing package', {
        packageName,
        packageManager,
        version
      });

      // Step 1: Downloading
      onProgress?.({
        step: 'downloading',
        message: `Downloading ${packageName}...`,
        progress: 10
      });

      // Determine isolated installation directory
      const packageDir = packageManager === 'npm' ? this.NPM_PACKAGES_DIR : this.PIP_PACKAGES_DIR;
      await fs.mkdir(packageDir, { recursive: true });

      // Build install command (isolated, no --save)
      const versionSpec = version ? `@${version}` : '';
      let installCommand: string;
      let installLocation: string;

      if (packageManager === 'npm') {
        // Install to isolated npm-packages directory without modifying package.json
        installCommand = `npm install ${packageName}${versionSpec} --prefix ${packageDir} --no-save`;
        installLocation = path.join(packageDir, 'node_modules', packageName);
      } else {
        // Install to isolated pip-packages directory with target flag
        installCommand = `pip install ${packageName}${versionSpec} --target ${packageDir}`;
        installLocation = path.join(packageDir, packageName);
      }

      // Step 2: Installing
      onProgress?.({
        step: 'installing',
        message: `Installing package via ${packageManager} (isolated)...`,
        progress: 30
      });

      const { stdout, stderr } = await execAsync(installCommand, {
        timeout: 300000 // 5 minutes timeout
      });

      logger.info('✅ [MCP Installation] Package installed in isolated directory', {
        packageName,
        installLocation,
        stdout: stdout.substring(0, 500),
        stderr: stderr ? stderr.substring(0, 500) : ''
      });

      // Step 3: Verifying
      onProgress?.({
        step: 'verifying',
        message: 'Verifying installation...',
        progress: 70
      });

      // Verify installation
      const isInstalled = await this.verifyIsolatedInstallation(installLocation);
      if (!isInstalled) {
        throw new Error(`Package ${packageName} installation verification failed`);
      }

      // Step 4: Completed
      onProgress?.({
        step: 'completed',
        message: 'Installation completed successfully',
        progress: 100
      });

      return {
        success: true,
        installLocation,
        installMethod: installCommand
      };

    } catch (error) {
      logger.error('❌ [MCP Installation] Package installation failed', {
        packageName,
        error: error instanceof Error ? error.message : String(error)
      });

      onProgress?.({
        step: 'failed',
        message: 'Installation failed',
        progress: 0,
        error: error instanceof Error ? error.message : String(error)
      });

      return {
        success: false,
        installLocation: '',
        installMethod: '',
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  /**
   * Install MCP server from GitHub repository
   */
  async installFromGitHub(options: InstallFromGitHubOptions): Promise<InstallationResult> {
    const { repoUrl, targetDir, onProgress } = options;

    try {
      logger.info('📦 [MCP Installation] Cloning from GitHub', {
        repoUrl,
        targetDir
      });

      // Step 1: Downloading
      onProgress?.({
        step: 'downloading',
        message: 'Cloning repository...',
        progress: 20
      });

      // Ensure target directory doesn't exist
      const fullPath = path.join(this.MCP_SERVERS_DIR, targetDir);
      await this.ensureDirectoryDoesNotExist(fullPath);

      // Clone repository
      const cloneCommand = `git clone ${repoUrl} ${fullPath}`;
      const { stdout, stderr } = await execAsync(cloneCommand, {
        timeout: 300000 // 5 minutes timeout
      });

      logger.info('✅ [MCP Installation] Repository cloned', {
        repoUrl,
        stdout: stdout.substring(0, 500),
        stderr: stderr ? stderr.substring(0, 500) : ''
      });

      // Step 2: Installing dependencies
      onProgress?.({
        step: 'installing',
        message: 'Installing dependencies...',
        progress: 50
      });

      // Check for package.json or requirements.txt
      const hasPackageJson = await this.fileExists(path.join(fullPath, 'package.json'));
      const hasRequirementsTxt = await this.fileExists(path.join(fullPath, 'requirements.txt'));

      if (hasPackageJson) {
        await execAsync('npm install', { cwd: fullPath, timeout: 300000 });
      } else if (hasRequirementsTxt) {
        await execAsync('pip install -r requirements.txt', { cwd: fullPath, timeout: 300000 });
      }

      // Step 3: Completed
      onProgress?.({
        step: 'completed',
        message: 'GitHub installation completed',
        progress: 100
      });

      return {
        success: true,
        installLocation: fullPath,
        installMethod: cloneCommand
      };

    } catch (error) {
      logger.error('❌ [MCP Installation] GitHub installation failed', {
        repoUrl,
        error: error instanceof Error ? error.message : String(error)
      });

      onProgress?.({
        step: 'failed',
        message: 'GitHub installation failed',
        progress: 0,
        error: error instanceof Error ? error.message : String(error)
      });

      return {
        success: false,
        installLocation: '',
        installMethod: '',
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  /**
   * Install MCP server from ZIP upload
   */
  async installFromZip(options: InstallFromZipOptions): Promise<InstallationResult> {
    const { zipBuffer, targetDir, onProgress } = options;

    try {
      logger.info('📦 [MCP Installation] Installing from ZIP', {
        targetDir,
        zipSize: zipBuffer.length
      });

      // Step 1: Extracting
      onProgress?.({
        step: 'downloading',
        message: 'Extracting ZIP file...',
        progress: 30
      });

      const fullPath = path.join(this.MCP_SERVERS_DIR, targetDir);
      await this.ensureDirectoryDoesNotExist(fullPath);
      await fs.mkdir(fullPath, { recursive: true });

      // Extract ZIP (using unzipper or similar - this is a placeholder)
      // In production, use a proper ZIP extraction library like 'unzipper'
      const tempZipPath = path.join(fullPath, 'upload.zip');
      await fs.writeFile(tempZipPath, zipBuffer);

      // Extract using system unzip command
      await execAsync(`unzip -q ${tempZipPath} -d ${fullPath}`, {
        timeout: 120000
      });

      // Remove temp ZIP file
      await fs.unlink(tempZipPath);

      // Step 2: Installing dependencies
      onProgress?.({
        step: 'installing',
        message: 'Installing dependencies...',
        progress: 60
      });

      // Check for package.json or requirements.txt
      const hasPackageJson = await this.fileExists(path.join(fullPath, 'package.json'));
      const hasRequirementsTxt = await this.fileExists(path.join(fullPath, 'requirements.txt'));

      if (hasPackageJson) {
        await execAsync('npm install', { cwd: fullPath, timeout: 300000 });
      } else if (hasRequirementsTxt) {
        await execAsync('pip install -r requirements.txt', { cwd: fullPath, timeout: 300000 });
      }

      // Step 3: Completed
      onProgress?.({
        step: 'completed',
        message: 'ZIP installation completed',
        progress: 100
      });

      return {
        success: true,
        installLocation: fullPath,
        installMethod: 'zip_upload'
      };

    } catch (error) {
      logger.error('❌ [MCP Installation] ZIP installation failed', {
        error: error instanceof Error ? error.message : String(error)
      });

      onProgress?.({
        step: 'failed',
        message: 'ZIP installation failed',
        progress: 0,
        error: error instanceof Error ? error.message : String(error)
      });

      return {
        success: false,
        installLocation: '',
        installMethod: '',
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  /**
   * Install MCP server from pasted code
   */
  async installFromCode(options: InstallFromCodeOptions): Promise<InstallationResult> {
    const { code, fileName, targetDir, onProgress } = options;

    try {
      logger.info('📦 [MCP Installation] Installing from code paste', {
        fileName,
        targetDir,
        codeLength: code.length
      });

      // Step 1: Creating files
      onProgress?.({
        step: 'downloading',
        message: 'Creating server files...',
        progress: 40
      });

      const fullPath = path.join(this.MCP_SERVERS_DIR, targetDir);
      await this.ensureDirectoryDoesNotExist(fullPath);
      await fs.mkdir(fullPath, { recursive: true });

      // Write code to file
      const filePath = path.join(fullPath, fileName);
      await fs.writeFile(filePath, code, 'utf-8');

      logger.info('✅ [MCP Installation] Code saved', {
        filePath
      });

      // Step 2: Completed
      onProgress?.({
        step: 'completed',
        message: 'Code installation completed',
        progress: 100
      });

      return {
        success: true,
        installLocation: fullPath,
        installMethod: 'code_paste'
      };

    } catch (error) {
      logger.error('❌ [MCP Installation] Code installation failed', {
        error: error instanceof Error ? error.message : String(error)
      });

      onProgress?.({
        step: 'failed',
        message: 'Code installation failed',
        progress: 0,
        error: error instanceof Error ? error.message : String(error)
      });

      return {
        success: false,
        installLocation: '',
        installMethod: '',
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  /**
   * Ensure mcp-servers directory exists
   */
  private async ensureMCPServersDirectory(): Promise<void> {
    try {
      await fs.mkdir(this.MCP_SERVERS_DIR, { recursive: true });
    } catch (error) {
      // Ignore if already exists
    }
  }

  /**
   * Ensure directory does not exist (delete if exists)
   */
  private async ensureDirectoryDoesNotExist(dirPath: string): Promise<void> {
    try {
      await fs.rm(dirPath, { recursive: true, force: true });
    } catch (error) {
      // Ignore if doesn't exist
    }
  }

  /**
   * Check if file exists
   */
  private async fileExists(filePath: string): Promise<boolean> {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Verify isolated installation
   * For npm: check if node_modules/<package> exists
   * For pip: check if target directory contains .dist-info folders (robust for normalized names)
   */
  private async verifyIsolatedInstallation(installLocation: string): Promise<boolean> {
    try {
      // Check if path exists
      await fs.access(installLocation);
      
      // For pip installations, verify by checking parent directory for .dist-info
      if (installLocation.includes(this.PIP_PACKAGES_DIR)) {
        const files = await fs.readdir(this.PIP_PACKAGES_DIR);
        const hasDistInfo = files.some(f => f.endsWith('.dist-info'));
        return hasDistInfo;
      }
      
      // For npm installations, path existence is sufficient
      return true;
    } catch {
      return false;
    }
  }
}

// Singleton export
export const mcpInstallationService = new MCPInstallationService();
