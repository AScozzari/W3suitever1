import puppeteer, { Browser, Page } from 'puppeteer';
import crypto from 'crypto';
import { db } from '../db/index.js';
import { windtreOffersRaw } from '../db/schema/brand-interface.js';
import { eq } from 'drizzle-orm';

interface ScraperConfig {
  baseUrl: string;
  maxPagesPerRun: number;
  delayBetweenPages: number; // ms
  userAgent: string;
  brandTenantId: string;
}

interface ScrapeResult {
  success: boolean;
  pagesScraped: number;
  errors: string[];
}

export class WindtreScraperService {
  private config: ScraperConfig;
  private browser: Browser | null = null;

  constructor(brandTenantId: string) {
    this.config = {
      baseUrl: 'https://www.windtre.it',
      maxPagesPerRun: 10, // Limit to 10 pages to avoid memory issues
      delayBetweenPages: 2000, // 2 seconds between requests (respectful rate limiting)
      userAgent: 'W3Suite-Scraper/1.0 (+https://w3suite.com/bot)',
      brandTenantId
    };
  }

  /**
   * Calculate SHA256 checksum for a given URL
   */
  private calculateChecksum(url: string): string {
    return crypto.createHash('sha256').update(url).digest('hex');
  }

  /**
   * Initialize Puppeteer browser instance
   */
  private async initBrowser(): Promise<Browser> {
    if (this.browser) {
      return this.browser;
    }

    this.browser = await puppeteer.launch({
      headless: true,
      executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || '/nix/store/zi4f80l169xlmivz8vja8wlphq74qqk0-chromium-125.0.6422.141/bin/chromium',
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--single-process',
        '--disable-gpu'
      ]
    });

    return this.browser;
  }

  /**
   * Close browser instance
   */
  private async closeBrowser(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }

  /**
   * Check if URL should be scraped based on robots.txt rules
   */
  private async checkRobotsTxt(url: string): Promise<boolean> {
    try {
      const robotsUrl = new URL('/robots.txt', this.config.baseUrl).href;
      const response = await fetch(robotsUrl);
      const robotsTxt = await response.text();

      // Simple robots.txt parser - check for Disallow rules
      const lines = robotsTxt.split('\n');
      let isRelevantAgent = false;

      for (const line of lines) {
        const trimmed = line.trim();
        
        if (trimmed.startsWith('User-agent:')) {
          const agent = trimmed.split(':')[1].trim();
          isRelevantAgent = agent === '*' || agent.includes('W3Suite');
        }

        if (isRelevantAgent && trimmed.startsWith('Disallow:')) {
          const disallowedPath = trimmed.split(':')[1].trim();
          if (disallowedPath && url.includes(disallowedPath)) {
            console.log(`URL blocked by robots.txt: ${url}`);
            return false;
          }
        }
      }

      return true;
    } catch (error) {
      console.error('Error checking robots.txt:', error);
      return true; // If robots.txt can't be fetched, proceed with caution
    }
  }

  /**
   * Scrape a single page and save to database
   */
  private async scrapePage(page: Page, url: string): Promise<boolean> {
    try {
      // Check robots.txt
      const allowedByRobots = await this.checkRobotsTxt(url);
      if (!allowedByRobots) {
        console.log(`Skipping ${url} - disallowed by robots.txt`);
        return false;
      }

      // Navigate to page
      await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });

      // Get page title and HTML content (limit to 50KB to avoid memory issues)
      const pageTitle = await page.title();
      const fullHtml = await page.content();
      const MAX_HTML_SIZE = 50000; // 50KB max per page
      const htmlContent = fullHtml.length > MAX_HTML_SIZE ? fullHtml.slice(0, MAX_HTML_SIZE) : fullHtml;

      // Calculate checksum
      const urlChecksum = this.calculateChecksum(url);

      // Check if page already exists and hasn't changed
      const existingPage = await db
        .select()
        .from(windtreOffersRaw)
        .where(eq(windtreOffersRaw.url, url))
        .limit(1);

      if (existingPage.length > 0 && existingPage[0].urlChecksum === urlChecksum) {
        console.log(`Page ${url} hasn't changed, skipping`);
        return false;
      }

      // Upsert page data
      if (existingPage.length > 0) {
        // Update existing
        await db
          .update(windtreOffersRaw)
          .set({
            urlChecksum,
            htmlContent,
            pageTitle,
            updatedAt: new Date()
          })
          .where(eq(windtreOffersRaw.url, url));
      } else {
        // Insert new
        await db.insert(windtreOffersRaw).values({
          url,
          urlChecksum,
          htmlContent,
          pageTitle,
          brandTenantId: this.config.brandTenantId
        });
      }

      console.log(`✅ Scraped: ${url}`);
      return true;
    } catch (error) {
      console.error(`Error scraping ${url}:`, error);
      return false;
    }
  }

  /**
   * Discover offer URLs from sitemap or main pages
   */
  private async discoverOfferUrls(page: Page): Promise<string[]> {
    const urls: string[] = [];

    try {
      // Try to get sitemap first
      const sitemapUrl = `${this.config.baseUrl}/sitemap.xml`;
      await page.goto(sitemapUrl, { waitUntil: 'networkidle2' });
      
      const sitemapContent = await page.content();
      const urlMatches = sitemapContent.match(/<loc>(.*?)<\/loc>/g);
      
      if (urlMatches) {
        urlMatches.forEach(match => {
          const url = match.replace(/<\/?loc>/g, '');
          // Filter for offer-related pages
          if (url.includes('/offerte') || url.includes('/tariffe') || url.includes('/fibra') || url.includes('/mobile')) {
            urls.push(url);
          }
        });
      }
    } catch (error) {
      console.log('Sitemap not available, using manual discovery');
      
      // Fallback: discover from main pages
      const mainPages = [
        `${this.config.baseUrl}/offerte`,
        `${this.config.baseUrl}/offerte-mobile`,
        `${this.config.baseUrl}/offerte-fisso`,
        `${this.config.baseUrl}/fibra`,
        `${this.config.baseUrl}/tariffe-mobile`
      ];

      for (const mainUrl of mainPages) {
        try {
          await page.goto(mainUrl, { waitUntil: 'networkidle2' });
          
          const links = await page.evaluate(() => {
            const anchors = Array.from(document.querySelectorAll('a'));
            return anchors
              .map(a => a.href)
              .filter(href => href && (
                href.includes('/offerte') || 
                href.includes('/tariffe') || 
                href.includes('/fibra') || 
                href.includes('/mobile')
              ));
          });

          urls.push(...links);
        } catch (err) {
          console.error(`Error discovering from ${mainUrl}:`, err);
        }
      }
    }

    // Deduplicate URLs
    return Array.from(new Set(urls));
  }

  /**
   * Main scraping orchestrator
   */
  async scrapeWindtreOffers(): Promise<ScrapeResult> {
    const errors: string[] = [];
    let pagesScraped = 0;

    try {
      console.log('🚀 Starting WindTre scraping...');
      
      const browser = await this.initBrowser();
      const page = await browser.newPage();

      // Set user agent
      await page.setUserAgent(this.config.userAgent);

      // Discover URLs
      console.log('🔍 Discovering offer URLs...');
      const urls = await this.discoverOfferUrls(page);
      console.log(`📄 Found ${urls.length} URLs to scrape`);

      // Limit to maxPagesPerRun
      const urlsToScrape = urls.slice(0, this.config.maxPagesPerRun);

      // Scrape each URL with rate limiting
      for (let i = 0; i < urlsToScrape.length; i++) {
        const url = urlsToScrape[i];
        console.log(`[${i + 1}/${urlsToScrape.length}] Scraping ${url}`);

        const success = await this.scrapePage(page, url);
        if (success) {
          pagesScraped++;
        }

        // Rate limiting: delay between requests
        if (i < urlsToScrape.length - 1) {
          await new Promise(resolve => setTimeout(resolve, this.config.delayBetweenPages));
        }
      }

      await this.closeBrowser();

      console.log(`✅ Scraping complete: ${pagesScraped} pages scraped`);
      return { success: true, pagesScraped, errors };

    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      errors.push(errorMsg);
      console.error('❌ Scraping failed:', error);
      
      await this.closeBrowser();
      
      return { success: false, pagesScraped, errors };
    }
  }
}
