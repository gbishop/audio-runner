// wrap in a function so we can start after user action
// so that audio will be enabled
function main() {
  // generic FSM for games
  class Game {
    constructor() {
      this.state = "start";
      this.rules = new Map();
    }
    on(eventName, state, guard, action) {
      let handlers = this.rules.get(eventName) || [];
      handlers.push({ state, guard, action });
      this.rules.set(eventName, handlers);
    }
    handle(eventName) {
      let handlers = this.rules.get(eventName) || [];
      handlers = handlers.filter(
        h => h.state == this.state && (!h.guard || h.guard())
      );
      let result = handlers.map(h => h.action());
      return result;
    }
  }

  // a wrapper for sounds
  class mySound extends Howl {
    constructor(args) {
      super(args);
      this.baseVolume = 1.0;
    }

    setDistance(distance) {
      this.volume(
        this.baseVolume / Math.pow(Math.max(1, Math.abs(distance)), 1)
      );
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
      this.playerX = 0;
      this.playerMaxLead = 20;
      this.chaserX = this.playerX - this.playerMaxLead;

      // start
      this.on("start", "start", null, () => {
        monsterSound.play();
        monsterSound.setDistance(this.playerX - this.chaserX);
        this.state = "running";
      });

      // run one step
      this.on("step", "running", null, () => {
        this.playerX += 1;
        document.querySelector("#score span").innerHTML = this.playerX;
        stepSound.play();
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
          monsterSound.stop();
          say("You die.");
        }
      );

      // adjust volumes
      this.on("adjustVolume", "running", null, () => {
        monsterSound.setDistance(this.playerX - this.chaserX);
      });
    }
  }

  // create some sounds
  var stepSound = new mySound({
    src: ["astep.mp3"]
  });

  var monsterSound = new mySound({
    src: ["amonster.mp3"],
    loop: true
  });

  monsterSound.baseVolume = 0.5;
  var runner = new Runner();

  // hookup some simple event handlers
  document.addEventListener("keydown", e => {
    switch (e.key) {
      case "ArrowUp":
        runner.handle("step");
        break;
    }
  });

  setInterval(() => {
    runner.handle("chaserStep");
  }, 200);
  setInterval(() => {
    runner.handle("adjustVolume");
  }, 200);
  runner.handle("start");
}

// kick things off on a click to avoid browser limits
document.addEventListener("click", main);
