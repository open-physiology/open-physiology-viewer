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
        'physiology definitions such as lyphs (compartments), materials, chains, and coalescences.' +
        'Provide precise, actionable answers. When a user ask to create a new resource, use only properties defined in ' +
        'the JSON Schema (if included to the context). ' +
        'If the definition requires several new resources, avoid creating nested JSON objects, ' +
        'instead list all of them and refer from one resource to another by its identifier.' +
        'When model is not included to the context and the users asks a generic question, answer to the question.';

/**
 * Very lightweight intent detector for "create new" resource flows that should open editors.
 * Returns one of: 'lyph' | 'material' | 'chain' | 'coalescence' | null
 */
export function detectCreateIntent(text) {
    if (!text) return null;
    const t = String(text).toLowerCase();
    // common verbs
    const createVerbs = ["create", "add", "new", "make", "define", "open"];
    const hasCreateVerb = createVerbs.some(v => t.includes(v + ' '));

    // map resource keywords to canonical editor ids
    const entries = [
        {key: 'lyph', aliases: ['lyph', 'layered glyph', 'lyphs']},
        {key: 'material', aliases: ['material', 'materials']},
        {key: 'chain', aliases: ['chain', 'chains', 'pathway', 'path']},
        {key: 'coalescence', aliases: ['coalescence', 'coalescences', 'merge', 'fusion']}
    ];

    for (const {key, aliases} of entries) {
        if (aliases.some(a => t.includes(a))) {
            // If user mentions the resource with a create-ish verb OR explicitly says open <editor>
            if (hasCreateVerb || t.includes('open ' + key)) {
                return key;
            }
        }
    }
    return null;
}

/**
 * Extract a single JSON object from assistant text and detect its resource type.
 * Returns { type: 'lyph'|'material'|'chain'|'coalescence', object } or null if not found/parsable.
 */
export function parseResourceFromText(text){
    if (!text || typeof text !== 'string') return null;
    const t = text.trim();
    let jsonStr = null;

    // 1) Prefer fenced code block ```json ... ``` or ``` ... ```
    const fenceMatch = t.match(/```(?:json)?\s*([\s\S]*?)```/i);
    if (fenceMatch && fenceMatch[1]) {
        jsonStr = fenceMatch[1].trim();
    }

    // 2) Fallbacks: try to find first JSON block naively (object or array)
    if (!jsonStr) {
        const startObj = t.indexOf('{');
        const endObj = t.lastIndexOf('}');
        const startArr = t.indexOf('[');
        const endArr = t.lastIndexOf(']');
        if (startArr > -1 && endArr > startArr && (startObj === -1 || startArr < startObj)) {
            jsonStr = t.substring(startArr, endArr + 1);
        } else if (startObj > -1 && endObj > startObj) {
            jsonStr = t.substring(startObj, endObj + 1);
        }
    }

    if (!jsonStr) return null;

    let parsed;
    try {
        parsed = JSON.parse(jsonStr);
    } catch (e) {
        return null;
    }

    const KNOWN = ['lyph','material','chain','coalescence'];

    const normalizeOne = (obj) => {
        if (!obj || Array.isArray(obj) || typeof obj !== 'object') return null;
        const cls = (obj._class || obj.class || '').toString();
        const clsLower = cls.toLowerCase();
        let type = null;
        if (KNOWN.includes(clsLower)) {
            type = clsLower;
        } else {
            // Heuristics
            if (obj.root || obj.leaf || Array.isArray(obj.levels) || (Array.isArray(obj.lyphs) && (obj.root || obj.leaf))) {
                type = 'chain';
            } else if (Array.isArray(obj.lyphs) && !obj.root && !obj.leaf) {
                type = 'coalescence';
            } else if (obj.topology || Array.isArray(obj.layers) || obj.isTemplate) {
                type = 'lyph';
            } else if (obj.color || obj.symbol || obj.subtypeOf || obj.supertypeOf) {
                type = 'material';
            }
        }
        if (!type) return null;
        const canonicalClass = {lyph:'Lyph', material:'Material', chain:'Chain', coalescence:'Coalescence'}[type];
        obj._class = obj._class || canonicalClass;
        if (!obj.id) {
            const base = {lyph:'newLyph', material:'newMat', chain:'newChain', coalescence:'newCoalescence'}[type];
            obj.id = base;
        }
        return { type, object: obj };
    };

    let items = [];
    if (Array.isArray(parsed)) {
        for (const it of parsed) {
            const norm = normalizeOne(it);
            if (norm) items.push(norm);
        }
    } else {
        const norm = normalizeOne(parsed);
        if (norm) items.push(norm);
    }

    if (!items.length) return null;

    // Determine homogeneity
    const typesSet = Array.from(new Set(items.map(i => i.type)));
    const homogeneousType = typesSet.length === 1 ? typesSet[0] : null;

    // Backward compatibility: if single, expose type/object on top-level
    if (items.length === 1) {
        return { type: items[0].type, object: items[0].object, items, homogeneousType };
    }
    return { items, homogeneousType };
}