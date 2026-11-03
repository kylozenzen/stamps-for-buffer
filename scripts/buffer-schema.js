import { readFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { Store } from '../server/store.js';
import { BufferClient } from '../server/buffer.js';
import { cipher, id, HttpError } from '../server/security.js';
export const operationNames = new Set(['account','channels','posts','post','collaborationNotes','createCollaborationNote']);
export function filterSignatures(data) {
  const result = {};
  for (const root of ['queryType','mutationType']) {
    const value = data?.__schema?.[root];
    if (!value) throw new Error('Missing introspection root; inspect the API permission response.');
    result[root] = { name: value.name, fields: value.fields.filter(f => operationNames.has(f.name)) };
  }
  return result;
}
export async function diagnostic({ creatorId, typeName, env = process.env, store = new Store(env), buffer = new BufferClient(env) }) {
  id(creatorId);
  if (typeName && !/^[_A-Za-z][_0-9A-Za-z]*$/.test(typeName)) throw new Error('Invalid GraphQL type name.');
  const creator = await store.one('creators', { id: `eq.${creatorId}` });
  if (!creator?.tokens_ciphertext) throw new Error('Creator has no active Buffer connection. Complete OAuth first.');
  const tokens = cipher(env.RECEIPTS_ENCRYPTION_KEY).open(creator.tokens_ciphertext, `creator:${creator.id}`);
  if (!(tokens.expiresAt > Date.now())) throw new Error('Stored token is expired. Refresh through the application first. This diagnostic never refreshes tokens or writes data.');
  const file = typeName ? 'type-definition' : 'operation-signatures';
  const query = await readFile(new URL(`../docs/graphql/${file}.graphql`, import.meta.url), 'utf8');
  const data = await buffer.graphql(tokens.accessToken, query, typeName ? { name: typeName } : {});
  return typeName ? data.__type : filterSignatures(data);
}
async function main() {
  const args = process.argv.slice(2);
  if (!args[0] || args.length > 2) throw new Error('Usage: npm run buffer:schema -- CREATOR_UUID [EXACT_TYPE_NAME]');
  console.log(JSON.stringify(await diagnostic({ creatorId: args[0], typeName: args[1] }), null, 2));
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main().catch(error => {
  // Do not print upstream bodies, tokens, encrypted connection rows, or stack traces.
  console.error(error instanceof HttpError ? error.message : 'Schema diagnostic failed: '+error.message);
  process.exitCode = 1;
});
