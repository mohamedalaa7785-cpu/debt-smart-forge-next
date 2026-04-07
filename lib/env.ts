const REQUIRED_ENV_VARS = [
  "DATABASE_URL",
  "NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME",
  "CLOUDINARY_API_KEY",
  "CLOUDINARY_API_SECRET",
  "OPENAI_API_KEY",
  "SERPAPI_API_KEY",
  "GOOGLE_MAPS_API_KEY",
  "NEXT_PUBLIC_APP_URL",
] as const;

export type RequiredEnvVar = (typeof REQUIRED_ENV_VARS)[number];

const checked = new Set<RequiredEnvVar>();

export function getRequiredEnv(name: RequiredEnvVar): string {
  const value = process.env[name];
  if (!value || !value.trim()) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  checked.add(name);
  return value;
}

export function assertAllRequiredEnv(): void {
  const missing = REQUIRED_ENV_VARS.filter((name) => {
    const value = process.env[name];
    return !value || !value.trim();
  });

  if (missing.length) {
    throw new Error(`Missing required environment variables: ${missing.join(", ")}`);
  }

  for (const name of REQUIRED_ENV_VARS) {
    checked.add(name);
  }
}

export function getEnvHealth() {
  return {
    required: [...REQUIRED_ENV_VARS],
    checked: [...checked],
  };
}
