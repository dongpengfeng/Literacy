const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
class Element {
  constructor(){this.children=[];this.handlers={};this.style={setProperty(){}};this.classList={add(){}};this.playCount=0;}
  addEventListener(name, fn){this.handlers[name]=fn;}
  append(...nodes){this.children.push(...nodes);}
  replaceChildren(...nodes){this.children=nodes;}
  setAttribute(){} focus(){} pause(){this.paused=true;}
  play(){this.playCount++;this.paused=false;return this.failure?Promise.reject(this.failure):Promise.resolve();}
}
const elements = new Map();
const get=id=>{if(!elements.has(id))elements.set(id,new Element());return elements.get(id)};
const html=fs.readFileSync('index.html','utf8');
get('default-characters').textContent=html.match(/id="default-characters" type="application\/json">([\s\S]*?)<\/script>/)[1];
const ctx=vm.createContext({document:{getElementById:get,querySelector:get,createElement:()=>new Element()},window:{addEventListener(){}},localStorage:{getItem:()=>null,setItem(){}},crypto:require('node:crypto').webcrypto,performance,setTimeout,clearTimeout});
vm.runInContext(fs.readFileSync('audio-data.js','utf8'),ctx);
vm.runInContext(fs.readFileSync('app.js','utf8'),ctx);
const run=code=>vm.runInContext(code,ctx);
(async()=>{
 const records=JSON.parse(get('default-characters').textContent);
 const chars=[...new Set(records.map(r=>r.char))];
 assert.equal(chars.length,1277);
 for(const c of chars){const data=Buffer.from(ctx.window.LITERACY_AUDIO[c],'base64');assert(data.length>500,c);assert.equal(data.subarray(0,3).toString(),'ID3',c);}
 const player=get('pronunciation');
 run('startRound()');assert.equal(player.playCount,1);assert(player.src.startsWith('data:audio/mpeg;base64,'));
 run('speak()');assert.equal(player.playCount,2);
 player.failure={name:'NotAllowedError'};run('speak()');await Promise.resolve();assert(get('speech-status').textContent.includes('听一听'));
 player.failure={name:'NotSupportedError'};run('speak()');await Promise.resolve();assert(get('speech-status').textContent.includes('音频未能播放'));
 player.failure=null;run('choose(questions[questionIndex].targetChar);nextQuestion()');assert.equal(player.playCount,5);
 run('stopSpeech()');assert(player.paused);
 const char=run('questions[questionIndex].targetChar');delete ctx.window.LITERACY_AUDIO[char];run('speak()');assert(get('speech-status').textContent.includes('未加载'));
 run('speakWithSystem()');assert(get('speech-status').textContent.includes('不支持'));
 console.log('PASS: 1277 MP3 clips, file initialization without speechSynthesis, click playback, blocked/failed playback hints, next-question playback, stop and missing-audio fallback.');
})().catch(e=>{console.error(e);process.exitCode=1});
