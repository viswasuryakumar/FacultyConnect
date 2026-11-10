export const TIME_ZONES = [
  'America/Los_Angeles',
  'America/New_York',
  'Europe/London',
  'Asia/Kolkata',
  'Asia/Tokyo',
  'Australia/Sydney',
  'UTC',
];
export function dateKey(date: Date | string, timeZone: string) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date(date));
}
export function dateLabel(date: Date | string, timeZone: string, long = false) {
  return new Intl.DateTimeFormat('en-US', {
    timeZone,
    weekday: long ? 'long' : 'short',
    month: long ? 'long' : 'short',
    day: 'numeric',
  }).format(new Date(date));
}
export function timeLabel(date: Date | string, timeZone: string) {
  return new Intl.DateTimeFormat('en-US', { timeZone, hour: 'numeric', minute: '2-digit' }).format(
    new Date(date),
  );
}
export function zoneLabel(timeZone: string) {
  return timeZone === 'America/Los_Angeles'
    ? 'Pacific time'
    : timeZone === 'America/New_York'
      ? 'Eastern time'
      : timeZone.replaceAll('_', ' ');
}
export function dayOffset(key: string, offset: number) {
  const date = new Date(`${key}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + offset);
  return date.toISOString().slice(0, 10);
}
export function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : 'Something went wrong. Please try again.';
}
