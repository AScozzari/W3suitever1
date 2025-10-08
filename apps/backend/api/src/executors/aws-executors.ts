import { 
  S3Client, 
  PutObjectCommand, 
  GetObjectCommand, 
  DeleteObjectCommand, 
  ListObjectsV2Command 
} from '@aws-sdk/client-s3';
import { 
  SNSClient, 
  PublishCommand, 
  CreateTopicCommand 
} from '@aws-sdk/client-sns';
import { 
  SQSClient, 
  SendMessageCommand, 
  ReceiveMessageCommand 
} from '@aws-sdk/client-sqs';
import { 
  LambdaClient, 
  InvokeCommand 
} from '@aws-sdk/client-lambda';
import { 
  DynamoDBClient, 
  PutItemCommand 
} from '@aws-sdk/client-dynamodb';
import { AWSCredentialsService } from '../services/aws-credentials-service';
import { logger } from '../core/logger';

/**
 * AWS Services MCP Executors
 * 
 * 11 action executors for AWS integration:
 * - S3: Upload, Download, Delete, List (4)
 * - SNS: Publish, Create Topic (2)
 * - SQS: Send Message, Receive Message (2)
 * - Lambda: Invoke, Invoke Async (2)
 * - DynamoDB: Put Item (1)
 */

// ==================== S3 EXECUTORS ====================

export async function executeS3Upload(params: {
  serverId: string;
  tenantId: string;
  config: {
    bucket: string;
    key: string;
    body: string; // Base64 encoded
    contentType?: string;
    acl?: string;
  };
}): Promise<{ etag: string; location: string }> {
  const { serverId, tenantId, config } = params;

  try {
    const credentials = await AWSCredentialsService.getCredentials({
      serverId,
      tenantId
    });

    const s3Client = new S3Client({
      region: credentials.region,
      credentials: {
        accessKeyId: credentials.accessKeyId,
        secretAccessKey: credentials.secretAccessKey
      }
    });

    const command = new PutObjectCommand({
      Bucket: config.bucket,
      Key: config.key,
      Body: Buffer.from(config.body, 'base64'),
      ContentType: config.contentType || 'application/octet-stream',
      ...(config.acl ? { ACL: config.acl as any } : {})
    });

    const response = await s3Client.send(command);

    logger.info('✅ [S3 Upload] File uploaded successfully', {
      bucket: config.bucket,
      key: config.key,
      etag: response.ETag
    });

    return {
      etag: response.ETag || '',
      location: `https://${config.bucket}.s3.${credentials.region}.amazonaws.com/${config.key}`
    };

  } catch (error) {
    logger.error('❌ [S3 Upload] Failed', {
      error: error instanceof Error ? error.message : String(error),
      bucket: config.bucket,
      key: config.key
    });
    throw error;
  }
}

export async function executeS3Download(params: {
  serverId: string;
  tenantId: string;
  config: {
    bucket: string;
    key: string;
  };
}): Promise<{ body: string; contentType: string }> {
  const { serverId, tenantId, config } = params;

  try {
    const credentials = await AWSCredentialsService.getCredentials({
      serverId,
      tenantId
    });

    const s3Client = new S3Client({
      region: credentials.region,
      credentials: {
        accessKeyId: credentials.accessKeyId,
        secretAccessKey: credentials.secretAccessKey
      }
    });

    const command = new GetObjectCommand({
      Bucket: config.bucket,
      Key: config.key
    });

    const response = await s3Client.send(command);
    const bodyBytes = await response.Body?.transformToByteArray();
    const base64Body = Buffer.from(bodyBytes || []).toString('base64');

    return {
      body: base64Body,
      contentType: response.ContentType || 'application/octet-stream'
    };

  } catch (error) {
    logger.error('❌ [S3 Download] Failed', {
      error: error instanceof Error ? error.message : String(error),
      bucket: config.bucket,
      key: config.key
    });
    throw error;
  }
}

export async function executeS3Delete(params: {
  serverId: string;
  tenantId: string;
  config: {
    bucket: string;
    key: string;
  };
}): Promise<{ success: boolean }> {
  const { serverId, tenantId, config } = params;

  try {
    const credentials = await AWSCredentialsService.getCredentials({
      serverId,
      tenantId
    });

    const s3Client = new S3Client({
      region: credentials.region,
      credentials: {
        accessKeyId: credentials.accessKeyId,
        secretAccessKey: credentials.secretAccessKey
      }
    });

    const command = new DeleteObjectCommand({
      Bucket: config.bucket,
      Key: config.key
    });

    await s3Client.send(command);

    logger.info('✅ [S3 Delete] File deleted successfully', {
      bucket: config.bucket,
      key: config.key
    });

    return { success: true };

  } catch (error) {
    logger.error('❌ [S3 Delete] Failed', {
      error: error instanceof Error ? error.message : String(error),
      bucket: config.bucket,
      key: config.key
    });
    throw error;
  }
}

export async function executeS3ListObjects(params: {
  serverId: string;
  tenantId: string;
  config: {
    bucket: string;
    prefix?: string;
    maxKeys?: number;
  };
}): Promise<{ objects: any[]; count: number }> {
  const { serverId, tenantId, config } = params;

  try {
    const credentials = await AWSCredentialsService.getCredentials({
      serverId,
      tenantId
    });

    const s3Client = new S3Client({
      region: credentials.region,
      credentials: {
        accessKeyId: credentials.accessKeyId,
        secretAccessKey: credentials.secretAccessKey
      }
    });

    const command = new ListObjectsV2Command({
      Bucket: config.bucket,
      Prefix: config.prefix,
      MaxKeys: config.maxKeys || 1000
    });

    const response = await s3Client.send(command);

    return {
      objects: response.Contents || [],
      count: response.Contents?.length || 0
    };

  } catch (error) {
    logger.error('❌ [S3 List Objects] Failed', {
      error: error instanceof Error ? error.message : String(error),
      bucket: config.bucket
    });
    throw error;
  }
}

// ==================== SNS EXECUTORS ====================

export async function executeSNSPublish(params: {
  serverId: string;
  tenantId: string;
  config: {
    topicArn: string;
    message: string;
    subject?: string;
    messageAttributes?: Record<string, { DataType: string; StringValue: string }>;
  };
}): Promise<{ messageId: string }> {
  const { serverId, tenantId, config } = params;

  try {
    const credentials = await AWSCredentialsService.getCredentials({
      serverId,
      tenantId
    });

    const snsClient = new SNSClient({
      region: credentials.region,
      credentials: {
        accessKeyId: credentials.accessKeyId,
        secretAccessKey: credentials.secretAccessKey
      }
    });

    const command = new PublishCommand({
      TopicArn: config.topicArn,
      Message: config.message,
      Subject: config.subject,
      MessageAttributes: config.messageAttributes
    });

    const response = await snsClient.send(command);

    logger.info('✅ [SNS Publish] Message published', {
      topicArn: config.topicArn,
      messageId: response.MessageId
    });

    return { messageId: response.MessageId || '' };

  } catch (error) {
    logger.error('❌ [SNS Publish] Failed', {
      error: error instanceof Error ? error.message : String(error),
      topicArn: config.topicArn
    });
    throw error;
  }
}

export async function executeSNSCreateTopic(params: {
  serverId: string;
  tenantId: string;
  config: {
    name: string;
    displayName?: string;
  };
}): Promise<{ topicArn: string }> {
  const { serverId, tenantId, config } = params;

  try {
    const credentials = await AWSCredentialsService.getCredentials({
      serverId,
      tenantId
    });

    const snsClient = new SNSClient({
      region: credentials.region,
      credentials: {
        accessKeyId: credentials.accessKeyId,
        secretAccessKey: credentials.secretAccessKey
      }
    });

    const command = new CreateTopicCommand({
      Name: config.name,
      Attributes: config.displayName ? { DisplayName: config.displayName } : {}
    });

    const response = await snsClient.send(command);

    return { topicArn: response.TopicArn || '' };

  } catch (error) {
    logger.error('❌ [SNS Create Topic] Failed', {
      error: error instanceof Error ? error.message : String(error),
      name: config.name
    });
    throw error;
  }
}

// ==================== SQS EXECUTORS ====================

export async function executeSQSSendMessage(params: {
  serverId: string;
  tenantId: string;
  config: {
    queueUrl: string;
    messageBody: string;
    delaySeconds?: number;
    messageAttributes?: Record<string, { DataType: string; StringValue: string }>;
  };
}): Promise<{ messageId: string }> {
  const { serverId, tenantId, config } = params;

  try {
    const credentials = await AWSCredentialsService.getCredentials({
      serverId,
      tenantId
    });

    const sqsClient = new SQSClient({
      region: credentials.region,
      credentials: {
        accessKeyId: credentials.accessKeyId,
        secretAccessKey: credentials.secretAccessKey
      }
    });

    const command = new SendMessageCommand({
      QueueUrl: config.queueUrl,
      MessageBody: config.messageBody,
      DelaySeconds: config.delaySeconds,
      MessageAttributes: config.messageAttributes
    });

    const response = await sqsClient.send(command);

    return { messageId: response.MessageId || '' };

  } catch (error) {
    logger.error('❌ [SQS Send Message] Failed', {
      error: error instanceof Error ? error.message : String(error),
      queueUrl: config.queueUrl
    });
    throw error;
  }
}

export async function executeSQSReceiveMessage(params: {
  serverId: string;
  tenantId: string;
  config: {
    queueUrl: string;
    maxMessages?: number;
    waitTimeSeconds?: number;
  };
}): Promise<{ messages: any[] }> {
  const { serverId, tenantId, config } = params;

  try {
    const credentials = await AWSCredentialsService.getCredentials({
      serverId,
      tenantId
    });

    const sqsClient = new SQSClient({
      region: credentials.region,
      credentials: {
        accessKeyId: credentials.accessKeyId,
        secretAccessKey: credentials.secretAccessKey
      }
    });

    const command = new ReceiveMessageCommand({
      QueueUrl: config.queueUrl,
      MaxNumberOfMessages: config.maxMessages || 1,
      WaitTimeSeconds: config.waitTimeSeconds || 0
    });

    const response = await sqsClient.send(command);

    return { messages: response.Messages || [] };

  } catch (error) {
    logger.error('❌ [SQS Receive Message] Failed', {
      error: error instanceof Error ? error.message : String(error),
      queueUrl: config.queueUrl
    });
    throw error;
  }
}

// ==================== LAMBDA EXECUTORS ====================

export async function executeLambdaInvoke(params: {
  serverId: string;
  tenantId: string;
  config: {
    functionName: string;
    payload: any;
  };
}): Promise<{ response: any; statusCode: number }> {
  const { serverId, tenantId, config } = params;

  try {
    const credentials = await AWSCredentialsService.getCredentials({
      serverId,
      tenantId
    });

    const lambdaClient = new LambdaClient({
      region: credentials.region,
      credentials: {
        accessKeyId: credentials.accessKeyId,
        secretAccessKey: credentials.secretAccessKey
      }
    });

    const command = new InvokeCommand({
      FunctionName: config.functionName,
      Payload: JSON.stringify(config.payload),
      InvocationType: 'RequestResponse'
    });

    const response = await lambdaClient.send(command);
    const payload = response.Payload ? JSON.parse(Buffer.from(response.Payload).toString()) : {};

    return {
      response: payload,
      statusCode: response.StatusCode || 200
    };

  } catch (error) {
    logger.error('❌ [Lambda Invoke] Failed', {
      error: error instanceof Error ? error.message : String(error),
      functionName: config.functionName
    });
    throw error;
  }
}

export async function executeLambdaInvokeAsync(params: {
  serverId: string;
  tenantId: string;
  config: {
    functionName: string;
    payload: any;
  };
}): Promise<{ requestId: string }> {
  const { serverId, tenantId, config } = params;

  try {
    const credentials = await AWSCredentialsService.getCredentials({
      serverId,
      tenantId
    });

    const lambdaClient = new LambdaClient({
      region: credentials.region,
      credentials: {
        accessKeyId: credentials.accessKeyId,
        secretAccessKey: credentials.secretAccessKey
      }
    });

    const command = new InvokeCommand({
      FunctionName: config.functionName,
      Payload: JSON.stringify(config.payload),
      InvocationType: 'Event' // Async invocation
    });

    const response = await lambdaClient.send(command);

    return { requestId: response.$metadata.requestId || '' };

  } catch (error) {
    logger.error('❌ [Lambda Invoke Async] Failed', {
      error: error instanceof Error ? error.message : String(error),
      functionName: config.functionName
    });
    throw error;
  }
}

// ==================== DYNAMODB EXECUTORS ====================

export async function executeDynamoDBPutItem(params: {
  serverId: string;
  tenantId: string;
  config: {
    tableName: string;
    item: Record<string, any>;
    conditionExpression?: string;
  };
}): Promise<{ success: boolean }> {
  const { serverId, tenantId, config } = params;

  try {
    const credentials = await AWSCredentialsService.getCredentials({
      serverId,
      tenantId
    });

    const dynamoClient = new DynamoDBClient({
      region: credentials.region,
      credentials: {
        accessKeyId: credentials.accessKeyId,
        secretAccessKey: credentials.secretAccessKey
      }
    });

    // Convert item to DynamoDB format
    const dynamoItem: Record<string, any> = {};
    for (const [key, value] of Object.entries(config.item)) {
      if (typeof value === 'string') {
        dynamoItem[key] = { S: value };
      } else if (typeof value === 'number') {
        dynamoItem[key] = { N: value.toString() };
      } else if (typeof value === 'boolean') {
        dynamoItem[key] = { BOOL: value };
      }
    }

    const command = new PutItemCommand({
      TableName: config.tableName,
      Item: dynamoItem,
      ...(config.conditionExpression ? { ConditionExpression: config.conditionExpression } : {})
    });

    await dynamoClient.send(command);

    return { success: true };

  } catch (error) {
    logger.error('❌ [DynamoDB Put Item] Failed', {
      error: error instanceof Error ? error.message : String(error),
      tableName: config.tableName
    });
    throw error;
  }
}
