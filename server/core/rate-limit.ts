const map = new Map();

export function rateLimit(key: string, limit = 20) {
  const now = Date.now();

  const data = map.get(key) || { count: 0, time: now };

  if (now - data.time > 60000) {
    data.count = 0;
    data.time = now;
  }

  data.count++;

  map.set(key, data);

  if (data.count > limit) {
    throw new Error("Too many requests");
  }
}
