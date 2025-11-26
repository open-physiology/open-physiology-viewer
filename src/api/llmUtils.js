function buildContextNote(context) {
    if (!context) return '';
    const parts = [];
    if (context.model) {
        try {
            parts.push(`model size: ${JSON.stringify(context.model).length} chars`);
        } catch (e) {
            parts.push('model: [unserializable]');
        }
    }
    if (context.schema) {
        try {
            parts.push(`schema size: ${JSON.stringify(context.schema).length} chars`);
        } catch (e) {
            parts.push('schema: [unserializable]');
        }
    }
    return parts.length ? `\n\n[Context included: ${parts.join(', ')}]` : '';
}

export function prepareContext(context){
    let contextText = '';
    if (context) {
        const contextNote = buildContextNote(context);
        try {
            const parts = [];
            if (context.model) {
                parts.push(`Model JSON:\n${JSON.stringify(context.model)}`);
            }
            if (context.schema) {
                parts.push(`Schema JSON:\n${JSON.stringify(context.schema)}`);
            }
            contextText = parts.join('\n\n');
        } catch (e) { /* ignore */
            console.error(`Context: ${contextNote}`);
            throw Error("Failed to submit context data!");
        }
    }
    return contextText;
}


export const systemPrompt = 'You are an assistant helping edit and validate JSON model with ' +
        'physiology definitions such as materials, compartments, and connectivity chains.' +
        'Provide precise, actionable answers.';