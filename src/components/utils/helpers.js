export function limitLabel(label, maxLength=40) {
    if (!label) return "";
    if (label.length <= maxLength) return label;
    return label.slice(0, maxLength) + '…';
}
