---
title: "Other things generators are good for"
short: "ES6 generators can be used for more than async await"
date: "2014-08-13"
type: "article"
redirect_from: /other-things-generators-are-good-for
---


The next version of JavaScript, ES6, will have what is called generators. If you haven't looked at generators yet, watch this video to get an idea of what they can do.

<p><iframe width="480" height="270" src="//www.youtube.com/embed/QO07THdLWQo" frameborder="0" allowfullscreen></iframe></p>

Generators weren't actually designed for writing async functions, so it is unfortunate that async functions is all anyone wants to use them for. In this article we will look at some of these other things generators can be used for, things that do not involve promises or AJAX.

Even though ES6 hasn't been finalized yet, much of it is already implemented in browsers. All of the code in this article works in the latest version of Firefox. Hit F12 to open the Developer Console or Shift + F4 to open the scratchpad.

## Generators and iterators

ES6 has a lot of cool new features, some of which work well with generators. Iterators, for example, are objects that produce values and which can be used with for loops. So for example:

```js
function *myGen(){
  yield 1;
  yield 2;
  yield 3;
}

for(let i of myGen()){
  console.log(i);
}
```

This new `for-of` loop understands that the generator yields three values and will iterate over those three values as if it was an array. But since the generator is a function, not an array, it can generate an endless sequence of values:

```js
function *endless(){
  let i = 0;
  while(true){
    yield i++;
  }
}

for(let i of endless()){
  if(!confirm("The current value is " + i +
     "\n\nDo you want more?")){
    break;
  }
}

```

Generators wait until you ask them for another value, so they can be terminated when you don't want any more values from them, instead of when they don't have any more values to give. In other words, they can be used to generate infinite sequences. There are a lot of mathematical formulas where infinite sequences are useful, for example to [estimate pi](http://en.wikipedia.org/wiki/Leibniz_formula_for_%CF%80):

```js
function* leibniz(){
  let n=0;
  while(true){
    yield (1-2*(n&amp;1))/(2*n+1);
    n++;
  }
}

let quarterPi = 0;
for(let s of leibniz()){
  quarterPi+=s;
  if(!confirm("pi is "+(quarterPi*4) +
     "\n\nDo you want a more exact value?")){
    break;
  }
}
```

## Generators and comprehension

ES6 will have [array and iterator comprehension](http://ariya.ofilabs.com/2013/01/es6-and-array-comprehension.html), which is a fancy way of saying that you can put an entire for loop in one line of code. The comprehension syntax is quite limited, and can only do the equivalent of map and filter.

```js
function* fibonacci(max = Infinity){
  let a=1, b=1;
  while(a < max){
    yield a;
    [a, b] = [b, a+b];
  }
}

var array = [for (x of fibonacci(30)) x]; //[1,1,2,3,5,8,13,21]
var squared = [for (x of fibonacci(30)) x*x]; //[1,1,4,9,25,64,169,441]
var evenOnly = [for (x of fibonacci(30)) if(x%2 == 0) x]; //[2,8]
```

Comprehension is not meant to replace every for loop, it is only meant to replace the most common cases. It works great when you want to do something simple, but if you try something more advanced with it, it quickly becomes a big mess. It is therefore great that the simple case works so well with generators.

The `[for() of]` loop will produce an array of values, which is a great way to reduce a generator to a list. If you use parenthesis, as in `(for() of)`, instead of the square brackets, you get an iteration instead of an array:

```js
var fibonacciMultpliedWithLeibniz = (for (x of fibonacci())
                                     for (y of leibniz())
                                     x*y);
fibonacciMultpliedWithLeibniz.next(); //{value:1, done: false}
```

Here we have combined two generators to produce a iterator. When you call `next()` on the `fibonacciMultipliedWithLeibniz` iterator, it calls next on both the `fibonacci` and the `leibniz` generators. This way we can chain the next calls, so that a new `fibonacci` value is only produced when we ask for a new multiplied value. The two generators are idle and waiting until you ask for another value. Don't worry about not asking for another value; if the JS engine detects that you don't have a reference to the generator anymore, then it will garbage collect it for you.

Notice that iterator comprehension is actually a simplified form of a generator:

```javascript
(for (x of array) x)
//is the same as
(function*(array){
  for(x of array){
    yield x;
  }
})(array);
```

## Generators and lazy evaluation

We've seen how generators are only executed when a value is requested, instead of when a value is available. In other words, you pull a value out of a generator instead of it pushing the value to you. This can be used when looping over an array in several steps without having to completely finish each step in turn. Take this example:

```js
[1,2,3,4,5,6,7,8,9,10]
  .map(x => x*x)
  .takeUntil(x => x==25); //[1,4,9,16,25]
```

In this example the `x => x*x` method is run for every element in the array, even those that don't end up in the output array. This is because the `map()` function returns an array of the same length as the input. But with generators we can create a lazy `map()` function that only computes the square of the values that are actually used:

```js

new Lazy([1,2,3,4,5,6,7,8,9,10])
  .map(x => x*x)
  .takeUntil(x => x==25)
  .toArray(); //[1,4,9,16,25]

//IMPLEMENTATION:

function Lazy(list, ...steps){
  this.list = list;
  this.steps = steps;
}

Lazy.prototype.map = function(f){
  return new Lazy(this.list, ...this.steps, iteration
    => ( for (entry of iteration) f(entry)));
}

Lazy.prototype.takeUntil = function(f){
  return new Lazy(this.list, ...this.steps, function*(iteration){
    for (var entry of iteration){
      yield entry;
      if(f(entry)) break;
    }
  });
}

Lazy.prototype.toArray = function(){
  var steps = this.steps;
  var previousStep = (for (entry of this.list) entry);
  for(var nextStep of steps){
    previousStep = nextStep(previousStep);
  }
  return [for (x of previousStep) x];
}


```

Using the `Lazy` class, only the first 6 values in the input array are squared.

## Recursive Generators

Calling a generator returns an iterator, which iterates over the values yielded inside the generator. So what happens if you yield another iterator? If you add a star right after the yield keyword, you go into the iterator and iterate over all of it's values before returning. For example:

```javascript
var tree = [
  1,
  2,
  [
    3,
    [4,5],
    6,
    [7,8],
    9
  ],
  10
];

function* depthFirst(tree){
  for(let node of tree){
    if(Array.isArray(node)){
      yield* depthFirst(node);
    }else{
      yield node;
    }
  }
}

[for (x of depthFirst(tree)) x] //[1,2,3,4,5,6,7,8,9,10]
```

This is a generator that calls itself, and can therefore recurse down a tree while yielding the values it comes across. This is a great way to convert a complex structure into a simple structure, like a list. The tree could be a DOM tree, or an AST, and the depth first generator can be used as a visitor that iterates over each node.

## Conclusion

Hopefully this article shows that generators can be used for much more than faking async/await. Obviously async/await is a very powerful pattern, which is why [it is being added in ES7](http://jakearchibald.com/2014/es7-async-functions/).
