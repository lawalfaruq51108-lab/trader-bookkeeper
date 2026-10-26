export function formatNaira(amount: number): string {
  return `₦${amount.toLocaleString('en-NG', {
    maximumFractionDigits: 0,
    minimumFractionDigits: 0,
  })}`;
}
