import { useEffect, useRef, useState } from 'react';
import 'swagger-ui-dist/swagger-ui.css';

import { hasDevAccess } from './dev-access';

/** Spec served from docs/public */
const SPEC_URL = '/openapi/authenta-api.yaml';
const STORAGE_KEY = 'authenta-api-explorer';
const DEV_STORAGE_KEY = 'authenta-api-explorer-dev';
/** Added to the Servers dropdown only in unlocked browsers that turn the toggle on (see dev-access.ts) */
const DEV_SERVER = {
  url: 'https://platform-dev.authenta.ai/api/v1',
  description: 'Authenta cloud (development) — use an API key created on platform-dev.authenta.ai',
};

type Remembered = {
  jobId: string;
  slotName: string;
  uploadUrl: string;
  uploadUrlExpiresAt: string;
  contentType: string;
  sizeBytes?: number;
};

type SwaggerRequest = { url: string; method?: string; headers?: Record<string, string>; body?: unknown };
type SwaggerResponse = { url: string; status: number; body?: any; text?: string };

function loadRemembered(): Remembered | null {
  try {
    return JSON.parse(sessionStorage.getItem(STORAGE_KEY) ?? 'null');
  } catch {
    return null;
  }
}

function saveRemembered(value: Remembered | null) {
  try {
    if (value) sessionStorage.setItem(STORAGE_KEY, JSON.stringify(value));
    else sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    /* storage unavailable — auto-fill still works until the page is reloaded */
  }
}

function loadDevEnabled(): boolean {
  try {
    return localStorage.getItem(DEV_STORAGE_KEY) === 'true';
  } catch {
    return false;
  }
}

function saveDevEnabled(value: boolean) {
  try {
    localStorage.setItem(DEV_STORAGE_KEY, String(value));
  } catch {
    /* storage unavailable — the toggle resets on reload */
  }
}

function pathOf(url: string): string {
  try {
    return new URL(url, window.location.href).pathname.replace(/\/+$/, '');
  } catch {
    return '';
  }
}

/**
 * Swagger UI for the public API. Remembers the result of "Step 1 — Create a job" so that Step 2 uploads
 * straight to the returned uploadUrl and Steps 3–4 accept `last` as the job ID.
 */
export function ApiExplorer() {
  const containerRef = useRef<HTMLDivElement>(null);
  const rememberedRef = useRef<Remembered | null>(null);
  const declaredRef = useRef<Record<string, { contentType: string; sizeBytes?: number }>>({});
  const [remembered, setRemembered] = useState<Remembered | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [loadFailed, setLoadFailed] = useState(false);
  const uiRef = useRef<any>(null);
  const devEnabledRef = useRef(false);
  const [showDevToggle, setShowDevToggle] = useState(false);
  const [devEnabled, setDevEnabled] = useState(false);

  const remember = (value: Remembered | null) => {
    rememberedRef.current = value;
    setRemembered(value);
    saveRemembered(value);
  };

  /** Adds or removes the development server in the Servers dropdown, falling back to prod when it's removed */
  const applyDevServer = (enabled: boolean) => {
    const ui = uiRef.current;
    const spec = ui?.specSelectors.specJson().toJS();
    if (!spec) return;
    const servers = (spec.servers ?? []).filter((server: { url: string }) => server.url !== DEV_SERVER.url);
    if (enabled) servers.push(DEV_SERVER);
    ui.specActions.updateJsonSpec({ ...spec, servers });
    if (!enabled && ui.oas3Selectors.selectedServer() === DEV_SERVER.url) ui.oas3Actions.setSelectedServer(servers[0]?.url);
  };

  const toggleDev = (enabled: boolean) => {
    devEnabledRef.current = enabled;
    setDevEnabled(enabled);
    saveDevEnabled(enabled);
    applyDevServer(enabled);
  };

  useEffect(() => {
    remember(loadRemembered());
    const timer = window.setInterval(() => setNow(Date.now()), 1000);

    /** Swagger UI can't render an error thrown from an interceptor, so show it in the bar and send nothing */
    const block = (req: SwaggerRequest, message: string) => {
      setError(message);
      req.url = 'about:blank';
      return req;
    };

    const requestInterceptor = (req: SwaggerRequest) => {
      const method = (req.method ?? 'GET').toUpperCase();
      const path = pathOf(req.url);
      const state = rememberedRef.current;

      if (method === 'POST' && path.endsWith('/jobs')) {
        declaredRef.current = {};
        try {
          const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
          for (const input of (body as { inputs?: any[] })?.inputs ?? []) {
            declaredRef.current[input.slotName] = { contentType: input.contentType, sizeBytes: input.sizeBytes };
          }
        } catch {
          /* invalid JSON — the API will reject it */
        }
        return req;
      }

      if (method === 'PUT' && path.endsWith('/uploads')) {
        if (new URL(req.url, window.location.href).searchParams.has('sig')) return req;
        if (!state) {
          return block(req, 'Step 2 was not sent: no upload URL yet. Run Step 1 on this page first and check it returned 201.');
        }
        if (new Date(state.uploadUrlExpiresAt).getTime() <= Date.now()) {
          return block(req, 'Step 2 was not sent: the upload URL expired. Run Step 1 again, then upload right away.');
        }
        const fileSize = (req.body as Blob | undefined)?.size;
        if (typeof fileSize === 'number' && state.sizeBytes && fileSize !== state.sizeBytes) {
          return block(
            req,
            `Step 2 was not sent: the file is ${fileSize} bytes but Step 1 declared sizeBytes ${state.sizeBytes}. Run Step 1 again with sizeBytes ${fileSize}.`,
          );
        }
        setError(null);
        /** Storage rejects a second auth mechanism, and the signed Content-Type must be the only one sent */
        const headers = Object.fromEntries(Object.entries(req.headers ?? {}).filter(([name]) => !/^(authorization|content-type)$/i.test(name)));
        req.headers = { ...headers, 'Content-Type': state.contentType };
        req.url = state.uploadUrl;
        return req;
      }

      if (state && /\/jobs\/last(\/|$|\?)/.test(req.url)) {
        req.url = req.url.replace(/\/jobs\/last(?=\/|$|\?)/, `/jobs/${state.jobId}`);
      }
      return req;
    };

    const responseInterceptor = (res: SwaggerResponse) => {
      if (res.status === 201 && pathOf(res.url).endsWith('/jobs')) {
        let body = res.body;
        if (!body && res.text) {
          try {
            body = JSON.parse(res.text);
          } catch {
            body = null;
          }
        }
        const input = body?.inputs?.[0];
        if (body?.job?.id && input?.uploadUrl) {
          const declared = declaredRef.current[input.slotName];
          setError(null);
          remember({
            jobId: body.job.id,
            slotName: input.slotName,
            uploadUrl: input.uploadUrl,
            uploadUrlExpiresAt: input.uploadUrlExpiresAt,
            contentType: declared?.contentType ?? 'application/octet-stream',
            sizeBytes: declared?.sizeBytes,
          });
        }
      }
      return res;
    };

    let cancelled = false;
    hasDevAccess().then(allowed => {
      if (cancelled || !allowed) return;
      setShowDevToggle(true);
      if (loadDevEnabled()) toggleDev(true);
    });

    import('swagger-ui-dist/swagger-ui-es-bundle.js')
      .then(module => {
        if (cancelled || !containerRef.current) return;
        const SwaggerUI = (module as any).default ?? module;
        uiRef.current = SwaggerUI({
          url: SPEC_URL,
          domNode: containerRef.current,
          deepLinking: true,
          persistAuthorization: true,
          tryItOutEnabled: true,
          displayRequestDuration: true,
          requestInterceptor,
          responseInterceptor,
          /** The unlock check can finish before the spec loads, so add the dev server once it has */
          onComplete: () => {
            if (devEnabledRef.current) applyDevServer(true);
          },
        });
      })
      .catch(() => setLoadFailed(true));

    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, []);

  const secondsLeft = remembered ? Math.round((new Date(remembered.uploadUrlExpiresAt).getTime() - now) / 1000) : 0;
  let uploadHost = '';
  try {
    uploadHost = remembered ? new URL(remembered.uploadUrl).host : '';
  } catch {
    /* keep empty */
  }

  return (
    <div className="api-explorer">
      <div className="api-explorer__bar" role="status">
        {error && <span className="api-explorer__error">{error}</span>}
        {remembered ? (
          <>
            <span>
              <b>Job</b> <code>{remembered.jobId}</code> (use <code>last</code>)
            </span>
            <span>
              <b>Upload to</b> <code>{uploadHost}</code> as <code>{remembered.contentType}</code>
              {remembered.sizeBytes ? (
                <>
                  , exactly <code>{remembered.sizeBytes}</code> bytes
                </>
              ) : null}
            </span>
            <span>
              <b>Upload URL</b>{' '}
              {secondsLeft > 0 ? `${secondsLeft}s left` : <span className="api-explorer__error">expired — run Step 1 again</span>}
            </span>
            <button type="button" onClick={() => remember(null)}>
              Clear
            </button>
          </>
        ) : (
          <span>
            Auto-fill: run <b>Step 1</b> — the job ID and upload URL are remembered for the next steps.
          </span>
        )}
      </div>
      {showDevToggle && (
        <label className="api-explorer__dev">
          <input type="checkbox" checked={devEnabled} onChange={event => toggleDev(event.target.checked)} />
          Show the development server (<code>platform-dev.authenta.ai</code>) in the Servers dropdown
        </label>
      )}
      {loadFailed && <p className="api-explorer__error">The API explorer failed to load. Reload the page to try again.</p>}
      <div className="api-explorer__swagger" ref={containerRef} />
      <style>{`
        .api-explorer__bar {
          position: sticky; top: var(--vocs-topNav_height, 60px); z-index: 10;
          display: flex; flex-wrap: wrap; gap: 6px 20px; align-items: center;
          padding: 10px 16px; margin-bottom: 16px; border-radius: 8px;
          background: #1f2937; color: #f9fafb; font-size: 13px;
        }
        .api-explorer__bar b { color: #93c5fd; font-weight: 600; }
        .api-explorer__bar code { background: #374151; color: #f9fafb; padding: 1px 6px; border-radius: 4px; word-break: break-all; }
        .api-explorer__bar button {
          margin-left: auto; background: #374151; color: #f9fafb; border: 1px solid #4b5563;
          border-radius: 4px; padding: 3px 10px; cursor: pointer;
        }
        .api-explorer__dev {
          display: flex; gap: 8px; align-items: center; margin-bottom: 16px; padding: 8px 16px;
          border: 1px dashed #f59e0b; border-radius: 8px; font-size: 13px; cursor: pointer;
        }
        .api-explorer__error { color: #fca5a5; flex-basis: 100%; }
        .api-explorer__swagger { background: #ffffff; color: #3b4151; border-radius: 8px; padding: 8px 0; }
      `}</style>
    </div>
  );
}
