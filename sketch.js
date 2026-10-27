const sprites = {};
const frames = {
  walk: [0, 21, 42, 63],
  run: [0, 20, 40, 60, 80, 100, 120, 140],
  jump: [0, 21, 42, 63, 84, 105, 126],
  fly: [0, 28, 56, 84, 112, 140, 168],
};
const frameSizes = {
  walk: { width: 16, height: 16 },
  run: { width: 16, height: 15 },
  jump: { width: 16, height: 16 },
  fly: { width: 23, height: 23 },
};
const heldKeys = new Set();
const touchInput = { left: false, right: false, jump: false };
const player = {
  x: 0,
  altitude: 0,
  verticalVelocity: 0,
  facing: 1,
  mode: "walk",
  animationTime: 0,
  lastDirectionTap: 0,
  lastDirection: 0,
  lastSpaceTap: 0,
  lastFlightTap: 0,
};

function preload() {
  sprites.walk = loadImage("1/walk/all(walk).png");
  sprites.run = loadImage("1/run/all(run).png");
  sprites.jump = loadImage("1/jump/all(jump).png");
  sprites.fly = loadImage("1/fly/all(fly).png");
}

function setup() {
  createCanvas(windowWidth, getCanvasHeight());
  noSmooth();
  player.x = width / 2;
  bindTouchControls();
}

function draw() {
  const deltaSeconds = min(deltaTime / 1000, 0.05);
  const groundY = height * 0.75;
  const direction = getDirection();
  const now = millis();
  const spriteScale = getSpriteScale(windowWidth, windowHeight);

  updatePlayer(direction, now, deltaSeconds);
  background("#cbd9df");
  noStroke();
  fill("#aebfc2");
  rect(0, groundY, width, height - groundY);
  stroke("#819a9d");
  strokeWeight(2);
  line(0, groundY, width, groundY);

  drawPlayer(groundY, spriteScale);
}

function updatePlayer(direction, now, deltaSeconds) {
  const flying = player.mode === "fly";
  const airborne = player.altitude > 0 || player.verticalVelocity > 0 || flying;
  const running = player.mode === "run" && direction !== 0;
  const speed = flying ? 250 : running ? 360 : 190;

  if (direction !== 0) {
    player.x += direction * speed * deltaSeconds;
    player.facing = direction;
    if (!flying && !airborne) {
      player.mode = running ? "run" : "walk";
    }
  } else if (!flying && !airborne) {
    player.mode = "walk";
  }

  if (flying && now - player.lastFlightTap > 1500) {
    player.mode = "jump";
    player.verticalVelocity = 0;
  }

  if (player.mode !== "fly" && (player.altitude > 0 || player.verticalVelocity > 0)) {
    player.verticalVelocity -= 1500 * deltaSeconds;
    player.altitude += player.verticalVelocity * deltaSeconds;
    if (player.altitude <= 0) {
      player.altitude = 0;
      player.verticalVelocity = 0;
      player.mode = direction !== 0 && player.mode === "run" ? "run" : "walk";
    }
  }

  if (player.altitude === 0 && player.mode === "jump") {
    player.mode = "walk";
  }
  player.animationTime += deltaSeconds;
}

function drawPlayer(groundY, spriteScale) {
  let animation = player.mode;
  if (animation !== "fly" && player.altitude > 0) animation = "jump";

  const sprite = sprites[animation];
  const size = frameSizes[animation];
  const animationFrames = frames[animation];
  const frameDuration = animation === "run" ? 0.075 : animation === "jump" ? 0.11 : 0.13;
  const idle = animation === "walk" && player.altitude === 0 && getDirection() === 0;
  const frameIndex = idle ? 0 : floor(player.animationTime / frameDuration) % animationFrames.length;
  const sourceX = animationFrames[frameIndex];
  const sourceWidth = min(size.width, sprite.width - sourceX);
  const drawWidth = size.width * spriteScale;
  const drawHeight = size.height * spriteScale;
  player.x = constrain(player.x, drawWidth / 2, width - drawWidth / 2);
  const screenX = player.x;
  const screenY = constrain(groundY - drawHeight - player.altitude, 0, height - drawHeight);

  push();
  translate(screenX, screenY);
  scale(player.facing, 1);
  image(sprite, -drawWidth / 2, 0, drawWidth, drawHeight, sourceX, 0, sourceWidth, size.height);
  pop();
}

function getDirection() {
  const left = keyIsDown(LEFT_ARROW) || keyIsDown(65) || touchInput.left;
  const right = keyIsDown(RIGHT_ARROW) || keyIsDown(68) || touchInput.right;
  if (left === right) return 0;
  return right ? 1 : -1;
}

function keyPressed() {
  const direction = keyToDirection(keyCode);
  const now = millis();

  if (direction !== 0 && !heldKeys.has(keyCode)) {
    if (direction === player.lastDirection && now - player.lastDirectionTap <= 300) {
      player.mode = "run";
    } else if (player.mode === "run") {
      player.mode = "walk";
    }
    player.lastDirection = direction;
    player.lastDirectionTap = now;
  }
  if (keyCode === 32 && !heldKeys.has(32)) pressSpace(now);

  heldKeys.add(keyCode);
  return false;
}

function keyReleased() {
  heldKeys.delete(keyCode);
  if (keyCode === LEFT_ARROW || keyCode === RIGHT_ARROW || keyCode === 65 || keyCode === 68) {
    if (player.mode === "run") player.mode = "walk";
  }
  return false;
}

function keyToDirection(code) {
  if (code === LEFT_ARROW || code === 65) return -1;
  if (code === RIGHT_ARROW || code === 68) return 1;
  return 0;
}

function pressSpace(now) {
  if (player.mode === "fly") {
    player.lastFlightTap = now;
    return;
  }

  if (now - player.lastSpaceTap <= 300) {
    player.mode = "fly";
    player.verticalVelocity = 0;
    player.altitude = max(player.altitude, 48);
    player.lastFlightTap = now;
  } else if (player.altitude === 0) {
    player.mode = "jump";
    player.verticalVelocity = 620;
  }
  player.lastSpaceTap = now;
}

function bindTouchControls() {
  document.querySelectorAll("[data-control]").forEach((button) => {
    const control = button.dataset.control;
    const start = (event) => {
      event.preventDefault();
      button.setPointerCapture(event.pointerId);
      if (control === "jump") {
        if (!touchInput.jump) pressSpace(millis());
        touchInput.jump = true;
      } else {
        const direction = control === "left" ? -1 : 1;
        const now = millis();
        if (direction === player.lastDirection && now - player.lastDirectionTap <= 300) {
          player.mode = "run";
        } else if (player.mode === "run") {
          player.mode = "walk";
        }
        player.lastDirection = direction;
        player.lastDirectionTap = now;
        touchInput[control] = true;
      }
    };
    const end = (event) => {
      event.preventDefault();
      if (control === "jump") touchInput.jump = false;
      else touchInput[control] = false;
      if (player.mode === "run") player.mode = "walk";
    };
    button.addEventListener("pointerdown", start);
    button.addEventListener("pointerup", end);
    button.addEventListener("pointercancel", end);
    button.addEventListener("lostpointercapture", end);
  });
}

function windowResized() {
  resizeCanvas(windowWidth, getCanvasHeight());
}

function getSpriteScale(viewWidth, viewHeight) {
  return min(constrain(min(viewWidth, viewHeight) / 110, 4, 7), viewWidth / 23, viewHeight / 80);
}

function getCanvasHeight() {
  return min(windowHeight, frameSizes.walk.height * getSpriteScale(windowWidth, windowHeight) * 5);
}
