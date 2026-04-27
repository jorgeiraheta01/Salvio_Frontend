const DEFAULT_API_URL = "http://127.0.0.1:8000";

function readPublicEnv(name: string): string | undefined {
  const value = process.env[name];
  return value && value.trim().length > 0 ? value.trim() : undefined;
}

export const env = {
  apiUrl: readPublicEnv("NEXT_PUBLIC_API_URL") ?? DEFAULT_API_URL,
  defaultTenant: readPublicEnv("NEXT_PUBLIC_DEFAULT_TENANT") ?? "clinica_demo",
  appName: readPublicEnv("NEXT_PUBLIC_APP_NAME") ?? "Salvio SaaS"
};
