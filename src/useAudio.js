import { ref, onBeforeUnmount } from 'vue';
import '../audio-data.js';
export function useAudio() {
  const status = ref('');
  const audio = new Audio();
  audio.preload = 'auto';
  let generation = 0, timer, utterance;
  function stop() {
    generation++; clearTimeout(timer); audio.pause(); utterance = null;
    window.speechSynthesis?.cancel();
  }
  function play(char) {
    stop();
    const clip = window.LITERACY_AUDIO?.[char];
    if (!clip) { status.value = '读音文件未加载，请刷新或使用备用系统朗读。'; return; }
    const token = generation;
    audio.src = `data:audio/mpeg;base64,${clip}`;
    status.value = '正在加载读音…';
    // Stay in the user gesture call stack for iOS/WeChat.
    audio.play()?.catch(error => {
      if (token !== generation) return;
      status.value = error.name === 'NotAllowedError' ? '播放被暂停，请再点一次“听一听”。' : '播放失败，请重试或使用备用系统朗读。';
    });
  }
  audio.onplaying = () => { status.value = '正在读题…'; };
  audio.onended = () => { status.value = '没听清？再点一次“听一听”。'; };
  audio.onerror = () => { status.value = '音频播放失败，请重试或使用备用系统朗读。'; };
  function system(char) {
    stop();
    if (!window.speechSynthesis || !window.SpeechSynthesisUtterance) { status.value = '浏览器不支持系统朗读，请使用“听一听”或家长辅助读题。'; return; }
    const u = new SpeechSynthesisUtterance(char); utterance = u;
    u.lang = 'zh-CN'; u.rate = 0.7;
    const voices = speechSynthesis.getVoices();
    const voice = voices.find(v => /^zh[-_]CN$/i.test(v.lang)) || voices.find(v => /^zh/i.test(v.lang));
    if (voice) u.voice = voice;
    status.value = '正在读题…';
    u.onstart = () => { if (utterance === u) clearTimeout(timer); };
    u.onend = () => { if (utterance === u) { clearTimeout(timer); status.value = '朗读结束。'; } };
    u.onerror = () => { if (utterance === u) { clearTimeout(timer); status.value = '系统朗读失败，请点击“听一听”。'; } };
    timer = setTimeout(() => { if (utterance === u) status.value = '系统朗读未响应，请点击“听一听”。'; }, 4000);
    speechSynthesis.resume(); speechSynthesis.speak(u);
  }
  window.addEventListener('pagehide', stop);
  onBeforeUnmount(() => { stop(); window.removeEventListener('pagehide', stop); });
  return { status, play, stop, system };
}
