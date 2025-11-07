---
title: Parsing user-agent strings with CSS
short: How do you determine the browser given a user-agent string, using only css?
date: 2025-10-07
---

Which browser is this?

```txt
Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36 Edg/142.0.0.0
```

Let's have a look at the clues:

* It starts with Mozilla, which makes Firefox
* It contains Windows NT 10.0, så probably it runs on Windows 10
* It Then contains AppleWebKit, so is this an Apple device?
* KHTML was the name of the KDE browser, but it has been discontinued since 2016
* Gecko is the rendering engine in Firefox, the one by Mozilla
* Chrome is created by Google
* Safari is created by Apple
* Edg is short for Edge, the browser that replaced Internet Explorer

So, given all these clues, which browser is it, and why? Luckily for us we have an ancient text that can help us determine it. If you haven't read the [History of the browser user-agent string](https://webaim.org/blog/user-agent-string-history/) from 2008, go read it now.

Things have continued to evolve since 2008, so there is even more complexity in the user-agent string today. There are important parts and ignorable parts, and some parts are more important than others. So how do you take that long string and determine the browser? Using CSS of course.

## Using CSS

This is from an actual webapp I developed at work. A list of requests contained information, like the path, the method, the remote IP and the user-agent string. I wanted a small icon for the browser with a hover tooltip telling which browser it was and containing the full user-agent string. So I rendered it to html like this:

```html
<span data-user-agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36 Edg/142.0.0.0"></span>
```

Now that the user agent string is in the attribute we can create some clever css to target it.

<code-wave>

```css
span[data-user-agent]{
  position: relative;

  &::before {
    content: var(--user-agent-icon, '?');
    width: 1em;
    height: 1em;
    font: normal 400 1em/1 'Font Awesome 6 Brands';
  }
}
```

We select all `<span>` elements with `data-user-agent` attributes, and then create a pseudo element before it, where the content is whatever is in the `--user-agent-icon` variable, or `?` if it hasn't been set. We now need to set `--user-agent-icon` for different browsers. Let's start with Safari, since almost all browsers are based on Safari today.

```css
span[data-user-agent]{
  position: relative;

  &::before {
    content: var(--user-agent-icon, '?');
    width: 1em;
    height: 1em;
    font: normal 400 1em/1 'Font Awesome 6 Brands';
  }

  &[data-user-agent*='safari' i] {
    --user-agent-icon: '\f267';
    --user-agent-name: 'Safari';
  }
}
```

If the `data-user-agent` string contains `safari`, then this is Safari. But the example above also contained safari, but it's not safari.

```css
span[data-user-agent]{
  position: relative;

  &::before {
    content: var(--user-agent-icon, '?');
    width: 1em;
    height: 1em;
    font: normal 400 1em/1 'Font Awesome 6 Brands';
  }

  &[data-user-agent*='safari' i] {
    --user-agent-icon: '\f267';
    --user-agent-name: 'Safari';

    &[data-user-agent*='chrome' i] {
      --user-agent-icon: '\f268';
      --user-agent-name: 'Chrome';
    }
  }
}
```

Ok, so if it contains safari and chrome, then it must be chrome!. Well, the example contains both safari and chrome, but it's  not chrome...

```css
span[data-user-agent]{
  position: relative;

  &::before {
    content: var(--user-agent-icon, '?');
    width: 1em;
    height: 1em;
    font: normal 400 1em/1 'Font Awesome 6 Brands';
  }

  &[data-user-agent*='safari' i] {
    --user-agent-icon: '\f267';
    --user-agent-name: 'Safari';

    &[data-user-agent*='chrome' i] {
      --user-agent-icon: '\f268';
      --user-agent-name: 'Chrome';

      &[data-user-agent*='opr/' i] {
        --user-agent-icon: '\f26a';
        --user-agent-name: 'Opera';
      }

      &[data-user-agent*='edg/' i] {
        --user-agent-icon: '\f282';
        --user-agent-name: 'Edge';
      }
    }
  }
}
```

I've added two more options now, so if it claims to be safari, chrome and edg, then it's Edge, and if it claims to be safari, chrome and opr, then it's Opera.

```css
span[data-user-agent]{
  position: relative;

  &::before {
    content: var(--user-agent-icon, '?');
    width: 1em;
    height: 1em;
    font: normal 400 1em/1 'Font Awesome 6 Brands';
  }

  &[data-user-agent*='safari' i] {
    --user-agent-icon: '\f267';
    --user-agent-name: 'Safari';

    &[data-user-agent*='chrome' i] {
      --user-agent-icon: '\f268';
      --user-agent-name: 'Chrome';

      &[data-user-agent*='opr/' i] {
        --user-agent-icon: '\f26a';
        --user-agent-name: 'Opera';
      }

      &[data-user-agent*='edg/' i] {
        --user-agent-icon: '\f282';
        --user-agent-name: 'Edge';
      }
    }
  }

  &[data-user-agent*='firefox' i] {
    --user-agent-icon: '\f269';
    --user-agent-name: 'Firefox';
  }
}
```

One of the only browsers which isn't based on WebKit is Firefox. With this in place we can target the major browsers, and we can keep expanding this to target other browsers. The majority of them, like Samsung browser, is based on Chrome which is based on Safari. They can be added in the same way to the stylesheet.

</code-wave>

In the end we can check for a few different browsers, for example:

<style>
@font-face {
  font-family: "Font Awesome 6 Brands";
  font-style: normal;
  font-weight: 400;
  font-display: block;
  src: url("./fonts/fa-brands-400.woff2") format("woff2"),
    url("./fonts/fa-brands-400.ttf") format("truetype");
}

span[data-user-agent]{
  position: relative;

  &::before {
    content: var(--user-agent-icon, '?');
    width: 1em;
    height: 1em;
    font: normal 400 1em/1 'Font Awesome 6 Brands';
  }

  &[data-user-agent*='safari' i] {
    --user-agent-icon: '\f267';
    --user-agent-name: 'Safari';

    &[data-user-agent*='chrome' i] {
      --user-agent-icon: '\f268';
      --user-agent-name: 'Chrome';

      &[data-user-agent*='opr/' i] {
        --user-agent-icon: '\f26a';
        --user-agent-name: 'Opera';
      }

      &[data-user-agent*='edg/' i] {
        --user-agent-icon: '\f282';
        --user-agent-name: 'Edge';
      }
    }
  }

  &[data-user-agent*='firefox' i] {
    --user-agent-icon: '\f269';
    --user-agent-name: 'Firefox';
  }

  &:hover:after {
    content: var(--user-agent-name, 'Unknown') '\A('attr(data-user-agent) ')';
    position: absolute;
    bottom: calc(100% + 5px);
    background: black;
    color: white;
    padding: 0.5em;
    border-radius: 0.25em;
    left: 50%;
    translate: -50% 0;
    white-space: pre;
    text-align: center;
    z-index: 1;
    font-size: 0.875rem;
  }
}
</style>

Your browser is <span data-user-agent=""></span><script>  document.currentScript.previousElementSibling.setAttribute('data-user-agent', navigator.userAgent)
</script>

Today there are even more interesting browsers and bots. Some, like Ladybird and Servo, are not based on any of the existing browser engines. Then there are bots, like Facebook, GoogleBot, ChatGPT etc. You can also detirmine which device you are on from the user-agent string, for example if you are on a Windows machine, an iPhone or maybe a Nintendo Switch.
