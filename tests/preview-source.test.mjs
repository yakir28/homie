import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

// Run the real hook across poll updates, retaining state as a mounted player does.
function mountedPreview() {
  let state, initialized=false, effect;
  const code=ts.transpileModule(readFileSync(new URL('../lib/use-preview-source.ts',import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText;
  const context=vm.createContext({exports:{},require:()=>({
    useState(initial){if(!initialized){state=initial;initialized=true;}return [state,update=>{state=typeof update==='function'?update(state):update;}];},
    useEffect(callback){effect=callback;}
  })});
  vm.runInContext(code,context);
  return url=>{context.exports.usePreviewSource(url);effect();return context.exports.usePreviewSource(url);};
}
test('polling signed URLs cannot reset an open player source',()=>{
 const render=mountedPreview();
 assert.equal(render('/video?signature=first'),'/video?signature=first');
 for(let i=0;i<20;i++)assert.equal(render(`/video?signature=refresh${i}`),'/video?signature=first');
 assert.equal(render(undefined),'/video?signature=first');
});
test('a generating video can acquire its source, then remain stable',()=>{
 const render=mountedPreview();assert.equal(render(undefined),undefined);
 assert.equal(render('/ready'),'/ready');assert.equal(render('/refreshed'),'/ready');
});
test('reopening mounts a preview with the latest URL',()=>{
 assert.equal(mountedPreview()('/old'),'/old');assert.equal(mountedPreview()('/new'),'/new');
});
