import redis, { createClient } from "redis";

// Create a Redis client
const client = redis.createClient({
  host: "redis-18431.c245.us-east-1-3.ec2.cloud.redislabs.com", // Replace with your Redis host
  port: 18431, // Replace with your Redis port
  password: "YIfm2nVadPIKwsUY9OT7gLdoOWRBgcPu", // Replace with your Redis password, if any
});

// Handle errors
client.on("error", (err) => console.error("Redis error:", err));

// Async function to get a key from Redis
const getKeyFromRedis = async (key) => {
  try {
    return await new Promise((resolve, reject) => {
      client.get(key, (err, value) => {
        if (err) {
          reject(err);
        } else {
          resolve(value);
        }
      });
    });
  } catch (error) {
    console.error("Error getting key from Redis:", error);
    throw error;
  } finally {
    client.quit(); // Close the connection to Redis after retrieving the key
  }
};

// Call the async function
const key = "numbers_array"; // Replace with the key you want to retrieve
(async () => {
  try {
    const value = await getKeyFromRedis(key);
    console.log("Value of key", key, "is:", value);
  } catch (error) {
    console.error("Error:", error);
  }
})();
