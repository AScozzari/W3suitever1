let redisAvailable = false;
let lastCheckTime = 0;
const CHECK_INTERVAL = 30000;

export async function isRedisAvailable(): Promise<boolean> {
  const REDIS_URL = process.env.REDIS_URL || process.env.UPSTASH_REDIS_URL;
  
  if (!REDIS_URL) {
    redisAvailable = false;
    return false;
  }

  const now = Date.now();
  
  if (now - lastCheckTime < CHECK_INTERVAL) {
    return redisAvailable;
  }

  try {
    const { getWorkflowQueue } = await import('./workflow-queue.js');
    const queue = getWorkflowQueue();
    await queue.getJobCounts();
    redisAvailable = true;
    lastCheckTime = now;
    return true;
  } catch (error) {
    redisAvailable = false;
    lastCheckTime = now;
    return false;
  }
}

export function getRedisStatus(): boolean {
  return redisAvailable;
}
