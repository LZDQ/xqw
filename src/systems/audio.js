export class AudioSystem {
  constructor(){
    this.enabled = false;
    this.sounds = {};
  }
  enable(listener){
    this.listener = listener;
    this.enabled = true;
  }
  play(name){
    if(!this.enabled) return;
    const s = this.sounds[name];
    if(s && s.isPlaying) s.stop();
    if(s) s.play();
  }
}
