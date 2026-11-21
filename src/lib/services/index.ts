import type { ServiceBundle } from "./contracts";
import { createHttpServices } from "./httpAdapter";
import { createMockServices } from "./mockAdapter";

export * from "./contracts";
export { createHttpServices, type HttpAdapterOptions } from "./httpAdapter";
export {
  ADMIN_SESSION_STORAGE_KEY,
  createMockServices,
} from "./mockAdapter";

export type DataMode = "mock" | "api";

export function getDataMode(): DataMode {
  return process.env.NEXT_PUBLIC_DATA_MODE?.trim().toLowerCase() === "api"
    ? "api"
    : "mock";
}

export function getApiBaseUrl(): string {
  const configured = process.env.NEXT_PUBLIC_API_BASE_URL?.trim();
  return configured || "/api/backend";
}

export function createServices(): ServiceBundle {
  if (getDataMode() === "api") {
    return createHttpServices({ baseUrl: getApiBaseUrl() });
  }
  return createMockServices();
}

let cachedKey: string | null = null;
let cachedServices: ServiceBundle | null = null;

export function getServices(): ServiceBundle {
  const mode = getDataMode();
  const baseUrl = mode === "api" ? getApiBaseUrl() : "";
  const cacheKey = `${mode}:${baseUrl}`;
  if (!cachedServices || cachedKey !== cacheKey) {
    cachedKey = cacheKey;
    cachedServices = createServices();
  }
  return cachedServices;
}
