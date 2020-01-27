# Runner

Ideas for a simple endless runner game.

I'm assuming you're going to tap to run. You have to run or you are captured by something chasing you. 

## state: running
### event: tap
play footstep, increment player position, increment score

### event: chaser timestep
increment chaser position
adjust chaser volume

### event: chaser timestep
### guard: player position less than chaser
state = die

### event: hazard timestep
hazardSide = choose [left, right]
hazardX = random offset ahead of player
start hazard sound

### event: tap
### guard: hazardSide != none
adjust hazard volume

### event: tap
### guard: hazardSide != none && playerX > hazardX
die

### event: swipe
### guard: hazardSide == swipeDirection
die

### event: swipe
### guard: hazardSide != swipeDirection
hazardSide = none
stop hazard sound
increment score
play successful avoidance sound

### event: swipe
### guard: hazardSize == none
increment chaser position like you lost time


