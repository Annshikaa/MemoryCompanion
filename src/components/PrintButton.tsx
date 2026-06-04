'use client';

export function PrintButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      style={{
        backgroundColor: '#f3f4f6',
        color: '#6b7280',
        border: 'none',
        borderRadius: '12px',
        padding: '12px 24px',
        fontSize: '16px',
        fontWeight: 600,
        cursor: 'pointer',
      }}
    >
      🖨 Print this card
    </button>
  );
}
