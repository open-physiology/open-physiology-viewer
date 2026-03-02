import config from "../data/config.json";

export class GitHubClient {
    constructor(token, baseUrl = config.storageURL) {
        this.token = token;
        this.baseUrl = baseUrl;
        this.branch = "main";
    }

    getHeaders() {
        if (!this.token) {
            throw new Error("GitHub token is not set!");
        }
        return {
            "Authorization": `token ${this.token}`,
            "Accept": "application/vnd.github.v3+json",
            "Content-Type": "application/json"
        };
    }

    async makeRequest(method, url, body = null) {
        const xhr = new XMLHttpRequest();
        xhr.open(method, url, true);
        const headers = this.getHeaders();
        for (const [key, value] of Object.entries(headers)) {
            xhr.setRequestHeader(key, value);
        }

        return new Promise((resolve, reject) => {
            xhr.onreadystatechange = () => {
                if (xhr.readyState === 4) {
                    if (xhr.status >= 200 && xhr.status < 300) {
                        try {
                            resolve(xhr.responseText ? JSON.parse(xhr.responseText) : null);
                        } catch (e) {
                            resolve(xhr.responseText);
                        }
                    } else {
                        reject({
                            status: xhr.status,
                            responseText: xhr.responseText,
                            message: `Error: ${xhr.status} - ${xhr.responseText}`
                        });
                    }
                }
            };
            xhr.send(body ? JSON.stringify(body) : null);
        });
    }

    getFile(path, branch = this.branch) {
        const url = `${this.baseUrl}/contents/${path}?ref=${branch}`;
        return this.makeRequest("GET", url);
    }

    putFile(path, content, message, sha = null, branch = this.branch) {
        const url = `${this.baseUrl}/contents/${path}`;
        const body = {
            message,
            content,
            branch
        };
        if (sha) {
            body.sha = sha;
        }
        return this.makeRequest("PUT", url, body);
    }

    // Helper for base64 encoding that works in browser
    toBase64(str) {
        try {
             return btoa(unescape(encodeURIComponent(str)));
        } catch (e) {
             // Fallback to Buffer if available (e.g. in some webpack environments)
             if (typeof Buffer !== 'undefined') {
                 return Buffer.from(str).toString("base64");
             }
             throw e;
        }
    }

    // Helper for base64 decoding
    fromBase64(str) {
        try {
            return decodeURIComponent(escape(atob(str.replace(/\n/g, ""))));
        } catch (e) {
            if (typeof Buffer !== 'undefined') {
                return Buffer.from(str.replace(/\n/g, ""), "base64").toString("utf-8");
            }
            throw e;
        }
    }

    getRepoUrl() {
        return this.baseUrl.split('/contents')[0];
    }

    getOwnerRepo() {
        const match = this.baseUrl.match(/repos\/([^/]+)\/([^/]+)/);
        const owner = match ? match[1] : 'open-physiology';
        const repo = match ? match[2] : 'apinatomy-models';
        return { owner, repo };
    }
}
