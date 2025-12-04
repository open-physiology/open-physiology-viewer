// Lightweight GitHub helper utilities using fetch.
// Compatible with both Promise usage and optional callback-style usage.

// Helper to build GitHub headers (Authorization if token is available)
function getGitHubHeaders(additional = {}) {
    const headers = Object.assign({
        'User-Agent': 'OPV',
        'Accept': 'application/vnd.github.v3+json'
    }, additional);

    const token = (typeof process !== 'undefined' && process.env && process.env.GITHUB_TOKEN)
        ? process.env.GITHUB_TOKEN
        : (typeof globalThis !== 'undefined' ? globalThis.GITHUB_TOKEN : undefined);

    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
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
            resp.headers.forEach((value, key) => {
                resultHeaders[key] = value;
            });
        }

        // Try parse JSON if possible
        let data;
        try {
            data = JSON.parse(text);
        } catch (err) {
            data = text;
        }

        if (resp.ok) {
            return {data: data, status: resp.status, headers: resultHeaders};
        } else {
            const err = new Error(`Error ${resp.status}: ${text}`);
            err.status = resp.status;
            err.body = data;
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
 * Fetches models from the open-physiology/apinatomy-models repository under "models" directory.
 * Returns an array of { name, modelData}.
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
                    const sourceDir = modelContents.find(item => item.type === 'dir' && item.name.toLowerCase() === 'source');

                    if (sourceDir) {
                        try {
                            const sourceContents = await fetchGitHubAPI(sourceDir.url);
                            const jsonFile = (Array.isArray(sourceContents) ? sourceContents.find(f => f.name && f.name.endsWith('.json') && f.type === 'file') : null);
                            if (jsonFile){
                                return jsonFile;
                            }
                        } catch (err) {
                            console.error(`Failed to read source directory for ${modelName}:`, err.message || err);
                        }
                    }
                } catch (err) {
                    console.error(`Error processing model ${modelName}:`, err.message || err);
                }
            }));
        return models.filter(m => m);
    } catch (err) {
        console.error('Error fetching models from GitHub:', err);
        throw err;
    }
}

// Export for use in browser or other environments
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        fetchModelsFromGitHub,
        makeRequest
    };
}