import { HttpError, text } from './security.js';
// Supplied Buffer contract: exactly one subject reference, with independent threads.
export function noteSubject(sourceKind, sourceId) {
  const source = text(sourceId, 'Buffer source ID', 500);
  if (sourceKind === 'post') return { postId: source };
  if (sourceKind === 'content_item') return { contentItemId: source };
  throw new HttpError(400, 'Unsupported Buffer source kind.');
}
export function noteInput(subject, noteText) {
  if (!subject || typeof subject !== 'object' || Array.isArray(subject)) throw new HttpError(400, 'Invalid note subject.');
  const keys = Object.keys(subject);
  if (keys.length !== 1 || !['postId', 'contentItemId'].includes(keys[0])) throw new HttpError(400, 'A note must target exactly one Buffer thread.');
  return { subject: { [keys[0]]: text(subject[keys[0]], 'Buffer source ID', 500) }, text: text(noteText, 'note text', 6000) };
}
export const feedbackMarker = delivery => `[Receipts feedback ${delivery.id}]`;
export const feedbackText = delivery => `${delivery.author_name} (external reviewer via Receipts):\n${delivery.body}\n\n${feedbackMarker(delivery)}`;
// A negative read is not proof of non-delivery (eventual consistency/pagination/access).
// Multiple matches are also ambiguous. Only one exact positive match can reconcile.
export function deliveredMatch(notes, delivery) {
  const expected = feedbackText(delivery);
  const matches = notes.filter(n => typeof n.id === 'string' && n.id && n.text === expected);
  const unique = new Map(matches.map(n => [n.id, n]));
  return unique.size === 1 ? [...unique.values()][0] : null;
}
