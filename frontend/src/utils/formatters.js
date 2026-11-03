export function formatCurrency(amount) {
    const num = Number(amount || 0);
    return `LKR ${num.toLocaleString('en-LK', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    })}`;
}

export function formatDate(dateString) {
    if (!dateString) return '-';
    try {
        const d = new Date(dateString);
        return d.toLocaleDateString('en-GB', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
        });
    } catch {
        return dateString;
    }
}

