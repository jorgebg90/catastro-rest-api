const escapeExample = (v: unknown): string => encodeURIComponent(String(v ?? ''));
const escape = (value: unknown): string =>
    String(value).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] as string);

interface Parameter {
    readonly name: string;
    readonly in: string;
    readonly required: boolean;
    readonly description: string;
    readonly schema: { readonly type: string };
    readonly example: unknown;
}

interface Operation {
    readonly summary: string;
    readonly description: string;
    readonly parameters: readonly Parameter[];
    readonly responses: Readonly<Record<string, { readonly description: string }>>;
}

interface Doc {
    readonly info: { readonly title: string; readonly version: string; readonly description: string };
    readonly paths: Readonly<Record<string, Readonly<Record<string, Operation>>>>;
}

const CSS = `body{font:15px/1.5 system-ui,sans-serif;max-width:60rem;margin:2rem auto;padding:0 1rem;color:#1b1f23}
h1{margin-bottom:0}.v{color:#586069}section{border:1px solid #d0d7de;border-radius:6px;padding:1rem;margin:1.5rem 0}
.m{background:#0969da;color:#fff;border-radius:4px;padding:.1rem .5rem;font-weight:600}code,pre{background:#f6f8fa;border-radius:4px}
code{padding:.1rem .3rem}pre{padding:.7rem;overflow:auto}table{border-collapse:collapse;width:100%}
th,td{border-bottom:1px solid #eaecef;text-align:left;padding:.3rem .5rem;vertical-align:top}`;

const exampleUrl = (path: string, params: readonly Parameter[]): string => {
    const filled = path.replace(/\{([^}]+)\}/g, (_, name: string) => escapeExample(params.find((p) => p.name === name)?.example));
    const query = params
        .filter((p) => p.in === 'query' && p.required)
        .map((p) => `${p.name}=${encodeURIComponent(String(p.example))}`);
    return query.length > 0 ? `${filled}?${query.join('&')}` : filled;
};


const renderParams = (params: readonly Parameter[]): string => {
    if (params.length === 0) return '<p>No parameters.</p>';
    const rows = params
        .map(
            (p) =>
                `<tr><td><code>${escape(p.name)}</code></td><td>${escape(p.in)}</td><td>${escape(p.schema.type)}</td><td>${p.required ? 'yes' : 'no'}</td><td>${escape(p.description)} Example: <code>${escape(p.example)}</code></td></tr>`,
        )
        .join('');
    return `<table><thead><tr><th>Name</th><th>In</th><th>Type</th><th>Required</th><th>Description</th></tr></thead><tbody>${rows}</tbody></table>`;
};

/** Renders a self-contained page (inline CSS, no scripts, no external requests; SPEC-001 FR-011). */
export const renderHtml = (document: unknown): string => {
    const doc = document as Doc;
    const sections = Object.entries(doc.paths)
        .flatMap(([path, ops]) =>
            Object.entries(ops).map(([method, op]) => {
                const responses = Object.entries(op.responses)
                    .map(([status, r]) => `<li><code>${escape(status)}</code> ${escape(r.description)}</li>`)
                    .join('');
                return `<section id="${escape(method)}-${escape(path)}"><h2><span class="m">${escape(method.toUpperCase())}</span> <code>${escape(path)}</code></h2>
<p><strong>${escape(op.summary)}</strong></p><p>${escape(op.description)}</p>
<h3>Parameters</h3>${renderParams(op.parameters)}
<h3>Example</h3><pre>curl "&lt;base-url&gt;${escape(exampleUrl(path, op.parameters))}"</pre>
<h3>Responses</h3><ul>${responses}</ul></section>`;
            }),
        )
        .join('\n');
    return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${escape(doc.info.title)}</title><style>${CSS}</style></head>
<body><h1>${escape(doc.info.title)}</h1><p class="v">Version ${escape(doc.info.version)}</p><p>${escape(doc.info.description)}</p>
<p>Machine-readable version: <a href="/openapi.json">/openapi.json</a></p>
${sections}
</body></html>`;
};
