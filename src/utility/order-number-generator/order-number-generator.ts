export function generateOrderNumber(): string {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');

  const datePart = month + day;

  const randomPart = Math.floor(Math.random() * 1000)
    .toString()
    .padStart(3, '0');

  return `ORD-${datePart}${randomPart}`;
}
