const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || (import.meta.env.DEV ? 'http://localhost:3000' : undefined);
if (!API_BASE_URL) throw new Error('Set VITE_API_BASE_URL to the deployed API origin.');

export { API_BASE_URL };
