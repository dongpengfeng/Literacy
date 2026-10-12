import test from 'node:test';
import assert from 'node:assert/strict';
import { RANGE_KEY, readRange, saveRange } from '../src/storage.js';
const entries = [...'一二三四五六七八九十'];
function storage() { const map=new Map();return {getItem:k=>map.get(k)??null,setItem:(k,v)=>map.set(k,v)}; }
test('range survives reload, persists endpoints, and retains last valid choice while editing',()=>{
 const s=storage();assert.deepEqual(readRange(s,entries),{start:1,end:10});
 saveRange(s,entries,3,8);assert.deepEqual(readRange(s,entries),{start:3,end:8});
 assert.throws(()=>saveRange(s,entries,'',8));assert.deepEqual(readRange(s,entries),{start:3,end:8});
});
test('corrupt, out-of-range, or obsolete ranges safely default to current bank',()=>{
 const s=storage();for(const raw of ['bad','null','{}','{"start":1,"end":1300}','{"start":5,"end":2}']){s.setItem(RANGE_KEY,raw);assert.deepEqual(readRange(s,entries),{start:1,end:10});}
});
