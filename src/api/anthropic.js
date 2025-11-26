// Lightweight Anthropic chat helper for AssistantPanel
// Note: This runs in the browser. It will call Anthropic if a key is available in ANTHROPIC_API_KEY.
import {prepareContext, systemPrompt} from "./llmUtils";

export async function sendAnthropicChat({prompt, context}) {
    const apiKey = process.env.ANTHROPIC_API_KEY;

    if (!apiKey) {
        throw Error("Set the ANTHROPIC_API_KEY environment variable!");
    }

    const contextText = prepareContext(context);
    const userContent = contextText ? `${prompt}\n\n---\nAdditional context:\n${contextText}` : prompt;

    let res;
    try {
        res = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'x-api-key': apiKey,
                'anthropic-version': '2023-06-01',
                // Required for direct browser requests per Anthropic policy
                'anthropic-dangerous-direct-browser-access': 'true'
            },
            body: JSON.stringify({
                model: 'claude-sonnet-4-20250514',
                max_tokens: 1200,
                messages: [
                    {role: 'user', content: userContent}
                ],
                system: systemPrompt
            })
        });
    } catch (e) {
        throw new Error(`Network error calling Anthropic (possible CORS or connectivity issue): ${e && e.message ? e.message : e}`);
    }

    if (!res.ok) {
        const text = await res.text();
        throw new Error(`Anthropic API error ${res.status}: ${text}`);
    }
    const data = await res.json();
    // Anthropic returns content array with items; concatenate text items
    let msg = '';
    try {
        const contentArr = (data.content || []);
        msg = contentArr.map(i => i.type === 'text' ? i.text : '').join('\n').trim();
    } catch (e) {
        msg = '';
    }
    return msg || '[No content returned]';
}