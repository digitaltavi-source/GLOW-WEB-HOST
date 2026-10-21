import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';

const read=(p:string)=>readFileSync(resolve(process.cwd(),p),'utf8');

test('public channel guidance never describes private process or specialist implementation',()=>{
  for(const file of ['adapters/chatgpt/README.md','adapters/web/README.md']){
    const text=read(file);
    assert.doesNotMatch(text,/\bH[123]\b|KIT[_ -]?[ABC]|CAP\.WEB\.|MODEL_SESSION_PRIVATE/iu,file);
  }
});

test('operator visible labels never expose internal step names',()=>{
  const html=read('public/operator.html');
  assert.doesNotMatch(html,/\bH[123]\b|KIT[_ -]?[ABC]|CAP\.WEB\./iu);
  const source=read('public/operator.js');
  assert.doesNotMatch(source,/Mission chưa có work H2|H2 · version|H2 vẫn cần khách hàng duyệt riêng/u);
});

test('Host release and sandbox are the only ordinary persistent git lines in documented policy',()=>{
  const policy=read('REPOSITORY_LAYOUT.md');
  assert.match(policy, /\x60main\x60 — single public release source/);
  assert.match(policy, /\x60sandbox\x60 — existing Host-only development/);
  assert.match(policy, /adapters\/chatgpt\//);
  assert.match(policy, /adapters\/web\//);
});
