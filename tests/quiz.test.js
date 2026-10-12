import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { selectRange, buildBalancedQuestions, buildReviewQuestions, pendingMistakes } from '../src/quiz.js';
import { readAttempts, saveAttempts, STORAGE_KEY } from '../src/storage.js';
const entries = JSON.parse(readFileSync(new URL('../characters.json', import.meta.url))).map(x=>x.char);
const record = (q, n, round='r', correct=true) => ({ ...q, roundId:round,questionNumber:n,selectedChar:correct?q.targetChar:q.options.find(c=>c!==q.targetChar),correct,answeredAt:new Date().toISOString(),responseTimeMs:100, mode:'normal' });
test('1–40: four rounds cover every target once; every subsequent cycle stays even',()=>{
 const bank=selectRange(entries,1,40).chars, attempts=[];
 for(let round=0;round<40;round++){
  const qs=buildBalancedQuestions(bank,attempts);assert.equal(qs.length,10);assert.equal(new Set(qs.map(q=>q.targetChar)).size,10);
  for(const q of qs){assert.equal(new Set(q.options).size,4);assert(q.options.includes(q.targetChar));assert(q.options.every(c=>bank.includes(c)));}
  attempts.push(...qs.map((q,i)=>record(q,i+1,String(round))));
  const counts=bank.map(c=>attempts.filter(a=>a.targetChar===c).length);assert(Math.max(...counts)-Math.min(...counts)<=1);
  if(round===3)assert.equal(new Set(attempts.map(a=>a.targetChar)).size,40);
 }
});
test('history imbalance, legacy records, review exclusion and overlapping ranges',()=>{
 const bank=entries.slice(0,40);const repeated=Array.from({length:30},(_,i)=>record({targetChar:bank[0],options:bank.slice(0,4)},i));delete repeated[0].mode;
 const reviews=bank.slice(1,30).map((targetChar,i)=>({...record({targetChar,options:[targetChar,...bank.filter(c=>c!==targetChar).slice(0,3)]},i),mode:'review'}));
 const qs=buildBalancedQuestions(bank,[...repeated,...reviews]);assert(qs.every(q=>q.targetChar!==bank[0]));
 const overlap=buildBalancedQuestions(bank.slice(0,20),repeated);assert(overlap.every(q=>q.targetChar!==bank[0]));
});
test('review preserves original option order and range, including repeated review',()=>{
 const q=buildBalancedQuestions(entries.slice(0,40),[])[0];const a={...record(q,3,'original',false),range:{start:1,end:40}};
 const reviewed=buildReviewQuestions([a])[0];assert.deepEqual(reviewed.options,a.options);assert.notEqual(reviewed.options,a.options);assert.deepEqual(reviewed.range,a.range);assert.equal(reviewed.sourceQuestionNumber,3);assert.equal(reviewed.sourceRoundId,'original');
 const again=buildReviewQuestions([{...record(reviewed,1,'retry',false),mode:'review',range:reviewed.range}])[0];assert.deepEqual(again.options,a.options);
 assert.deepEqual(pendingMistakes([a]).map(x=>x.targetChar),[a.targetChar]);assert.equal(pendingMistakes([a,{...record(reviewed,1,'retry'),mode:'review'}]).length,0);
});
test('range uses source indices before deduplication and validates input',()=>{
 assert.equal(selectRange(entries,5,100).chars.length,96);assert.equal(selectRange(entries,5,100).chars[0],entries[4]);
 assert.deepEqual(selectRange(['一','一','二','三','四','五'],2,5).chars,['一','二','三','四']);
 for(const range of [[0,40],[1,1301],[40,1],['',40],[1.2,40],[1,3]])assert.throws(()=>selectRange(entries,...range));
 assert.equal(buildBalancedQuestions(entries.slice(0,4),[]).length,4);
});
test('existing storage survives migration and review retains lineage after reload',()=>{
 const data=new Map(),storage={getItem:k=>data.get(k)??null,setItem:(k,v)=>data.set(k,v)};
 const old=record(buildBalancedQuestions(entries.slice(0,40),[])[0],1,'old',false);delete old.mode;
 storage.setItem(STORAGE_KEY,JSON.stringify([old]));assert.deepEqual(readAttempts(storage),[old]);
 const q=buildReviewQuestions(readAttempts(storage))[0],review={...record(q,1,'review'),mode:'review'};
 saveAttempts(storage,[old,review]);assert.equal(readAttempts(storage).length,2);assert.deepEqual(readAttempts(storage)[1].options,old.options);
 saveAttempts(storage,[old,review]);assert.equal(readAttempts(storage).length,2);
 storage.setItem(STORAGE_KEY,'broken');assert.throws(()=>saveAttempts(storage,[old]));assert.equal(storage.getItem(STORAGE_KEY),'broken');
});
