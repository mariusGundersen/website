---
title: Rotating earth-cube in CSS
short: I had to make a sandgame with WebGL, because someone was wrong on the internet
date: 2026-01-28
layout: post.html
---

I just saw a [small neat demo of a rotating earth cube using css and js](https://www.thomasweibel.ch/earthcube/), and thought to myself "I can do that in only css". So that is what I'll do here. 

This article is the written log of how I have done this, so it might be a bit weird and rambly. Here goes.

The first step is to get the 6 images and create an earth div with the six images. Note: The blog I'm writing this wraps `<img>` in `<picture>`, so I had to make it work with that. I couldn't be bothered to figure out how to disable the wrapping for this code only.

```html
<div class="earth">
  <picture><img src="./images/top.png"></picture>
  <picture><img src="./images/left.png"></picture>
  <picture><img src="./images/right.png"></picture>
  <picture><img src="./images/front.png"></picture>
  <picture><img src="./images/back.png"></picture>
  <picture><img src="./images/bottom.png"></picture>
</div>
```

<div class="earth">
  <img alt="top" src="./images/top.png">
  <img alt="left" src="./images/left.png">
  <img alt="right" src="./images/right.png">
  <img alt="front" src="./images/front.png">
  <img alt="back" src="./images/back.png">
  <img alt="bottom" src="./images/bottom.png">
</div>

The six images now need to be positioned into a cube. This can be done using the 3d css transform. For that to work we need to put the earth into a div that has some perspective applied, using the `perspective: 1000px` css rule.


<div class="space">
  <div class="earth">
    <img alt="top" src="./images/top.png">
    <img alt="left" src="./images/left.png">
    <img alt="right" src="./images/right.png">
    <img alt="front" src="./images/front.png">
    <img alt="back" src="./images/back.png">
    <img alt="bottom" src="./images/bottom.png">
  </div>
</div>

This was done with roughly this css: 

```css

.space {
  perspective: 1000px;
  display: grid;
  place-content: center;
  height: 400px;
  background: rgb(1, 5, 25);

  .earth {
    display: grid;
    transform-style: preserve-3d;
    width: 200px;
    height: 200px;
    animation: rotate 20s linear forwards infinite;

    picture {
      grid-area: 1 /1;
      transform-style: preserve-3d;
      
      img {
        position: absolute;
        top: 0;
        left: 0;
        width: 200px;
      }
    }

    [alt="top"]{
      transform: rotateX(-90deg) translateZ(100px);
    }
    [alt="bottom"]{
      transform: rotateX(90deg) translateZ(100px);
    }
    [alt="left"]{
      transform: rotateY(-90deg) translateZ(100px);
    }
    [alt="right"]{
      transform: rotateY(90deg) translateZ(100px);
    }
    [alt="front"]{
      transform: rotateX(0deg) translateZ(100px);
    }
    [alt="back"]{
      transform: rotateY(180deg) translateZ(100px);
    }
  }
}

@keyframes rotate {
  from {
    transform: rotateY(0turn) rotateX(0turn);
  }
  to {
    transform: rotateY(4turn) rotateX(1turn);
  }
}
```

This css makes a cube and makes the cube rotate slowly around two axis. It's now a rotating cube, but it does not have any light effects added to it.

## Lighting

My plan is to use some basic lighting effects for this demo, and therefore I looked into the [Phong reflection model](https://en.wikipedia.org/wiki/Phong_reflection_model). This controls how much light a material reflects from the ambient surrounding and from the direct light. This can be simulated in css using the [`brightness()`](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Values/filter-function/brightness) filter, which takes a value from 0 to 1, and beyond.

<div class="brightness-demo">
  <img alt="back" src="./images/back.png">
</div>

We could set this to a constant value for the six sides, and it would look like a cube with a directional light on it, but it would be pretty static. Look at this demo and see that each side has a different brightness, but the brightness doesn't change.

<div class="space static-light">
  <div class="earth">
    <img alt="top" src="./images/top.png">
    <img alt="left" src="./images/left.png">
    <img alt="right" src="./images/right.png">
    <img alt="front" src="./images/front.png">
    <img alt="back" src="./images/back.png">
    <img alt="bottom" src="./images/bottom.png">
  </div>
</div>

To solve this we need to imagine there is a strong light source somewhere in space, like a sun. We then need to see if each face points towards or away from the light source. The wikipedia page explains in more detail, but the simple solution is to take the dot product between the normal of the face and the direction to the light and to multiply this by some constants for the light source and the material. The brightness can be simplified to the sum of three components:

```css
--brightness: calc(var(--ambient-light, 0) + var(--diffuse-light, 0) + var(--specular-light, 0));
```

In the code above I set it so that if they aren't defined they don't contribute. This way we can add them as we go. The first step is to add some ambient light. That is just a constant value

```css
--ambient-light: 0.3;
```

<div class="space phong-light">
  <div class="earth">
    <img alt="top" src="./images/top.png">
    <img alt="left" src="./images/left.png">
    <img alt="right" src="./images/right.png">
    <img alt="front" src="./images/front.png">
    <img alt="back" src="./images/back.png">
    <img alt="bottom" src="./images/bottom.png">
  </div>
</div>

In order to find the light we need to use vector calculations. That means making some changes to the code we have so far so that we can use vectors for both the rotations and for doing the calculations for the light. So, let's replace the rotation of the earths 6 faces with some other code:

```css
.earth {
  img {
    transform: 
      rotateX(asin(var(--y))) 
      rotateY(calc(atan2(var(--x), var(--z)))) 
      translateZ(100px);
  }
  
  [alt="top"]{
    --x: 0;
    --y: -1;
    --z: 0;
  }
  [alt="bottom"]{
    --x: 0;
    --y: 1;
    --z: 0;
  }
  [alt="left"]{
    --x: -1;
    --y: 0;
    --z: 0;
  }
  [alt="right"]{
    --x: 1;
    --y: 0;
    --z: 0;
  }
  [alt="front"]{
    --x: 0;
    --y: 0;
    --z: 1;
  }
  [alt="back"]{
    --x: 0;
    --y: 0;
    --z: -1;
  }
}
```

This way we have a normal vector for each face that is also used to transform the face. This is a simplified calculation since we know that each face is orthogonal and points in one of the 6 directions. But we can use this to calculate the diffuse light of each face, for example by assuming it comes in from the top right corner:

```css
.earth {
  --d: 0.5;

  img {
    --diffuse-light: max(0, var(--d) * calc(var(--x) + var(--y) + var(--z)));
  }
}
```

<div class="space phong-light vectorized-cube">
  <div class="earth">
    <img alt="top" src="./images/top.png">
    <img alt="left" src="./images/left.png">
    <img alt="right" src="./images/right.png">
    <img alt="front" src="./images/front.png">
    <img alt="back" src="./images/back.png">
    <img alt="bottom" src="./images/bottom.png">
  </div>
</div>

This is a hacky trick that we now need to improve. The next step is to find the dot product between the normal vector of the face and the vector indicating how the earth has rotated. We can start with a simplified version where the earth rotates around a single axis only, the y-axis. Then we can find the vector of the earth using the trigonometric functions `sin()` and `cos()`. The dot-product of the face vector (`--x`, `--y`, `--z`) and the earth vector (`--earth-x`, `--earth-y`, `--earth-z`) says how much the face points towards the initial earth direction. We can assume the sun is over there.

```css
.earth.rotate-y {
  animation: rotate-y 5s linear forwards infinite;
  transform: rotateY(var(--rot-y));
  --earth-x: cos(var(--rot-y));
  --earth-y: 0;
  --earth-z: sin(var(--rot-y));
  
  img {
    --diffuse-light: max(
      0, 
      var(--d) * calc(
        calc(var(--earth-x) * var(--x)) + 
        calc(var(--earth-y) * var(--y)) +
        calc(var(--earth-z) * var(--z))
      )
    );
  }
}

@property --rot-y {
  syntax: "<angle>";
  inherits: true;
  initial-value: 0deg;
}

@keyframes rotate-y {
  from {
    --rot-y: 0turn;
  }
  to {
    --rot-y: 1turn;
  }
}

```

<div class="space phong-light vectorized-cube">
  <div class="earth rotate-y">
    <img alt="top" src="./images/top.png">
    <img alt="left" src="./images/left.png">
    <img alt="right" src="./images/right.png">
    <img alt="front" src="./images/front.png">
    <img alt="back" src="./images/back.png">
    <img alt="bottom" src="./images/bottom.png">
  </div>
</div>

We need some more complex math to rotate arund two axis. For one, we need another rotation varible, and we need to set up the animation to rotate around both the x and y axis:

```css
.space {
  .earth.rotate-xy {
    animation: rotate-xy 20s linear forwards infinite;
    transform: rotateY(var(--rot-y)) rotateX(var(--rot-x));
    --earth-x: cos(var(--rot-y));
    --earth-y: calc(0 - sin(var(--rot-x)))* sin(var(--rot-y));
    --earth-z: calc(cos(var(--rot-x)) * sin(var(--rot-y)));
    
    img {
      --diffuse-light: max(
        0, 
        var(--d) * calc(
          calc(var(--earth-x) * var(--x)) + 
          calc(var(--earth-y) * var(--y)) + 
          calc(var(--earth-z) * var(--z))
        )
      );
    }
  }
}

@keyframes rotate-xy {
  from {
    --rot-y: 0turn;
    --rot-x: 0turn;
  }
  to {
    --rot-y: 4turn;
    --rot-x: 1turn;
  }
}
```

<div class="space phong-light vectorized-cube">
  <div class="earth rotate-xy">
    <img alt="top" src="./images/top.png">
    <img alt="left" src="./images/left.png">
    <img alt="right" src="./images/right.png">
    <img alt="front" src="./images/front.png">
    <img alt="back" src="./images/back.png">
    <img alt="bottom" src="./images/bottom.png">
  </div>
</div>

This is cool, but the earth looks rather flat, it doesn't have any shinyness to it. For that we need specular light, which looks at how the light from the light source is reflected off the surface towards the viewer. For this demo I'm assuming the light source and the viewer is infinitly far away, so we don't need to worry about the position of the surface, only the rotation. This isn't entirely correct, but it doesn't matter much for this demo.

The code is getting rather complex, now that we need to do some more complex vector calculations to find how the light reflects off the surface and if this reflected light hits the camera or not.

```css

.space.specular-light {
  --s: 1;
  --alpha: 20;
  .earth {
    --view-x: calc(0 - sin(var(--rot-y)));
    --view-y: calc(0 - sin(var(--rot-x)))* cos(var(--rot-y));
    --view-z: calc(0 + cos(var(--rot-x)) * cos(var(--rot-y)));

    img {
      --light-normal-dp: calc(
        calc(var(--earth-x) * var(--x)) + 
        calc(var(--earth-y) * var(--y)) + 
        calc(var(--earth-z) * var(--z))
      );
      --r-x: calc(2 * var(--light-normal-dp) * var(--x) - var(--earth-x));
      --r-y: calc(2 * var(--light-normal-dp) * var(--y) - var(--earth-y));
      --r-z: calc(2 * var(--light-normal-dp) * var(--z) - var(--earth-z));

      --specular-light: calc(var(--s) * pow(
        max(
          0,
          calc(var(--view-x) * var(--r-x)) + 
          calc(var(--view-y) * var(--r-y)) + 
          calc(var(--view-z) * var(--r-z))
        ),
        var(--alpha)
      ));
    }
  }
}
```

<div class="space phong-light vectorized-cube specular-light">
  <div class="earth rotate-xy">
    <img alt="top" src="./images/top.png">
    <img alt="left" src="./images/left.png">
    <img alt="right" src="./images/right.png">
    <img alt="front" src="./images/front.png">
    <img alt="back" src="./images/back.png">
    <img alt="bottom" src="./images/bottom.png">
  </div>
</div>

## Control

The only thing missing now is a way to control the rotation. We can achieve that using scroll driven animation tied to the x and y scroll axis. Using a very large pseudo element we force the scroller to overflow. The space is positioned using sticky positioning so it doesn't move when we scroll. The animation is now tied to the scroller for both the x and y axis. Weirdly the y axis controls the x rotation and the x axis controls the y rotation.

```css

.scroller {
  overflow: scroll;
  height: 400px;
  position: relative;
  scroll-timeline: --scroller-x y, --scroller-y x;

  &::after {
    content: '';
    display: block;
    width: 300%;
    height: 300%;
  }

  .space {
    position: sticky;
    top: 0;
    left: 0;

    .earth {
      animation: rotate-x 1ms linear, rotate-y 1ms linear;
      animation-timeline: --scroller-x, --scroller-y;
    }
  }
}
```

<div class="scroller">
  <div class="space phong-light vectorized-cube specular-light">
    <div class="earth rotate-xy">
      <img alt="top" src="./images/top.png">
      <img alt="left" src="./images/left.png">
      <img alt="right" src="./images/right.png">
      <img alt="front" src="./images/front.png">
      <img alt="back" src="./images/back.png">
      <img alt="bottom" src="./images/bottom.png">
    </div>
  </div>
</div>

OK, that's enough for today. I'll admit that getting this to work wasn't easy, and it was really difficult to debug. 

I had to cheat a bit and assume some simple positions and rotations. I put the light source to the right, and it's not moving. The earth only rotates around two angles. If it was allowed to rotate around three axis or if the light was allowed to move the calculation would be a lot more complex.

I learned a few tricks though. For example, if you try to get the computed value of a complex css custom property calculation, it will just output the string of the definition. However, if you define it using the `@property --variable` declaration you can get the calculated value, as long as it's not using percentage. You can use `window.getComputedStyle($0).getPropertyValue('--variable')` to get the value of the variable. 

Another thing I want to mention is that it's really nice to have typed variables, specifically the `<angle>` type. In other languages you need to make sure you use radians and have to convert to and from when using the `sin()` and other trigonometric functions. But in css I can declare `--rot: 1turn`, `--rot: 360deg`, `--rot: 400grad` or `--rot: 6.2832rad` and it would all mean the same thing. This way you can use the unit that best suits the situation, for example using `4turn` to specify four complete rotations, but you could use `30deg` for smaller angles. I have not used any other language that works like this.

I also wish there was a way to use the transformation methods for other things than just transforming an element. I had to do all the vector calculation myself, but it would be nice to say `--vector: transform(rotateY(45deg), vector(1, 0, 0))`, for example. Not sure there is any real use for it, except for this demo.

<link rel="stylesheet" href="./style.css">