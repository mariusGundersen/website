---
title: "ES6 modules"
short: ""
date: "2014-06-15"
---

Here is a very simple ES6 module:
```js
export function markdownToHtml(markdownText){
  var html = "";
  //lots of code here...
  return html;
}
```
And here is another ES6 module that depends on the above module:
```js
import markdownToHtml from "markdown.js";

console.log(markdownToHtml("# test"));
```

Looks good, right? Except the above code doesn't work! There is nothing wrong with the syntax in the two modules, but they won't work together. You see, the top module hasn't marked which of its exports in the default one. Yup, It only has one export, but you, the programmer, still need to tell the JavaScript engine that it only exports one thing.

Before we move on, let me just say that the ES6 module system is looking really good. The creators of the spec have worked hard to design a module system that takes the best parts of todays module systems, like CommonJS and RequireJS while adding new features that existing systems have not been able to implement. With ES6 modules we get static analysis, lazy loading of modules, support for circular dependencies and the opportunity to rename exports when importing.

The problem is the support for both multi-export and single-export modules. Everyone (including a JS engine) can tell that the top module is a single export module, but the spec disagrees. It requires that the export be marked with the `default` keyword, like so:
```js
export default function markdownToHtml(markdownText){
  var html = "";
  //lots of code here...
  return html;
}
```
With this tiny change the module can successfully be imported using the syntax `import markdownToHtml from "markdown.js";`. But there is another way to fix the above code, and that is to wrap the imported name in curly braces, like so:
```js
import {markdownToHtml} from "markdown.js";

console.log(markdownToHtml("# test"));
```
The curly braces change the syntax to be named-import. It lets you import several things from a module by specifying the name of the thing you want to import. This is really useful for modules that export many things, for example a math library:
```js
import {cos, sin, tan} from "math.js";
```
The `math.js` module could export many more functions, but we chose to only import three of them. If the exported name isn't to our liking, we can of course choose to change it, for example like this:
```js
import {cos as cosinus, sin as sine, tan as tangent} from "math.js";
```
Here we have chosen to rename the exported functions into their longer Latin names. And this is what happens under the hood when we use the default keyword. The import syntax without curly braces (`import a from "b.js")` is syntactic sugar for `import {default as a} from "b.js"`. In other words, we could import the markdown module like this too:
```js
import fromMarkdown from "markdown.js";
import {default as markdownToHtml} from "markdown.js";
import {markdownToHtml as toHtml} from "markdown.js";

assert(markdownToHtml === toHtml);
assert(fromMarkdown === toHtml);
assert(fromMarkdown === markdownToHtml);
```
The `default` keyword that we used to mark the only export in `markdown.js` means that we can import it in three different ways! There is of course no reason to have three different ways to import one thing, especially not in the same module, but that is what the ES6 spec makes possible.

So with the ES6 module spec we have two different ways to export only one thing from a module, and four different ways to import that one thing. There are eight combinations of imports and exports, six of which are legal and two (export without default and  either `import {default as something}` or `import something`) which will not be legal. 

But what happens if you export something called default? For example:
```js
export default function(){};
export var default = {};
```
To be honest I don't actually know what would happen here, since we are overwriting the value of the export named `default`. Notice though that the default export can be used together with named exports to produce a module that has multiple exports but can be imported using the single-import syntax. That is the exact opposite of what we had right at the top of this article, which was a single-export module that needed the multi-import syntax. 

Ok, so what if we want to import a module, for example jQuery, that we didn't write ourselves. We all know the jQuery api, but how would you import it? You have two options, with or without curly braces, and without looking at the source code of the jQuery module you might thing it would be difficult to chose. It turns out, however, that if you use the curly braces then it will work both if the 

