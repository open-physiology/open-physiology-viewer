// Lightweight OpenAI chat helper for AssistantPanel
// Note: This runs in the browser. It will call OpenAI if a key is available on OPENAI_API_KEY.
import {prepareContext, systemPrompt} from "./llmUtils";

export async function sendOpenAIChat({prompt, context}) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
        throw Error("Set the OPENAI_API_KEY environment variable!");
    }
    const contextText = prepareContext(context);
    const userContent = contextText ? `${prompt}\n\n---\nAdditional context:\n${contextText}` : prompt;

    const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
            model: 'gpt-5',
            messages: [
                {role: 'system', content: systemPrompt},
                {role: 'user', content: userContent}
            ]
        })
    });

    if (!res.ok) {
        const text = await res.text();
        throw new Error(`OpenAI API error ${res.status}: ${text}`);
    }
    const data = await res.json();
    const msg = data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content;
    return msg || '[No content returned]';
}
