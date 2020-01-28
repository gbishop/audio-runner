// generic FSM for games
class Game {
  constructor() {
    this.state = "start";
    this.rules = new Map();
    this.timers = new Map();
  }
  // bind a handler to an event
  on(eventName, state, guard, action) {
    let handlers = this.rules.get(eventName) || [];
    handlers.push({ state, guard, action });
    this.rules.set(eventName, handlers);
  }
  // call the appropriate handlers
  handle(eventName, arg = null) {
    let handlers = this.rules.get(eventName) || [];
    handlers = handlers.filter(
      h => h.state == this.state && (!h.guard || h.guard())
    );
    let result = handlers.map(h => h.action(arg));
    return result;
  }
  // create a timer killing old one if it exists
  newTimer(name, interval) {
    let id = this.timers.get(name);
    if (id) {
      clearInterval(id);
    }
    this.timers.set(
      name,
      setInterval(() => this.handle(name), interval)
    );
  }
}

// a wrapper for sounds
class mySound extends Howl {
  constructor(args) {
    super(args);
    this.baseVolume = 1.0;
  }

  // a hack to simulate distance
  setDistance(distance) {
    this.volume(this.baseVolume / Math.pow(Math.max(1, Math.abs(distance)), 1));
  }
}

// a wrapper for speech
function say(text) {
  var msg = new SpeechSynthesisUtterance(text);
  window.speechSynthesis.speak(msg);
}

// implement our game here
class Runner extends Game {
  constructor() {
    super();
    this.sounds = {};

    // start
    this.on("any", "start", null, () => {
      // load the sounds
      if (Object.keys(this.sounds).length === 0) {
        ["monster", "step"].map(name => {
          this.sounds[name] = new mySound({
            src: [`sounds/${name}.mp3`]
          });
        });
        this.sounds["monster"].baseVolume = 0.5;
        this.sounds["monster"].loop = true;
      }
      this.sounds["monster"].play();
      this.sounds["monster"].setDistance(this.playerX - this.chaserX);
      this.playerX = 0;
      this.playerMaxLead = 20;
      this.chaserX = this.playerX - this.playerMaxLead;
      this.newTimer("chaserStep", 200);
      this.newTimer("adjustVolume", 200);
      this.state = "running";
    });

    // run one step
    this.on("step", "running", null, () => {
      this.playerX += 1;
      document.querySelector("#score span").innerHTML = this.playerX;
      this.sounds["step"].play();
    });

    // let the chaser advance one step
    this.on(
      "chaserStep",
      "running",
      () => this.chaserX < this.playerX,
      () => {
        this.chaserX = Math.max(
          this.chaserX + 1,
          this.playerX - this.playerMaxLead
        );
        document.querySelector("#distance span").innerHTML =
          this.playerX - this.chaserX;
      }
    );

    // chaser catches player
    this.on(
      "chaserStep",
      "running",
      () => this.chaserX >= this.playerX,
      () => {
        this.state = "dying";
        this.sounds["monster"].stop();
        say("You die.");
        this.state = "start";
      }
    );

    // adjust volumes
    this.on("adjustVolume", "running", null, () => {
      this.sounds["monster"].setDistance(this.playerX - this.chaserX);
    });
  }
}

var runner = new Runner();

// hookup some simple event handlers
document.addEventListener("keydown", e => {
  switch (e.key) {
    case "ArrowUp":
      runner.handle("step");
      break;
    default:
      runner.handle("any");
      break;
  }
});
