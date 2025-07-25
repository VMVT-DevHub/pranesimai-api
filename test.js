import { ServiceBroker } from 'moleculer';
import { v4 as uuidv4 } from 'uuid';

// Test script to debug Redis cache issues
async function testRedisCache() {
  console.log('=== REDIS CACHE TEST START ===');
  console.log('Environment:', process.env.NODE_ENV || 'development');
  console.log('Timestamp:', new Date().toISOString());

  console.log('=== ENVIRONMENT DEBUG ===');
  console.log('process.env.REDIS_CONNECTION:', process.env.REDIS_CONNECTION);
  console.log('All Redis-related env vars:');
  Object.keys(process.env)
    .filter((key) => key.toLowerCase().includes('redis'))
    .forEach((key) => console.log(`  ${key}:`, process.env[key]));

  // Import your actual moleculer config
  let moleculerConfig;
  try {
    // Try to import your moleculer config - adjust the path as needed
    const configModule = await import('./moleculer.config.js');
    moleculerConfig = configModule.default || configModule;
    console.log('Using moleculer.config.js');
  } catch (error) {
    console.log('Could not import moleculer.config.js, using fallback config');
    console.log('Error:', error.message);

    // Fallback to your exact config structure
    moleculerConfig = {
      cacher: {
        type: 'Redis',
        options: {
          redis: 'redis://redis',
          prefix: 'pranesimai',
          ttl: 60 * 60, // 1 hour
        },
      },
      serializer: 'JSON',
    };
  }

  // Create broker with the same configuration as your app
  const broker = new ServiceBroker({
    nodeID: `test-node-${Date.now()}`,
    cacher: moleculerConfig.cacher,
    serializer: moleculerConfig.serializer || 'JSON',
    logLevel: 'info',
  });

  try {
    // Start the broker
    console.log('Starting broker...');
    await broker.start();

    console.log('=== MOLECULER CONFIG INFO ===');
    console.log('Config cacher type:', moleculerConfig.cacher?.type);
    console.log('Config cache prefix:', moleculerConfig.cacher?.options?.prefix);
    console.log('Config cache TTL:', moleculerConfig.cacher?.options?.ttl);
    console.log('Config Redis connection:', moleculerConfig.cacher?.options?.redis);
    console.log('REDIS_CONNECTION env (check):', process.env.REDIS_CONNECTION);

    // Debug the actual config being used
    console.log('=== ACTUAL BROKER CONFIG ===');
    console.log('Broker cacher config:', JSON.stringify(broker.options.cacher, null, 2));

    console.log('\n=== BROKER INFO ===');
    console.log('Broker NodeID:', broker.nodeID);
    console.log('Cacher type:', broker.cacher.constructor.name);
    console.log('Cache prefix:', broker.cacher.prefix);
    console.log('Redis client status:', broker.cacher.client?.status || 'N/A');
    console.log('Serializer:', broker.serializer.constructor.name);

    // Test Redis connection
    console.log('\n=== REDIS CONNECTION TEST ===');
    try {
      const pingResult = await broker.cacher.client.ping();
      console.log('Redis PING result:', pingResult);
    } catch (error) {
      console.error('Redis PING failed:', error.message);
      return;
    }

    // Test data similar to your file upload
    const fileId = uuidv4();
    const testKey = `uploaded-file:${fileId}`;
    const testData = {
      bucketName: 'test-bucket',
      objectName: 'test-file.txt',
      filename: 'original-filename.txt',
      size: 1024,
      uploadedAt: Date.now(),
    };

    console.log('\n=== CACHE SET TEST ===');
    console.log('Setting key:', testKey);
    console.log('Data to store:', JSON.stringify(testData, null, 2));

    // Set the cache
    const setResult = await broker.cacher.set(testKey, testData, 60 * 60 * 24 * 365);
    console.log('Cache SET result:', setResult);

    // Check what was actually stored in Redis (raw)
    console.log('\n=== RAW REDIS CHECK ===');
    const fullRedisKey = broker.cacher.prefix + testKey;
    console.log('Full Redis key:', fullRedisKey);

    try {
      const rawValue = await broker.cacher.client.get(fullRedisKey);
      console.log('Raw Redis value:', rawValue);
      console.log('Raw value type:', typeof rawValue);

      // Check TTL
      const ttl = await broker.cacher.client.ttl(fullRedisKey);
      console.log(
        'Key TTL:',
        ttl,
        ttl === -1 ? '(no expiry)' : ttl === -2 ? '(expired/not found)' : '(seconds)',
      );

      // Check if key exists
      const exists = await broker.cacher.client.exists(fullRedisKey);
      console.log('Key exists:', exists);
    } catch (error) {
      console.error('Raw Redis check failed:', error.message);
    }

    // Small delay to simulate time between upload and retrieval
    console.log('\n=== WAITING 1 SECOND ===');
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Test cache retrieval
    console.log('\n=== CACHE GET TEST ===');
    console.log('Getting key:', testKey);

    const retrievedData = await broker.cacher.get(testKey);
    console.log('Cache GET result:', retrievedData);
    console.log('Retrieved data type:', typeof retrievedData);

    if (retrievedData) {
      console.log('Retrieved data:', JSON.stringify(retrievedData, null, 2));

      // Compare original vs retrieved
      console.log('\n=== DATA COMPARISON ===');
      console.log('Original keys:', Object.keys(testData));
      console.log('Retrieved keys:', Object.keys(retrievedData));

      for (const key of Object.keys(testData)) {
        const match = testData[key] === retrievedData[key];
        console.log(`${key}: ${match ? '✓' : '✗'} (${testData[key]} vs ${retrievedData[key]})`);
      }
    } else {
      console.error('❌ CACHE GET RETURNED NULL/UNDEFINED');

      // Additional debugging
      console.log('\n=== ADDITIONAL DEBUGGING ===');

      // Try getting with different methods
      try {
        const directGet = await broker.cacher.client.get(fullRedisKey);
        console.log('Direct Redis GET:', directGet);

        if (directGet) {
          try {
            const parsed = JSON.parse(directGet);
            console.log('Manual JSON parse:', parsed);
          } catch (parseError) {
            console.error('JSON parse failed:', parseError.message);
          }
        }
      } catch (error) {
        console.error('Direct Redis GET failed:', error.message);
      }
    }

    // Test multiple keys to see if it's a pattern
    console.log('\n=== MULTIPLE KEYS TEST ===');
    for (let i = 0; i < 3; i++) {
      const multiKey = `test-key-${i}`;
      const multiData = { index: i, timestamp: Date.now() };

      await broker.cacher.set(multiKey, multiData, 300);
      const multiRetrieved = await broker.cacher.get(multiKey);

      console.log(`Key ${multiKey}: ${multiRetrieved ? '✓' : '✗'}`);
      if (!multiRetrieved) {
        console.log(
          `  Raw value:`,
          await broker.cacher.client.get(broker.cacher.prefix + multiKey),
        );
      }
    }

    // Test with different TTL
    console.log('\n=== DIFFERENT TTL TEST ===');
    const shortTtlKey = 'short-ttl-test';
    await broker.cacher.set(shortTtlKey, { test: 'short' }, 60);
    const shortTtlResult = await broker.cacher.get(shortTtlKey);
    console.log('Short TTL test:', shortTtlResult ? '✓' : '✗');

    // Clean up test keys
    console.log('\n=== CLEANUP ===');
    await broker.cacher.del(testKey);
    for (let i = 0; i < 3; i++) {
      await broker.cacher.del(`test-key-${i}`);
    }
    await broker.cacher.del(shortTtlKey);
    console.log('Test keys cleaned up');
  } catch (error) {
    console.error('Test failed with error:', error);
    console.error('Stack trace:', error.stack);
  } finally {
    // Stop the broker
    console.log('\n=== STOPPING BROKER ===');
    await broker.stop();
    console.log('Test complete');
  }
}

// Run the test
testRedisCache().catch(console.error);
