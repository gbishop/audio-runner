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
        ["monster", "step", "dog", "whoosh", "bump"].map(name => {
          console.log("name", name);
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
      this.dogX = this.playerX + 1000; // far away
      this.side = 0;
      this.newTimer("chaserStep", 200);
      this.newTimer("adjustVolume", 200);
      this.newTimer("newDog", 10000);
      this.state = "running";
    });

    // run one step
    this.on("step", "running", null, () => {
      this.playerX += 1;
      if (this.playerX >= this.dogX) {
        this.sounds["bump"].play();
        this.playerX -= 3;
      }
      document.querySelector("#score span").innerHTML = this.playerX;
      this.sounds["step"].play();
    });

    // dodge a dog
    this.on(
      "dodge",
      "running",
      () => this.side != 0,
      direction => {
        if (
          (direction == "left" && this.side > 0) ||
          (direction == "right" && this.side < 0)
        ) {
          this.sounds["whoosh"].play();
          this.dogX = this.playerX + 1000; // put it far away
          this.sounds["dog"].stop();
          this.side = 0;
        }
      }
    );

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

    // dog appears, avoid it
    this.on("newDog", "running", null, () => {
      this.dogX = this.playerX + 10;
      this.sounds["dog"].play();
      this.side = Math.random() > 0.5 ? -1 : 1;
      console.log("dog", this.dogX, this.side);
      this.sounds["dog"].stereo(this.side);
      console.log("side", this.side);
    });

    // adjust volumes
    this.on("adjustVolume", "running", null, () => {
      this.sounds["monster"].setDistance(this.playerX - this.chaserX);
      this.sounds["dog"].setDistance(this.dogX - this.playerX);
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
    case "ArrowLeft":
      runner.handle("dodge", "left");
      break;
    case "ArrowRight":
      runner.handle("dodge", "right");
      break;
    default:
      runner.handle("any");
      break;
  }
});
