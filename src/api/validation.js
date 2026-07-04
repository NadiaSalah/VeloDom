export function toPositiveInteger(value, label = "id") {
  if (
    value === null
    || value === undefined
    || typeof value === "boolean"
    || String(value).trim() === ""
  ) {
    throw new TypeError(`${label} must be a positive integer`);
  }

  const number = Number(value);

  if (!Number.isSafeInteger(number) || number <= 0) {
    throw new TypeError(`${label} must be a positive integer`);
  }

  return number;
}
