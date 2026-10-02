import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
import vm from 'node:vm';

const source = fs.readFileSync(new URL('../app/app/page.tsx', import.meta.url), 'utf8');
const start = source.indexOf('  async function addPhotos(');
const end = source.indexOf('\n  if (!listing) return null;', start);
const uploadCode = ts.transpileModule(source.slice(start, end), { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText;

test('selected files survive resetting the picker and populate the slider after an async upload', async () => {
  const picked = [{ name: 'kitchen.jpg', type: 'image/jpeg' }];
  const busy = [], uploaded = [], notices = [];
  let photos = [], active;
  const storage = {
    upload: async (_path, file) => { uploaded.push(file); return {}; },
    createSignedUrl: async () => ({ data: { signedUrl: 'https://example.com/kitchen.jpg' } }),
    remove: async () => ({}),
  };
  const client = {
    storage: { from: () => storage },
    from: () => ({
      select: () => ({ eq: () => ({ order: () => ({ limit: () => ({ maybeSingle: async () => {
        await new Promise(resolve => setTimeout(resolve, 1));
        return { data: { sort_order: 2 } };
      } }) }) }) }),
      insert: () => ({ select: () => ({ single: async () => ({ data: { id: 42 } }) }) }),
    }),
  };
  const context = vm.createContext({ listing: { id: 1 }, workspaceId: 'workspace', photoBusy: false,
    setPhotoBusy: value => busy.push(value), getSupabaseBrowserClient: () => client,
    setLocalPhotos: update => { photos = update(photos); }, setActivePhotoId: value => { active = value; },
    flash: value => notices.push(value), crypto: { randomUUID: () => 'test-id' },
  });
  vm.runInContext(uploadCode, context);
  // Execute the actual input handler. Resetting value empties the live file list.
  const handlerStart = source.indexOf('// Snapshot before clearing the input:');
  const handlerEnd = source.indexOf('\n                }}', handlerStart);
  const input = { files: picked, set value(_value) { picked.length = 0; } };
  let pending;
  vm.runInNewContext(source.slice(handlerStart, handlerEnd), {
    event: { target: input, currentTarget: input },
    addPhotos: files => { pending = context.addPhotos(files); return pending; },
  });
  await pending;
  assert.equal(picked.length, 0);
  assert.equal(uploaded.length, 1);
  assert.equal(photos[0].id, '42');
  assert.equal(active, '42');
  assert.deepEqual(busy, [true, false]);
  assert.equal(notices.at(-1), '1 photo added');
});

test('unexpected upload errors release the loading state and show an error', async () => {
  const busy = [], notices = [];
  const context = vm.createContext({ listing: { id: 1 }, photoBusy: false,
    setPhotoBusy: value => busy.push(value), flash: value => notices.push(value),
    getSupabaseBrowserClient: () => { throw new Error('Network failed'); },
  });
  vm.runInContext(uploadCode, context);
  await context.addPhotos([{ name: 'photo.jpg' }]);
  assert.deepEqual(busy, [true, false]);
  assert.equal(notices.length, 1);
});
