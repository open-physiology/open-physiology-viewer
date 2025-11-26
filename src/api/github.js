// Lightweight GitHub helper utilities using fetch.
// Compatible with both Promise usage and optional callback-style usage.

// Helper to build GitHub headers (Authorization if token is available)
function getGitHubHeaders(additional = {}) {
    const headers = Object.assign({
        'User-Agent': 'OPV',
        'Accept': 'application/vnd.github.v3+json'
    }, additional);

    // Prefer process.env.GITHUB_TOKEN (Node) or globalThis.GITHUB_TOKEN (if exposed)
    const token = (typeof process !== 'undefined' && process.env && process.env.GITHUB_TOKEN)
        ? process.env.GITHUB_TOKEN
        : (typeof globalThis !== 'undefined' ? globalThis.GITHUB_TOKEN : undefined);

    if (token) {
        // Use Bearer for modern tokens
        headers['Authorization'] = `Bearer ${token}`;
        // console.log('Using authenticated GitHub API requests');
    }
    return headers;
}

/**
 * makeRequest(method, url, headers = {}, body = null, callback = null)
 * - Returns a Promise that resolves to { data, status, headers } where data is parsed JSON or text.
 * - If callback is provided it will be called as callback(err, data).
 */
export function makeRequest(method, url, headers = {}, body = null, callback = null) {
    const fetchOptions = {
        method,
        headers: getGitHubHeaders(headers)
    };

    if (body !== null && body !== undefined) {
        // If body is already a string, send as-is; otherwise JSON.stringify
        fetchOptions.body = (typeof body === 'string') ? body : JSON.stringify(body);
        // Ensure Content-Type if not provided by caller
        if (!fetchOptions.headers['Content-Type']) {
            fetchOptions.headers['Content-Type'] = 'application/json';
        }
    }

    const p = fetch(url, fetchOptions).then(async resp => {
        const text = await resp.text();
        const resultHeaders = {};
        // normalize headers access
        if (resp.headers && typeof resp.headers.forEach === 'function') {
            resp.headers.forEach((value, key) => { resultHeaders[key] = value; });
        }

        // Try parse JSON if possible
        let parsed;
        try {
            parsed = JSON.parse(text);
        } catch (err) {
            parsed = text;
        }

        if (resp.ok) {
            return { data: parsed, status: resp.status, headers: resultHeaders };
    } else {
            // include body for diagnostics
            const err = new Error(`Error ${resp.status}: ${text}`);
            err.status = resp.status;
            err.body = parsed;
            throw err;
        }
    });

    if (typeof callback === 'function') {
        p.then(res => callback(null, res.data)).catch(err => callback(err.message || String(err), null));
    }

    return p;
}

/**
 * Fetch GitHub API URL and return parsed JSON (throws on non-2xx)
 */
export async function fetchGitHubAPI(url) {
    try {
        const resp = await makeRequest('GET', url);
        return resp.data;
    } catch (err) {
        throw new Error(`Failed to fetch from GitHub API: ${err.message || err}`);
    }
}

/**
 * Fetch raw content (text) from a URL. Auth header included if token available.
 */
export async function fetchRawContent(url) {
    try {
        const headers = getGitHubHeaders();
        const resp = await fetch(url, { headers });
        const text = await resp.text();
        if (resp.ok) {
            return text;
        } else {
            throw new Error(`Failed to fetch raw content (${resp.status}): ${text}`);
        }
    } catch (err) {
        throw new Error(`Failed to fetch raw content: ${err.message || err}`);
    }
}

/**
 * Extract a simple description from README-like content
 */
function extractDescription(readmeContent) {
    if (!readmeContent) return 'No description available';
    const lines = readmeContent.split('\n');
    for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) continue;
        if (trimmed.length > 0) return trimmed;
    }
    return 'No description available';
}

/**
 * Fetches models from the open-physiology/apinatomy-models repository under "models" directory.
 * Returns an array of { name, description, modelData, jsonUrl, pdfDocs }.
 */
export async function fetchModelsFromGitHub() {
    const owner = 'open-physiology';
    const repo = 'apinatomy-models';
    const modelsPath = 'models';

    const apiUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${modelsPath}`;

    try {
        const contents = await fetchGitHubAPI(apiUrl);
        const modelDirs = (Array.isArray(contents) ? contents.filter(item => item.type === 'dir') : []);
        const models = await Promise.all(
            modelDirs.map(async (dir) => {
                const modelName = dir.name;
                try {
                    const modelContents = await fetchGitHubAPI(dir.url);
                const readmeFile = modelContents.find(file => file.name && file.name.toLowerCase().match(/^readme\.(md|txt)$/i));
                const sourceDir = modelContents.find(item => item.type === 'dir' && item.name.toLowerCase() === 'source');
                    const docsDir = modelContents.find(item =>
                        item.type === 'dir' && item.name.toLowerCase() === 'docs'
                    );

                    let description = 'No description available';
                    let modelData = null;
                    let jsonUrl = null;
                let pdfDocs = [];

                if (readmeFile && readmeFile.download_url) {
                        try {
                            const readmeContent = await fetchRawContent(readmeFile.download_url);
                            description = extractDescription(readmeContent);
                        } catch (err) {
                        console.error(`Failed to fetch README for ${modelName}:`, err.message || err);
                        }
                    }

                    if (sourceDir) {
                        try {
                            const sourceContents = await fetchGitHubAPI(sourceDir.url);
                        const jsonFile = (Array.isArray(sourceContents) ? sourceContents.find(f => f.name && f.name.endsWith('.json') && f.type === 'file') : null);
                        if (jsonFile && jsonFile.download_url) {
                            try {
                                const jsonContent = await fetchRawContent(jsonFile.download_url);
                                modelData = JSON.parse(jsonContent);
                                jsonUrl = jsonFile.download_url;
                            } catch (err) {
                                console.error(`Failed to fetch or parse JSON for ${modelName}:`, err.message || err);
                            }
                            }
                        } catch (err) {
                        console.error(`Failed to read source directory for ${modelName}:`, err.message || err);
                    }
                }

                if (docsDir) {
                    try {
                        const docsContents = await fetchGitHubAPI(docsDir.url);
                        pdfDocs = (Array.isArray(docsContents) ? docsContents.filter(file => file.name && file.name.toLowerCase().endsWith('.pdf') && file.type === 'file').map(f => f.download_url) : []);
                    } catch (err) {
                        console.error(`Failed to read docs for ${modelName}:`, err.message || err);
                        }
                    }

                return { name: modelName, description, modelData, jsonUrl, pdfDocs };
                } catch (err) {
                console.error(`Error processing model ${modelName}:`, err.message || err);
                return { name: modelName, description: 'Error loading model', modelData: null, jsonUrl: null, pdfDocs: [], error: err.message || String(err) };
                }
        }));
        return models;

    } catch (err) {
        console.error('Error fetching models from GitHub:', err);
        throw err;
    }
}

/**
 * Returns lightweight descriptions for models
 */
export async function fetchModelDescriptions() {
    const models = await fetchModelsFromGitHub();
    return models.map(m => ({
        name: m.name,
        description: m.description,
        jsonUrl: m.jsonUrl,
        pdfDocs: m.pdfDocs || []
    }));
}

// Export for use in browser or other environments
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        fetchModelsFromGitHub,
        fetchModelDescriptions,
        makeRequest
    };
}