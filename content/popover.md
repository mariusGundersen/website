---
layout: post.html
---

# Anchored definition popovers

For a project at work I've had to implement definition popovers; underlined words in text that when clicked create a popover with the definition of that word. These should pop up above the word and be easily dismissed, for example by clicking anywhere else on the page. For a while I've used JavaScript for this, but now it's (almost) possible to do it with only html and css. This page will explain how.

The first step is to make a popover that can be opened, and for that we need a button.

```html
<p>
  Click
  <button popovertarget="id-0">
    here
    <div popover id="id-0">
      <h2>Popover</h2>
      <p>This is the popover</p>
    </div>
  </button>
  to show a popover
</p>
```

<p>
  Click
  <button popovertarget="id-0">
    here
    <div popover id="id-0">
      <h2>Popover</h2>
      <p>This is the popover</p>
    </div>
  </button>
  to show a popover
</p>

Clicking on the button opens a popover because the button has a popovertarget. The popover doesn't look very nice, but we can use css to fix that.

Before we look at that, a quick note on why the popover is inside the button. I want to use this popover in running text, for example inside a paragraph, and it's not legal in html to put a `<div>` inside a `<p>`. It is however legal to put a `<div>` inside a `<button>` and a `<button>` inside a `<p>`!

## Styling the button

Let's first style the button to not look like a button. It will be included in running text, so it needs to look like a link, not a button.

```css
p>button[popovertarget] {
  all: initial;
  cursor: help;
  text-decoration: underline dashed;
}
```

We style all buttons with a popovertarget that are direct children of paragraphs, and with the exact same html as before we get the following.

<div>
  <p>
    Click
    <button popovertarget="id-1">
      here
      <div popover id="id-1">
        <h2>Popover</h2>
        <p>This is the popover</p>
      </div>
    </button>
    to show a popover
  </p>
</div>

## Styling the popover

Let's customize the popover a bit by setting a max-width, adding some padding and a border-radius, replacing the thick black border with some shadow, and change the content of the popover to be a nicer sans-serif text.

<div>
  <p>
    Click
    <button popovertarget="id-2">
      here
      <div popover id="id-2">
        <h2>Popover</h2>
        <p>This is the popover</p>
      </div>
    </button>
    to show a popover
  </p>
</div>

```css
p > button[popovertarget] > [popover] {
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

The popover looks nicer, but it is still opened at the center of the page. That is because the `margin: auto;` rule in the browser places the popover in the center of the page. We want to attach the popover to the button, and we do that with these four properties:

```css
margin: 1em;
inset: unset;
bottom: calc(anchor(top) + 0.5em);
justify-self: anchor-center;
```

<div>
  <p>
    Click
    <button popovertarget="id-3">
      here
      <div popover id="id-3">
        <h2>Popover</h2>
        <p>This is the popover</p>
      </div>
    </button>
    to show a popover
  </p>
</div>

The first one sets the `margin` to `0` vertically and `1em` horizontally, so that the popover can go almost all the way out to the side. The next one unsets the `top`, `left`, `right` and `bottom` properties in one single rule. Then we get to the interesting one, setting the `bottom` of this popover to be `0.5em` above the button. When a popover is opened from a button using a popovertarget there is an implicit anchor available to the popover, that is why we can use `anchor(top)` here without specifying which anchor. And then `justify-self: anchor-center` causes the popover to be centered above the button.

This is all we really need, now the popover will be centered above the button, if there is enough room. The popover will never be pushed offscreen, even if the button is close to the edge of the screen. CSS does all of this automatically for us!

I want this popover to look like a speech bubble though, with a little downward notch pointing to the button that was clicked. That is also easy to add, using the psudo element `::before`.

```css
::before {
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
```

<div>
  <p>
    Click
    <button popovertarget="id-4">
      here
      <div popover id="id-4">
        <h2>Popover</h2>
        <p>This is the popover</p>
      </div>
    </button>
    to show a popover
  </p>
</div>

Again we can use `bottom: anchor(top)` and `justify-self: anchor-center` to attach this to the top center of the button. The other rules make this element just `1em` in width and height and by rotating it with a shadow below it, it looks like a triangle pointing down. One very neat effect is that this is also attached to the top center of the button, so while the popover itself will adjust its position to not go outside the screen, this one will stay stuck centered above the button. The effect is that it looks like a speech bubble with the tab pointing at the clicked text, exactly what we want, and with no added effort for us!

## Animating it

So far so good, but it's a bit jarring that it just appears and disappears, it would be nice with a subtle little animation. Let's first try to hide it slowly when you click away from it.

```css
transform-origin: bottom;
transition-property: translate, opacity, display, overlay;
3;
transition-timing-function: ease-out;
transition-behavior: allow-discrete;

&::before {
  transition: inherit;
}

&:not(:popover-open),
&:not(:popover-open)::before {
  translate: 0 -16px;
  opacity: 0;
}
```

<div>
  <p>
    Click
    <button popovertarget="id-5">
      here
      <div popover id="id-5">
        <h2>Popover</h2>
        <p>This is the popover</p>
      </div>
    </button>
    to show a popover
  </p>
</div>

Ok, a lot going on here. First we set it to transform from the bottom, and to transition the four properties `translate` (so that it moves up), `opacity` (so it fades out) and then `display` and `overlay`. The last two are interesting, and are why there is also a `transition-behavior: allow-discrete` there. This rule makes it possible to transition properties that don't have intermediate values. `opacity` can easily transition between `0` and `1` but how can `display: block` transition to `display: none`? The answer is that it can't, but `allow-discrete` instead makes it wait for the `transition-duration` until it changes, therefore the popover is visible until it has completely faded out.

We also want the down arrow to fade out, so it inherits the entire `transition` property and then we specify what the popover should look like when it's not open.

This is where things start to fall apart. As of Chrome 139 the `::before` pseudo element does not transform nicely. It seems like the anchor positioning does not work while it is transitioning. This is probably a bug in Chrome.

Finally we can add the following special rules to animate it appearing too.

```css
@starting-style {
  translate: 0 16px;
  opacity: 0;
  &::before {
    translate: 0 16px;
    opacity: 0;
  }
}
```

<div>
  <p>
    Click
    <button popovertarget="id-6">
      here
      <div popover id="id-6">
        <h2>Popover</h2>
        <p>This is the popover</p>
      </div>
    </button>
    to show a popover
  </p>
</div>

`@starting-style` controls what something should look like before it exists, so that we can transition it into existance. Here we specify that it should be transparent and be placed down `16px` so that it slowly translates up when you click on the button.

Again there is the problem with the down arrow not being placed correctly. As mentioned this is probably a Chrome bug, so I'm leaving it in hoping they will fix it.

<style>
div:has(#id-1),
div:has(#id-2),
div:has(#id-3),
div:has(#id-4),
div:has(#id-5),
div:has(#id-6) {
  > p > button[popovertarget] {
    all: initial;
    cursor: help;
    text-decoration: underline dashed;

    &:hover {
      text-decoration: underline solid;
    }
  }
}

div:has(#id-2),
div:has(#id-3),
div:has(#id-4),
div:has(#id-5),
div:has(#id-6) {
  >p > button[popovertarget] > [popover] {
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
}

div:has(#id-3),
div:has(#id-4),
div:has(#id-5),
div:has(#id-6) {
  >p > button[popovertarget] > [popover] {
    --translate: 0px;
    margin: 0 1em;
    inset: unset;
    bottom: calc(anchor(top) + 0.5em + var(--translate));
    justify-self: anchor-center;
  }
}

div:has(#id-4),
div:has(#id-5),
div:has(#id-6) {
  >p > button[popovertarget] > [popover] {
    &::before {
      bottom: calc(anchor(top) + var(--translate));
      justify-self: anchor-center;
      transform: rotate(45deg);
      position: fixed;
      width: 1em;
      height: 1em;
      background-color: #fff;
      box-shadow: 0.5em 0.5em 1em 0 rgba(0, 0, 0, 0.1);
      content: "";
    }
  }
}

div:has(#id-5),
div:has(#id-6) {
  >p > button[popovertarget] > [popover] {
      transform-origin: bottom;
      transition-property: bottom, opacity, display, overlay;
      transition-duration: 3s;
      transition-timing-function: ease-out;
      transition-behavior: allow-discrete;

      &::before {
        transition: inherit;
      }

      &:not(:popover-open) {
        --translate: 16px;
        opacity: 0;
      }
  }
}

div:has(#id-6) {
  >p > button[popovertarget] > [popover] {
      @starting-style {
        --translate: -16px;
        opacity: 0;
      }
  }
}
</style>
