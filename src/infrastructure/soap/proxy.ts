import { fetch as undiciFetch, ProxyAgent } from 'undici';

/** Builds a fetch that tunnels through the given proxy URL (FR-008). The URL contains credentials: never log it. */
export const createProxiedFetch = (proxyUrl: string): typeof fetch => {
    const dispatcher = new ProxyAgent(proxyUrl);
    return (async (input: string | URL, init?: RequestInit) =>
        undiciFetch(input, { ...init, dispatcher } as Parameters<typeof undiciFetch>[1])) as unknown as typeof fetch;
};
