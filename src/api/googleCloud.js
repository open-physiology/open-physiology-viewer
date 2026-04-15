export class GCSClient {
    constructor() {
        this.bucket = "apinatomy-models";
        this.folder = "images";
        this.credentials = null;
        try {
            if (process.env.GOOGLE_CREDENTIALS_JSON) {
                this.credentials = JSON.parse(process.env.GOOGLE_CREDENTIALS_JSON);
            }
        } catch (e) {
            console.error("Failed to parse GOOGLE_CREDENTIALS_JSON", e);
        }
    }

    async getAccessToken() {
        if (!this.credentials) {
            throw new Error("Google credentials not found in process.env.GOOGLE_CREDENTIALS_JSON");
        }

        const header = {
            alg: 'RS256',
            typ: 'JWT'
        };

        const now = Math.floor(Date.now() / 1000);
        const payload = {
            iss: this.credentials.client_email,
            scope: 'https://www.googleapis.com/auth/devstorage.read_write',
            aud: 'https://oauth2.googleapis.com/token',
            exp: now + 3600,
            iat: now
        };

        const encodedHeader = btoa(JSON.stringify(header))
            .replace(/\+/g, '-')
            .replace(/\//g, '_')
            .replace(/=/g, '');
        const encodedPayload = btoa(JSON.stringify(payload))
            .replace(/\+/g, '-')
            .replace(/\//g, '_')
            .replace(/=/g, '');
        const stringToSign = `${encodedHeader}.${encodedPayload}`;

        // In a typical browser environment, we can't sign with RS256 without a library.
        // However, some environments might have a global `crypto.subtle` or similar.
        // If this is meant to be a simple implementation for a coding task, 
        // perhaps there's a simpler way or I should assume it works in the target environment.
        // Given the constraints, I will use a placeholder or try to use SubtleCrypto if available.

        if (typeof crypto !== 'undefined' && crypto.subtle && this.credentials.private_key) {
            try {
                const pem = this.credentials.private_key;
                const binaryDerString = atob(pem.split('\n').filter(line => line && !line.includes('---')).join(''));
                const binaryDer = new Uint8Array(binaryDerString.length);
                for (let i = 0; i < binaryDerString.length; i++) {
                    binaryDer[i] = binaryDerString.charCodeAt(i);
                }

                const key = await crypto.subtle.importKey(
                    'pkcs8',
                    binaryDer,
                    {
                        name: 'RSASSA-PKCS1-v1_5',
                        hash: 'SHA-256',
                    },
                    false,
                    ['sign']
                );

                const signature = await crypto.subtle.sign(
                    'RSASSA-PKCS1-v1_5',
                    key,
                    new TextEncoder().encode(stringToSign)
                );

                const encodedSignature = btoa(String.fromCharCode(...new Uint8Array(signature)))
                    .replace(/\+/g, '-')
                    .replace(/\//g, '_')
                    .replace(/=/g, '');

                const jwt = `${stringToSign}.${encodedSignature}`;

                const response = await fetch('https://oauth2.googleapis.com/token', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded'
                    },
                    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`
                });

                const data = await response.json();
                if (data.error) {
                    throw new Error(`GCS Auth Error: ${data.error_description || data.error}`);
                }
                return data.access_token;
            } catch (e) {
                console.error("Failed to sign JWT with SubtleCrypto", e);
                throw e;
            }
        }

        throw new Error("RS256 signing not supported in this environment without a library.");
    }

    async uploadImage(name, dataURL) {
        if (!dataURL) return;
        const fileName = `${this.folder}/${name}`;
        
        // Check if exists
        const exists = await this.fileDescription(fileName);
        if (exists) {
            console.log(`Image ${fileName} already exists in bucket, skipping.`);
            return;
        }

        const base64Data = dataURL.split(',')[1];
        const contentType = dataURL.split(',')[0].split(':')[1].split(';')[0];
        const binaryData = atob(base64Data);
        const array = new Uint8Array(binaryData.length);
        for (let i = 0; i < binaryData.length; i++) {
            array[i] = binaryData.charCodeAt(i);
        }

        // Upload
        const url = `https://storage.googleapis.com/upload/storage/v1/b/${this.bucket}/o?uploadType=media&name=${encodeURIComponent(fileName)}`;
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': contentType,
                'Authorization': `Bearer ${await this.getAccessToken()}`
            },
            body: array
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Failed to upload to GCS: ${errorText}`);
        }
    }

    async fileDescription(fileName) {
        const url = `https://storage.googleapis.com/storage/v1/b/${this.bucket}/o/${encodeURIComponent(fileName)}`;
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${await this.getAccessToken()}`
            }
        });
        if (response.status === 404) return null;
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Failed to check file existence in GCS: ${errorText}`);
        }
        return await response.json();
    }
}

export const gcsClient = new GCSClient();
