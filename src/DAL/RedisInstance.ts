import redis from "redis";
import { CACHE_TTL_SECONDS } from "../lib/Constants";

function log(type: any) {
  return function () {
    console.log(type, arguments);
  };
}
class SRedis {
  private static instance: SRedis;
  private redisClient: redis.RedisClient;

  private constructor() {
    const REDIS_HOST = process.env.REDIS_HOST;
    const REDIS_PORT = process.env.REDIS_PORT;
    const REDIS_AUTH_PASS = process.env.REDIS_AUTH_PASS;

    const client = redis.createClient({
      host: REDIS_HOST,
      port: parseInt(REDIS_PORT),
      auth_pass: REDIS_AUTH_PASS,
    });

    client.on("ready", log("ready"));
    client.on("error", log("error"));
    this.redisClient = client;
  }

  public static getInstance(): SRedis {
    if (!SRedis.instance) {
      SRedis.instance = new SRedis();
    }
    return SRedis.instance;
  }

  public setKey(id: string, value: any) {
    this.redisClient.SETEX(id, CACHE_TTL_SECONDS, JSON.stringify(value));
  }

  public async getValue(id: string): Promise<unknown> {
    return new Promise((resolve, reject) => {
      this.redisClient.GET(id, (err: Error, reply: string) => {
        if (reply) {
          resolve(JSON.parse(reply));
        }
        if (err) {
          reject(err);
        }
        // no key yet on this ID
        resolve(null);
      });
    });
  }

  public deleteKey(id: string) {
    this.redisClient.DEL(id);
  }
}
export default SRedis;
