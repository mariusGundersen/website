---
title: Optimizing a sandgame using WebGL, the right way
short: I had to make a sandgame with WebGL, because someone was wrong on the internet
date: 2026-01-13
---

During the Christmas break I watched a YouTube video on optimzing a sand game. I got very excited when I saw the video, since I played around with this back when Flash was a thing. So as I started to watch the video I thought about how he was going to optimize the game, for example using quad-trees on the CPU, or using the GPU. He went for the GPU solution, which excited me even more, since I had played around with that ages ago, for my Ekkiog project. But then things started to go wrong. He asked ChatGPT for help, and the AI assistant gave him the wrong suggestion. He went with the suggestion, implementing code that wasn't at all paralellizable, which completely negates the point of having the GPU do it. I was not the only one to notice, several people pointed out in the comments that there was a better solution. And since someone was wrong on the internet it meant I had to correct them.

<div>
  <sand-game>Test</sand-game>
</div>

## A sand game

A sand game is a simple 2D game where you click on the screen to draw sand that will fall down and form piles when it lands on the floor or other obstacles. You can expand on it beyond that with other things, like water, fire, snow, etc, but I'll stick to sand for now.

In the video he describes the simple rules for sand, and this part I really like. It also translates well to a GPU since the rules are for each cell individually.

<svg viewbox="-1 -1 602 602" xmlns="http://www.w3.org/2000/svg">
  <rect x=0 y=0 width=200 height=200 fill=none stroke=red></rect>
  <rect x=200 y=0 width=200 height=200 fill=none stroke=red></rect>
  <rect x=400 y=0 width=200 height=200 fill=none stroke=red></rect>
  <rect x=0 y=200 width=200 height=200 fill=none stroke=red></rect>
  <rect x=200 y=200 width=200 height=200 fill=red stroke=red></rect>
  <rect x=400 y=200 width=200 height=200 fill=none stroke=red></rect>
  <rect x=0 y=400 width=200 height=200 fill=none stroke=red></rect>
  <rect x=200 y=400 width=200 height=200 fill=none stroke=red></rect>
  <rect x=400 y=400 width=200 height=200 fill=none stroke=red></rect>
</svg>

The cell in the middle only needs to check the cells around it to find out what to do in the next frame:

1. If there is nothing below it, then it will fall down.
2. If there is something below it, then it will check if there is anything besides the cell below
    1. If there is nothing in the bottom left, it goes there
    2. If there is nothing in the bottom right, it goes there
3. If all three cells below it are filled, it stays put.

See the video for a very good explanation of how this works.

## In WebGL

WebGL is a techonolgy for running code on the GPU in the browser. It is based on OpenGL ES 2, which means it is very limited compared to what you can do natively with modern graphics cards. But its enough for us to make a simple sand game.

WebGL can run programs called fragment shaders on the graphics cards. These are very simple programs not written in JavaScript but in GLSL, a C like language that compiles to and runs directly on the graphics card. A fragment shader is run once for every pixel in the viewport, and the only output of the shader is the color of a single pixel. The GPU runs the shader for each pixel in parallel, which produces the final image. So if you have a 640x480 viewport it runs this shader program 307 200 times.

This limitation means we need to rewrite the logic from the perspective of one pixel at a time. So instead of saying that the sand falls down, from one pixel to the pixel below, we need to split this rule in two:

1. If this pixel is sand and the pixel below is empty, then this pixel becomes empty
2. If this pixel is empty and the pixel above is sand, then this pixel becomes sand

These two rules complement each other, and as long as all our rules do that, we conserve the sand in our game (no sand is lost).

## GLSL

I'm going to skip some details of the shader and only focus on the simplified logic. If you are curious you can look at the shader code in the source code of this page.

```glsl
vec4 getNextState() {
  vec4 self = lookup(0.0, 0.0);

  return self;
}
```

This is the trivial example; the next state is whatever it was before. So, if this was sand it stays sand, and if it was air it stays air.

```glsl
vec4 getNextState() {
  vec4 self = lookup(0.0, 0.0);

  if (isSand(self)) {
    vec4 below = lookup(0.0, -1.0);
    if (isAir(below)) {
      return below;
    } else {
      return self;
    }
  } else {
    vec4 above = lookup(0.0, 1.0);
    if (isSand(above)) {
      return above;
    } else {
      return self;
    }
  }

  return self;
}
```

This code is the rule from above, where sand falls downwards on the screen. Note that the sand doesn't accelerate; we assume that the sand is light enough to reach terminal velocity very quickly and fall with a steady rate.

If you play with this you will notice that the sand falls but then piles up and forms tall pillars of sand. That's not very realistic. We need it to fall piles, so it needs to roll down to the left or right.

The main problem from the video is how to deal with sand falling both to the left and right at the same time. If sand can fall into a cell from both sides, how do we deal with that?

My solution is to make the sand only fall to one side, for example only to the left.

```glsl
vec4 getNextState() {
  vec4 self = lookup(0.0, 0.0);

  if (isSand(self)) {
    vec4 below = lookup(0.0, -1.0);
    if (isAir(below)) {
      return below;
    } else {
      vec4 diagonally = lookup(1.0, -1.0);
      if (isAir(diagonally)) {
        return diagonally;
      } else {
        return self;
      }
    }
  } else {
    vec4 above = lookup(0.0, 1.0);
    if (isSand(above)) {
      return above;
    } else {
      vec4 diagonally = lookup(-1.0, 1.0);
      vec4 besides = lookup(-1.0, 0.0);
      if (isSand(besides) && isSand(diagonally)) {
        return diagonally;
      } else {
        return self;
      }
    }
  }
}
```

In this case it will form triangular piles of sand. That's not very realistic. But there is a simple trick to fix this: make it fall to the left and right every other frame.

```glsl
vec4 getNextState() {
  vec4 self = lookup(0.0, 0.0);

  if (isSand(self)) {
    vec4 below = lookup(0.0, -1.0);
    if (isAir(below)) {
      return below;
    } else {
      vec4 diagonally = lookup(direction, -1.0);
      if (isAir(diagonally)) {
        return diagonally;
      } else {
        return self;
      }
    }
  } else {
    vec4 above = lookup(0.0, 1.0);
    if (isSand(above)) {
      return above;
    } else {
      vec4 diagonally = lookup(-direction, 1.0);
      vec4 besides = lookup(-direction, 0.0);
      if (isSand(besides) && isSand(diagonally)) {
        return diagonally;
      } else {
        return self;
      }
    }
  }
}
```

This solves the problem and makes the piles of sand symetrical. It also makes the sand roll down the pile more slowly than it falls down the air, sinec it will only roll every other frame. I see this as a feature, not a bug, as it makes sense that the sand rolls more slowly than it falls. Since it is moving diagonally it moves 1.4 pixels when it rolls, so only moving every other frame makes it move at 0.7 pixels per frame, compared to falling at 1 pixel per frame.

And that's about it for teh fragment shader. It can obviously be improved and expanded upon with other features, like platforms, water, fire, snow, etc, but that's beyond the scope of this article.

## Textures in WebGL

Another problem in the video is reading from and writing to the same data. That's not possible in WebGL; you need to read from something and write to something else. In WebGL textures are used to store pixel data, so we need to lookup the sand information from one texture and then render to another texture. The trick is to use two texture and then swap them, so in the next frame we read from the one we just wrote to, and then write to the outdated one. Then swap back again. The relevant code looks something like this:

```js
let from = createTexture();
let to = createTexture();

let frame = 0;
requestAnimationFrame(function render() {

  // swap the two textures
  [from, to] = [to, from];

  frame++;

  // simulate the sand falling
  simulate(
    from,
    to,
    frame % 2 === 0 ? 1 : -1
  );

  // render the texture we simulated into
  render(to);

  requestAnimationFrame(render);
});
```

The end result is the sand game below:

Try to click around and play with the sand
