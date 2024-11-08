---
title: "When can I actually use ES6?"
short: "The next version of JavaScript is nearing completion. But when can we actually use it?"
date: "2013-12-22T15:41:21.189Z"
type: "article"
---

## When can I actually use ES6?

**TL;DR** ES6 modules can be compiled to ES5 code in the browser. As long as a browser implements modules, it can compile the content of the module into a version of JavaScript it understands. So to use any feature of ES6 (or ES7, ES8, etc) a browser only needs to implement modules.

### Current situation

EcmaScript 6 is in the final stages of being standardized. The last few parts are being added to the spec, by March 2014 it will be finalized, and the rest of the year will be spent on formatting and layout. By this time next year, ES6 will be an official standard of the Ecma organization!

But how soon after this can we start using ES6? How quickly will all the browser vendors adopt the new spec and implement all the new features into the latest version of the major browsers? And how long until the old browsers without ES6 support lose enough market share that we don't need to worry about them?

If we look at ES5, the current version of JavaScript, we see that it can take several years before all of the features specified are adopted into widespread use. ES5 was released in 2009, more than four years ago, and since then all modern browsers have adopted it. But some parts of it are still not used, due to older browsers still being in use. [Getters and setters](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/get) are not supported in Internet Explorer 6, 7 and 8, and therefore projects which want to work on IE8 cannot use getters and setters. This includes popular frameworks and libraries, like jQuery, Angular and Ember, which cannot use a feature available for four years!

But other parts of ES5 are used, even if they aren't supported by IE8. This possible through polyfills and shims, which add missing APIs to to the runtime. So while IE8 does not implement the array functions `map`, `reduce` and `forEach`, they can be made available by adding a small script to the start of the page.

Unfortunately it is impossible to shim and polyfill changes in syntax. The current version of JavaScript, ES5, added a lot of new methods, but did almost nothing to the syntax. ES6 adds a lot of new syntax, so shims and polyfills cannot help us. If you want to support older browsers you cannot use any of the new syntax. This is especially true if you are the maintainer of a popular library. You will have to wait until all browsers support the ES6 features you want to use, which could take several years. And by the time all the browsers support ES6, ES7 will have been released, with even more cool features you cannot use!

### ES6 modules to the rescue

An [early draft of ES6 modules](https://github.com/jorendorff/js-loaders/wiki/Spec-Drafts) was recently released. It specifies not only how to define modules and how to import them, but also how the browser should find, load, parse and compile the modules. These steps are not hard-coded, but can be replaced by the JavaScript code running in the browser. If you don't like the way a module name is converted into a URL, you can change that. If you want to use different versions of a module in different places, you can do that. Or if you want to use [CoffeeScript](http://coffeescript.org/) instead of JavaScript, you can do that.

That's right, you can have your CoffeeScript modules be compiled in the browser by the end user! The module loader has a method, `Loader.prototype.translate`, which is called every time a module is loaded. It is given the contents of the module as a string so it can translate it however it wants. With a sufficiently advanced translate method you can `import` a CoffeeScript module, a [TypeScript](http://www.typescriptlang.org/) module and a [ClojurScript](https://github.com/clojure/clojurescript) module, and compile each of them to JavaScript before linking them together. You could even `import` a C++ module and have it be compiled to [asm.js](http://asmjs.org/). Or you could `import` an ES6 module and translate it to ES5.

### Module translator

There are already many transpilers/compilers which can convert a subset of ES6 to ES5. One example is [Regenerator](http://facebook.github.io/regenerator/) which can (only) convert ES6 generators into ES5 code. Imagine a browser which implements nothing but modules from the ES6 spec. By setting the `Loader.prototype.translate` method to run Regenerator, a module could use generators and still work in this browser. 

While it is unlikely that a browser only implements modules, it is very likely that a version of a browser only implements a subset of ES6. In fact many browsers [already implement parts of ES6](http://kangax.github.io/es5-compat-table/es6/). Some features, like classes, template strings and the spread operator, might not be implemented for many years, and different browsers will implement different features at different rates. So instead of waiting for all the browsers to implement the feature you want to use (like classes), a translator could be used in the browsers that don't support the feature. You could then use the same JavaScript file in all browsers, but compile it in the browsers with missing features.

The [Traceur compiler](http://code.google.com/p/traceur-compiler/) can compile many of the new features in ES6 into ES5. By using this in the `Loader.prototype.translate` method almost every new feature in ES6 can be compiled into a version of JavaScript the browser understands. Obviously the compiled code won't be as fast as native code, and it will increase the load time of the page, but at leastES6 features can be used in these browsers.

### Modules first

As long as a browser implements modules, any other feature of ES6 can be used in the browser. Just like shims and polyfills have helped us use ES5 features in browsers without ES5 support, modules will let us use ES6 features in browsers without full ES6 support. And when ES7 is standardized in a few years, it too can be used in browsers without ES7 support.

This means that browser vendors should focus on implementing modules before any of the other feature of ES6. The moment all browsers in use support modules is the moment all features in ES6 can be used, thanks to the `Loader.prototype.translate` method. We can reach this point quicker if browser vendors prioritize modules above other ES6 features.


