import type { DeliverySlot } from './types';

export const SLOT_WINDOWS = [
  '09:00 - 12:00',
  '12:00 - 15:00',
  '15:00 - 18:00',
  '18:00 - 21:00',
];

export interface SlotDay {
  date: string;
  label: string;
  windows: string[];
}

/**
 * Installation-led products need an engineer visit, so the first slot is
 * tomorrow and Sundays are skipped.
 */
export function availableSlots(days = 6, from = new Date()): SlotDay[] {
  const out: SlotDay[] = [];
  const cursor = new Date(from);
  cursor.setHours(0, 0, 0, 0);

  while (out.length < days) {
    cursor.setDate(cursor.getDate() + 1);
    if (cursor.getDay() === 0) continue; // closed Sunday

    const date = cursor.toISOString().slice(0, 10);
    out.push({
      date,
      label: cursor.toLocaleDateString('en-IN', {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
      }),
      windows: SLOT_WINDOWS,
    });
  }
  return out;
}

export function isValidSlot(slot: DeliverySlot | undefined | null): boolean {
  if (!slot?.date || !slot?.window) return false;
  if (!SLOT_WINDOWS.includes(slot.window)) return false;
  return availableSlots(14).some((d) => d.date === slot.date);
}
