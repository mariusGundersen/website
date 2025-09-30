---
title: Anchored definition popovers
short: A pure css solution to popovers anchored to the text that triggers them, with elegant animations.
layout: post.html
date: 2025-09-30
---


For a project at work I've had to implement <button popovertarget="definition">definition popovers</button>. These should pop up above the word and be easily dismissed, for example by clicking anywhere else on the page. For a while I've used JavaScript for this, but now it's (almost) possible to do it with only html and css. This page will explain how.

<div popover id="definition">
<h2>Definition popover</h2>
<p>Underlined words in text that when clicked create a popover with the definition of that word, like this one</p>
</div>

The first step is to make a popover that can be opened, and for that we need a button with [`popovertarget`](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/button#popovertarget) and a div with the [`popover`](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Global_attributes/popover) attribute.

```html
<p>
  Click <button popovertarget="id-0">here</button> to show a popover
</p>

<div popover id="id-0">
  <h2>Popover</h2>
  <p>This is the popover</p>
</div>
```

<div class="demo-div">
  <p>
    Click <button popovertarget="id-0">here</button> to show a popover
  </p>
  <div popover id="id-0">
    <h2>Popover</h2>
    <p>This is the popover</p>
  </div>
</div>

The popover is hidden by default, but is made visible when you click on the button. The button knows which popover to show because of the matching `popovertarget` and `id` attributes they both have.

Click on the button in the grey box above to see how it works. This is what the popover and button looks like without any special css; it produces a white box with a thick black border right in the middle of the screen. We need some css to convert this into the kind of popover we want.

<code-wave>

## Styling the button

Let's first style the button to not look like a button. It will be included in running text, so it needs to look like a link, not a button.

We style all buttons with a popovertarget that are direct children of paragraphs, and with the exact same html as before we get the following.

<style id='style-1'>
button[popovertarget="definition"],
#style-1 ~ * button[popovertarget],
*:has(#style-1) ~ * button[popovertarget] {
  all: unset;
  cursor: help;
  text-decoration: underline dashed;
  text-underline-offset: .1lh;

  &:hover {
    text-decoration: underline solid;
  }
}
</style>
<div class="demo-div">
  <p>
    Click
    <button popovertarget="id-1">
      here
    </button>
    to show a popover
  </p>
  <div popover id="id-1">
    <h2>Popover</h2>
    <p>This is the popover</p>
  </div>
</div>

```css
p > button[popovertarget] {
  all: unset;
  cursor: help;
  text-decoration: underline dashed;
}
```

## Styling the popover

Let's customize the popover a bit by setting a max-width, adding some padding and a border-radius, replacing the thick black border with a box-shadow, and use a friendlier sans-serif font.

<style id="style-2">
#definition[popover],
#style-2 ~ * [popover],
*:has(#style-2) ~ * [popover] {
  max-width: 400px;
  padding: 0.5em;
  border: none;
  box-shadow: 0 0 1em 0 rgba(0, 0, 0, 0.2);
  border-radius: 0.5em;

  h2,
  p {
    margin: 0;
    font-family: sans-serif;
  }
}
</style>
<div class="demo-div">
  <p>
    Click
    <button popovertarget="id-2">
      here
    </button>
    to show a popover
  </p>
  <div popover id="id-2">
    <h2>Popover</h2>
    <p>This is the popover</p>
  </div>
</div>

The popover looks nicer, but it is still opened at the center of the page. The browser sets a bunch of rules for the popover by default, like the black border that we removed in the previous step. The position of the popover is controlled by the browser using the rules `margin: auto;` and `inset: 0px`, which centers it in the screen.

```css
p > button[popovertarget] {
  all: unset;
  cursor: help;
  text-decoration: underline dashed;
}

[popover] {
  max-width: 400px;
  padding: 0.5em;
  border: none;
  box-shadow: 0 0 1em 0 rgba(0, 0, 0, 0.2);
  border-radius: 0.5em;

  h2,
  p {
    margin: 0;
    font-family: sans-serif;
  }
}
```

By setting the margin to `0` vertically and `1em` horizontally and unseting the `inset` (isn't that a fun combination of words) the popover is now placed in the top right corner.

<style id="style-3">
#definition[popover],
#style-3 ~ * [popover],
*:has(#style-3) ~ * [popover] {
  margin: 0 1em;
  inset: unset;
}
</style>
<div class="demo-div">
  <p>
    Click
    <button popovertarget="id-3">
      here
    </button>
    to show a popover
  </p>
  <div popover id="id-3">
    <h2>Popover</h2>
    <p>This is the popover</p>
  </div>
</div>

Now it's time to position the popover relative to the button.

```css
p > button[popovertarget] {
  all: unset;
  cursor: help;
  text-decoration: underline dashed;
}

[popover] {
  margin: 0 1em;
  inset: unset;
  max-width: 400px;
  padding: 0.5em;
  border: none;
  box-shadow: 0 0 1em 0 rgba(0, 0, 0, 0.2);
  border-radius: 0.5em;

  h2,
  p {
    margin: 0;
    font-family: sans-serif;
  }
}
```

This is the really interesting part, by using the new rules `bottom: achor(top)` and `justify-self: anchor-center` we place the popover centered above the button.

There is a subtle but very neat rule for `popovertarget` that there is an [implicit anchor association](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_anchor_positioning/Using#implicit_anchor_association) between the popover and the button. This means we don't have to be explicit about which anchor we want the popover to use, since there is an implicit one already. All we have to do is tell it where to place itself relative to the anchor element. That is very useful for our css, as it can be reused for multiple popovers.

<style id="style-4">
#definition[popover],
#style-4 ~ * [popover],
*:has(#style-4) ~ * [popover] {
  bottom: anchor(top);
  justify-self: anchor-center;
}
</style>
<div class="demo-div">
  <p>
    Click
    <button popovertarget="id-4">
      here
    </button>
    to show a popover
  </p>
  <p style="text-align: right">
    On the <button popovertarget="id-4">edge</button>
  </p>
  <div popover id="id-4">
    <h2>Popover</h2>
    <p>This is the popover, it is very wide</p>
  </div>
</div>

CSS takes care of a bunch of edge cases for us, like when the popup is at the edge of the screen. Clicking on the word `edge` in the box above opens the popover, but it does not go outside the viewport, even though it is quite wide and at the edge of the screen.

This popover opens in the right place, but it can still look a bit nicer. I want it to look like a speech bubble, with a little downward notch pointing to the button that was clicked. That is also easy to add, using the psudo element `::before`.

```css
p > button[popovertarget] {
  all: unset;
  cursor: help;
  text-decoration: underline dashed;
}

[popover] {
  margin: 0 1em;
  inset: unset;
  bottom: anchor(top);
  justify-self: anchor-center;
  max-width: 400px;
  padding: 0.5em;
  border: none;
  box-shadow: 0 0 1em 0 rgba(0, 0, 0, 0.2);
  border-radius: 0.5em;

  h2,
  p {
    margin: 0;
    font-family: sans-serif;
  }
}
```

The first two lines inside the `::before` pseudo-element control the position, just like for the popover. The rest of the rules are there just to style it to look like a downard notch. It needs `position: fixed` or else it cannot be positioned or have a size. It's made white and given a box-shadow and then rotated 45 degrees so that it looks like a downward arrow. The way it is placed and the shadow is offset makes it blend in with the rest of the popover. I also changed the popover to be `0.5em` above the anchor element, to make room for the notch.

<style id="style-5">
#definition[popover],
#style-5 ~ * [popover],
*:has(#style-5) ~ * [popover] {
  bottom: calc(anchor(top) + 0.5em);
  &::before {
    bottom: anchor(top);
    justify-self: anchor-center;
    transform: rotate(45deg);
    position: fixed;
    width: 1em;
    height: 1em;
    background-color: white;
    box-shadow: 0.5em 0.5em 1em 0 rgba(0, 0, 0, 0.1);
    content: '';
  }
}
</style>
<div class="demo-div">
  <p>
    Click
    <button popovertarget="id-5">
      here
    </button>
    to show a popover
  </p>
  <p style="text-align: right">
    On the <button popovertarget="id-5">edge</button>
  </p>
  <div popover id="id-5">
    <h2>Popover</h2>
    <p>This is the popover, it is very wide</p>
  </div>
</div>

One very neat effect is that this is also attached to the top center of the button, so while the popover itself will adjust its position to not go outside the screen, this one will stay stuck centered above the button. This is noticable when opening a popover close to the edge of the screen, where the popover is nudged sideways but the notch stays put, relative to the button. The result is an asymetric speech-bubble effect.

So far so good, but it's a bit jarring that it just appears and disappears, it would be nice with a subtle little animation.

```css
p > button[popovertarget] {
  all: unset;
  cursor: help;
  text-decoration: underline dashed;
}

[popover] {
  margin: 0 1em;
  inset: unset;
  bottom: calc(anchor(top) + 0.5em);
  justify-self: anchor-center;
  max-width: 400px;
  padding: 0.5em;
  border: none;
  box-shadow: 0 0 1em 0 rgba(0, 0, 0, 0.2);
  border-radius: 0.5em;

  &::before {
    bottom: anchor(top);
    justify-self: anchor-center;

    transform: rotate(45deg);
    position: fixed;
    width: 1em;
    height: 1em;
    background-color: white;
    box-shadow: 0.5em 0.5em 1em 0 rgba(0, 0, 0, 0.1);
    content: '';
  }

  h2,
  p {
    margin: 0;
    font-family: sans-serif;
  }
}
```

## Animating it

Let's first try to hide the popup slowly when you click away from it.

Ok, a lot going on here. The first thing I do is to change the `bottom` rules of both the `[popover]` and the `::before` pseudo-element to add the value of a css custom preperty called `--translate`. This way we can move the two elements up and down by changing the value of this property. The second argument of `var()`, the `0em`, is the default value if the property isn't set. The property is only set when [`:not(:popover-open)`](https://developer.mozilla.org/en-US/docs/Web/CSS/:popover-open), that is, when the popover is closed. Then it is also made transparent using the `opacity: 0` rule.

<style id="style-6">
#definition[popover],
#style-6 ~ * [popover],
*:has(#style-6) ~ * [popover] {
  bottom: calc(anchor(top) + 0.5em + var(--translate, 0em));
  transition-property: bottom, opacity, display, overlay;
  transition-duration: .3s;
  transition-timing-function: ease-out;
  transition-behavior: allow-discrete;

  &::before {
    transition: inherit;
    bottom: calc(anchor(top) + var(--translate, 0em));
  }

  &:not(:popover-open) {
    --translate: 1em;
    opacity: 0;
  }
}
</style>
<div class="demo-div">
  <p>
    Click
    <button popovertarget="id-6">
      here
    </button>
    to show a popover
  </p>
  <div popover id="id-6">
    <h2>Popover</h2>
    <p>Now click away, and see how this popover fades away upwards</p>
  </div>
</div>

Then it's time to animate these changes, by setting a bunch of `transition` rules. `transition-property` is set to `bottom` (so that it moves up), `opacity` (so it fades out) and then `display` and `overlay`. The last two are interesting, and are why there is also a [`transition-behavior: allow-discrete`](https://developer.mozilla.org/en-US/docs/Web/CSS/transition-behavior#discrete_animation_behavior) there. This rule makes it possible to transition properties that don't have intermediate values. `opacity` can easily transition between `0` and `1` but how can `display: block` transition to `display: none`? The answer is that it can't, but `allow-discrete` instead makes it wait for the `transition-duration` until it changes, therefore the popover is visible until it has completely faded out.

We also want the down arrow to fade out, so it inherits the entire `transition` property. Strangely it does not need to inherit the opacity, but it does neet to explicitly get the correct `bottom` property.

The last thing to do now is to make a neat animation when it appears.

```css
p > button[popovertarget] {
  all: unset;
  cursor: help;
  text-decoration: underline dashed;
}

[popover] {
  margin: 0 1em;
  inset: unset;
  bottom: calc(anchor(top) + 0.5em + var(--translate, 0em));
  justify-self: anchor-center;
  max-width: 400px;
  padding: 0.5em;
  border: none;
  box-shadow: 0 0 1em 0 rgba(0, 0, 0, 0.2);
  border-radius: 0.5em;

  transition-property: bottom, opacity, display, overlay;
  transition-duration: .3s;
  transition-timing-function: ease-out;
  transition-behavior: allow-discrete;

  &:not(:popover-open) {
    --translate: 0 1em;
    opacity: 0;
  }

  &::before {
    transition: inherit;

    bottom: calc(anchor(top) + var(--translate, 0em));
    justify-self: anchor-center;

    transform: rotate(45deg);
    position: fixed;
    width: 1em;
    height: 1em;
    background-color: white;
    box-shadow: 0.5em 0.5em 1em 0 rgba(0, 0, 0, 0.1);
    content: '';
  }

  h2,
  p {
    margin: 0;
    font-family: sans-serif;
  }
}
```

The [`@starting-style`](https://developer.mozilla.org/en-US/docs/Web/CSS/@starting-style) rule makes it possible to animate how an element appears. It defines what the element looks like just before it exists or is visible. Since we have transition rules they make it possible to transition our element into existance.

<style id="style-7">
#definition[popover],
#style-7 ~ * [popover],
*:has(#style-7) ~ * [popover] {

  @starting-style {
    --translate: -1em;
    opacity: 0;
    &::before {
      --translate: -1em
    }
  }
}
</style>
<div class="demo-div">
  <p>
    Click
    <button popovertarget="id-7">
      here
    </button>
    to show a popover
  </p>
  <div popover id="id-7">
    <h2>Popover</h2>
    <p>This is the popover</p>
  </div>
</div>

```css
p > button[popovertarget] {
  all: unset;
  cursor: help;
  text-decoration: underline dashed;
}

[popover] {
  margin: 0 1em;
  inset: unset;
  bottom: calc(anchor(top) + 0.5em + var(--translate, 0em));
  justify-self: anchor-center;
  max-width: 400px;
  padding: 0.5em;
  border: none;
  box-shadow: 0 0 1em 0 rgba(0, 0, 0, 0.2);
  border-radius: 0.5em;

  transition-property: bottom, opacity, display, overlay;
  transition-duration: .3s;
  transition-timing-function: ease-out;
  transition-behavior: allow-discrete;

  &:not(:popover-open) {
    --translate: 0 1em;
    opacity: 0;
  }

  &::before {
    transition: inherit;

    bottom: calc(anchor(top) + var(--translate, 0em));
    justify-self: anchor-center;

    transform: rotate(45deg);
    position: fixed;
    width: 1em;
    height: 1em;
    background-color: white;
    box-shadow: 0.5em 0.5em 1em 0 rgba(0, 0, 0, 0.1);
    content: '';
  }

  h2,
  p {
    margin: 0;
    font-family: sans-serif;
  }

  @starting-style {
    --translate: -1em;
    opacity: 0;

    &::before {
      --translate: -1em
    }
  }
}
```

</code-wave>

## Conclusion

This is a pure css popover that sticks to the word you clicked, and it is positioned correctly in the screen. Previously this would have required dozens of lines of js and very special care to make sure it didn't go outside the screen or did something else weird.

It should be noted where this works (or doesn't work). At time of writing the [popover](https://caniuse.com/mdn-api_htmlelement_popover) api has fairly good support and works in more than 85% of browsers. The [anchor](https://caniuse.com/css-anchor-positioning) positioning is supported only in Chrome (and Chrome-derived) browsers, but it is part of the [interop 2025](https://wpt.fyi/interop-2025) cross-browser effort to improve on web-standards, so is likely to be functional in all major browsers at the end of 2025. The animation is an enhancement, so even though not everyone supports [allow-discrete](https://caniuse.com/mdn-css_properties_display_is_transitionable) or [@starting-style](https://caniuse.com/mdn-css_at-rules_starting-style) that's not as important. The browsers that do support them get nice animations, others just get the basic popover experience.

Given that only about 70% of browsers today support these features you should be careful where you use this technique. If your users tend to use old browsers, then maybe wait a few more years. If you design for a backoffice system and know your users then it's easier to start uning new features. You can also use [@supports](https://developer.mozilla.org/en-US/docs/Web/CSS/@supports) to check if the current browser supports these features, and to use a fallback effect if they don't support it.

<style>
@supports not (bottom: anchor(top)) {
  div.demo-div::before {
    content: 'This browser does not support anchors!';
    color: darkred;
    background: pink;
    margin-bottom: .5em;
    display: block;
  }
}

div.demo-div {
  background: #eee;
  padding: 1em;
  > p {
    margin-block: 0;
  }
  margin-bottom: 1em;

  button {
    --pico-color: --pico-primary;
  }
}
</style>
