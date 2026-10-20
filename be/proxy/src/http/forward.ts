import type { ServiceDefinition } from '../config/serviceRegistry';
import { ProxyError } from './errors';
import { buildUpstreamHeaders, filterResponseHeaders } from './headers';

export interface ForwardOptions {
  service: ServiceDefinition;
  upstreamUrl: URL;
  credential?: string;
  requestId: string;
}

export async function forward(request: Request, options: ForwardOptions): Promise<Response> {
  const { service, upstreamUrl, credential, requestId } = options;
  enforceDeclaredLength(request, service.maxBodyBytes);

  const hasBody = request.method !== 'GET' && request.method !== 'HEAD';
  let tooLarge = false;
  let body: ReadableStream<Uint8Array> | null = null;
  if (hasBody && request.body !== null) {
    body = limitBody(request.body, service.maxBodyBytes, () => {
      tooLarge = true;
    });
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), service.timeoutMs);
  let upstream: Response;
  try {
    upstream = await fetch(
      new Request(upstreamUrl.toString(), {
        method: request.method,
        headers: buildUpstreamHeaders(request.headers, requestId, credential),
        body,
        redirect: 'manual',
        signal: controller.signal,
      }),
    );
  } catch (err) {
    if (tooLarge) {
      throw new ProxyError('payload_too_large', 'Request body exceeds the configured limit');
    }
    if (controller.signal.aborted || (err instanceof Error && err.name === 'AbortError')) {
      throw new ProxyError('gateway_timeout', 'Upstream service timed out');
    }
    throw new ProxyError('bad_gateway', 'Upstream service is unavailable');
  } finally {
    clearTimeout(timer);
  }

  // Body is streamed, not buffered. Redirects are returned as-is with Location removed.
  return new Response(upstream.body, {
    status: upstream.status,
    headers: filterResponseHeaders(upstream.headers, requestId),
  });
}

function enforceDeclaredLength(request: Request, maxBytes: number): void {
  const raw = request.headers.get('content-length');
  if (raw === null) {
    return;
  }
  if (!/^\d+$/.test(raw)) {
    throw new ProxyError('bad_request', 'Invalid Content-Length');
  }
  if (Number(raw) > maxBytes) {
    throw new ProxyError('payload_too_large', 'Request body exceeds the configured limit');
  }
}

function limitBody(
  source: ReadableStream<Uint8Array>,
  maxBytes: number,
  onExceed: () => void,
): ReadableStream<Uint8Array> {
  let total = 0;
  const counter = new TransformStream<Uint8Array, Uint8Array>({
    transform(chunk, controller) {
      total += chunk.byteLength;
      if (total > maxBytes) {
        onExceed();
        throw new ProxyError('payload_too_large', 'Request body exceeds the configured limit');
      }
      controller.enqueue(chunk);
    },
  });
  return source.pipeThrough(counter);
}
