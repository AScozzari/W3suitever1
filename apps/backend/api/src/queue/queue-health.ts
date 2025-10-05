let redisAvailable = false;
let lastCheckTime = 0;
const CHECK_INTERVAL = 30000;

export async function isRedisAvailable(): Promise<boolean> {
  const now = Date.now();
  
  if (now - lastCheckTime < CHECK_INTERVAL) {
    return redisAvailable;
  }

  try {
    const { workflowQueue } = await import('./workflow-queue.js');
    await workflowQueue.getJobCounts();
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
