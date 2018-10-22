---
title: "Duck-typed Extension methods in C#"
short: "Creating magical code by combining duck-typing and extension methods in C#"
date: "2018-10-21"
type: "article"
---

## Duck-typed Extension methods in C#

C# might have started as a static object oriented language but over the years it has ~~stolen~~ implemented a lot of features from other very different languages. It has dynamic types, SQL-like queries, lambdas, async-await and so much more. In this article we'll see what kind of magic we can create if we take extension methods and mix them up with generics and duck-typing. [Extension methods](https://docs.microsoft.com/en-us/dotnet/csharp/programming-guide/classes-and-structs/extension-methods) are ways to add methods to a class without modifying the class and [duck-typing](https://en.wikipedia.org/wiki/Duck_typing) is (in C# at least) when the compiler doesn't require an implementetion of an interface, it just looks for a method with the right name, return type and parameters. Extension methods are quite common, but duck-typing is still pretty rare in C#. There are a few places where it's avaliable, and that's what we will look at in this article.

### GetAwaiter

Let's start off with some async stuff. Since version 5.0 C# has had support for async code where we can await a `Task`. But why only `Task`s, why can't we await other things? It turns out that we can, we aren't limited to awaiting only `Task`s, we can await anything that has a `GetAwaiter` method that returns a `TaskAwaiter` (well, not really, it should return an awaiter. What is an awaiter? It's complicated, so let's not worry about that just yet, we can just use the `TaskAwaiter` class for most (most) scenarios. If you are curious you can read more about it in [this excellent article](https://weblogs.asp.net/dixin/understanding-c-sharp-async-await-2-awaitable-awaiter-pattern)). The cool thing is that there is no restriction that the `GetAwaiter` method be declared on the class, it can be an extension method! C# even tells us this if we try to await something that isn't awaitable, for example a string:

```csharp
await "Hello world";

// error CS1061: 'string' does not contain a definition for 'GetAwaiter' and no
// accessible extension method 'GetAwaiter' accepting a first argument of type
// 'string' could be found (are you missing a using directive or an assembly reference?)
```

So let's do what C# says, and make an 'accessible extension method `GetAwaiter` accepting a first argument of type `string`', and then see what happens.

```csharp
// Example 1: await strings

public static TaskAwaiter<string> GetAwaiter(this string text)
=> Task.FromResult(text).GetAwaiter();

// Now it doesn't complain when we await the string
await "Hello world";
```
([Try it online](https://try.dot.net/?bufferId=Example1.cs&fromGist=f9df8e305e8eef6ba6d34ad30be93a64&canshowgithubpanel=true))

Cool, but let's take it one step further and make this method generic, so we can await anything.

```csharp
// Example 2: await anything

public static TaskAwaiter<T> GetAwaiter<T>(this T nonAwaitable)
=> Task.FromResult(nonAwaitable).GetAwaiter();

// Now we can write code like this
await "Hello world";
await 100;
await true;
```
([Try it online](https://try.dot.net/?bufferId=Example2.cs&fromGist=b552f99f4f2703a00b461c1ce4d11df0&canshowgithubpanel=true))

Ok, this was a bit useless maybe, can we find a type to extend that can be useful to await? How about `Lazy<Task<T>>`? Instead of making an `AsyncLazy<T>` class, as described in [this article](https://blogs.msdn.microsoft.com/pfxteam/2011/01/15/asynclazyt/) (from all the way back in 2011), we can just make an extension method for `Lazy<Task<T>>`

```csharp
// Example 3: await Lazy<Task<T>>

// We need a lazy variable to work with
var lazySomething = new Lazy<Task<string>>(() => GetSomethingAsync(10));

// Before
Console.WriteLine(await lazySomething.Value);

// Then we introduce this extension method
public static TaskAwaiter<T> GetAwaiter<T>(this Lazy<Task<T>> lazyTask)
=> lazyTask.Value.GetAwaiter();

// After
Console.WriteLine(await lazySomething);
```
([Try it online](https://try.dot.net/?bufferId=Example3.cs&fromGist=f7d38a571b82a9a7df41dae07dbf1128&canshowgithubpanel=true))

Success! We got rid of the `.Value`! Ok, still not impressed? How about getting rid of `Task.WhenAll`? We can do that by extending `IEnumerable`:

```csharp
// Example 4: await IEnumerable<Task<T>>

// Before (notice the Task.WhenAll)
var manyThings = await Task.WhenAll(Enumerable.Range(0, 10).Select(GetSomethingAsync));

// Then we introduce this extension method
public static TaskAwaiter<T[]> GetAwaiter<T>(this IEnumerable<Task<T>> manyTasks)
=> Task.WhenAll(manyTasks).GetAwaiter();

// After (no more Task.WhenAll)
var manyThings = await Enumerable.Range(0, 10).Select(GetSomethingAsync);
```
([Try it online](https://try.dot.net/?bufferId=Example4.cs&fromGist=84f12a29e606fa14d357b3b6660fa4bf&canshowgithubpanel=true))

This magic extension method lets us await an `IEnumerable` of `Task`s directly, without having to wrap it in `Task.WhenAll`. It ends up converting an enumerable of tasks (`IEnumerable<Task<T>>`) into a task of an enumerable (`Task<IEnumerable<T>>`). This is great when we have many `Task<T>` for the same type `T`, but what if we have a few async functions that return different results, and we want to run them in parallel?

```csharp
// Example 5: await a tuple of Task<T>

// Before
var task1 = GetSomethingAsync(10);
var task2 = GetAnotherThingAsync("some parameter");
await Task.WhenAll(task1, task2);
var something = task1.Result;
var anotherThing = task2.Result;

// Then we introduce this extension method
public static TaskAwaiter<(T1, T2)> GetAwaiter<T1, T2>(this (Task<T1>, Task<T2>) tasks)
=> Task.WhenAll(tasks.Item1, tasks.Item2)
       .ContinueWith(_ => (tasks.Item1.Result, tasks.Item2.Result))
       .GetAwaiter();

// After
var (something, anotherThing) = await (GetSomethingAsync(10), GetAnotherThingAsync("some parameter"));
```
([Try it online](https://try.dot.net/?bufferId=Example5.cs&fromGist=aaa0af25c481531e5a0fc4a3e7db1233&canshowgithubpanel=true))

This example uses [ValueTuples](https://blogs.msdn.microsoft.com/mazhou/2017/05/26/c-7-series-part-1-value-tuples/), introduced in C# 7.0. ValueTuples are just structs, so we can write extension methods for them too. Here we convert a tuple of tasks into a task of a tuple. The problem with tuples is that we have to write one extension method for each tuple length. This example only works for tuples with 2 values, we have to write a similar method for tuples with three values and so on. It's not very difficult, but it's not so fun to copy paste the same code into each project you work on. Luckly there is a nuget package called [TaskTupleAwaiter](https://github.com/buvinghausen/TaskTupleAwaiter) which contains extension methods for tuples with up to 10 values. It works slightly differently from the solution here in that it doesn't return a `TaskAwaiter`. If you are curious how it works you can have a look at this [open GitHub issue](https://github.com/dotnet/csharplang/issues/380) which resulted in the nuget.

### Add

C# 3.0 added the syntax for object and collection initializers. We'll skip object initializers beacuse it's boring, and focus on collection initializers, which use duck-typed magic. How does collection initializers work? Let's say we want to make a list with three items, then we can either call `Add` three times, or we can use the curly brace and list the items we want to add:

```csharp
// Without collection initializer
var list = new List<int>();
list.Add(1);
list.Add(2);
list.Add(3);

// With collection initalizer
var list = new List<int>
{
  1,
  2,
  3
};
```

While these may look very different these two scenarios are exacly the same; when we use the collection initializer it is just syntax sugar for calling `Add` multiple times. That's great, as it means we can define an `Add` extension method and then we can use it with the collection initializer.

For example, JavaScript, as of ES2015, got the ability to spread an array into another array, and this is something I've wanted to do in C#. But it has not been possible, until now!


```csharp
// Example 6: Add a list

// With this extension method...
public static void Add<T>(this List<T> list, IEnumerable<T> items)
=> list.AddRange(items);

// ...this is possible
var result = new List<int>
{
  1,
  2,
  GetAnotherListOfInts(),
  3
};
```
([Try it online](https://try.dot.net/?bufferId=Example6.cs&fromGist=7092b846fdee640ecd7e1f37eee7255c&canshowgithubpanel=true))

The result will be a list of ints, starting with 1 and 2, followed by all the ints returned by `GetAnotherListOfInts` and ending with 3. This is quite useful when we are working with `IEnumerable<T>`, `IReadOnlyCollection<T>` where we can't modify a list directly.

Now you may have seen the following systax for initializing a dictionary, and wondered what the special sytax with the curly braces is

```csharp
var populations = new Dictionary<string, int>{
  { "China", 1_409_517_397 },
  { "India", 1_339_180_127 },
  { "USA", 324_459_463 },
  { "Indonesia", 263_991_379 },
  { "Brazil", 209_288_278 }
};
```

Is this a syntax made specifically for dictionary initialization? No, this is the syntax for passing multiple arguments to the `Add` method! `IDictionary` has an `Add(key, value)` method which takes two arguments, the key and the value. So we aren't limited to creating an `Add` extension method with only one (additional) parameter, we can make one with as many as we want! But before we look at the opportunities this enable, let's implement the `Add` method that spreads a dictionary into a dictionary, just like we did for a list:

```csharp
// Example 7: add a dictionary

// This is the dictionary spread method
public static void Add<TKey, TValue>(this IDictionary<TKey, TValue> dictionary, IDictionary<TKey, TValue> items)
{
  foreach (var item in items)
  {
    dictionary[item.Key] = item.Value;
  }
}

// It makes this possible
var populations = new Dictionary<string, int>
{
  { "China", 1_409_517_397 },
  { "India", 1_339_180_127 },
  { "USA", 324_459_463 },
  { "Indonesia", 263_991_379 },
  { "Brazil", 209_288_278 },
  GetAfricanCountries(),
  GetEuropeanCountries()
};
```
([Try it online](https://try.dot.net/?bufferId=Example7.cs&fromGist=8b294d95d8f326952c59ed2f42d6d59e&canshowgithubpanel=true))

Neato, this is sure to be useful! One fancy feature of this extension method is that it will not fail on duplicate keys, it will overwrite previous keys. This means that the order of the items matter, and you can pass in two dictionaries with the same keys and have the latter one override the previous one.

Ok, enough about that, let's get back to the curly braces, can we make an extension method that takes multiple arguments? Sure, no problem:

```csharp
// Example 8: add new instances

// Before
var cities = new List<City>
{
  new City("Chongqing", 30_751_600, "China"),
  new City("Shanghai", 24_256_800, "China"),
  new City("Delhi", 11_034_555, "India"),
  new City("Beijing", 21_516_000, "China"),
  new City("Dhaka", 14_399_000, "Bangladesh")
};

// Then with this very specific extension method
public static void Add(this List<City> list, string name, int population, string country)
=> list.Add(new City(name, population, country));

// After
var cities = new List<City>
{
  { "Chongqing", 30_751_600, "China" },
  { "Shanghai", 24_256_800, "China" },
  { "Delhi", 11_034_555, "India" },
  { "Beijing", 21_516_000, "China" },
  { "Dhaka", 14_399_000, "Bangladesh" }
};
```
([Try it online](https://try.dot.net/?bufferId=Example8.cs&fromGist=ac2a196fefca9350e74b7b27ba0477ec&canshowgithubpanel=true))


Hey, would you look at that, we don't have to write `new City` for each item to add! Instead we pass in three arguments to the `Add` method and let it create a new city for us.

That was a very specific extension method, since it works only for `City` and it takes exactly three arguments. Can we make an `Add` extension method that takes arbitrary many arguments? Yes, using `params`!

```csharp
// Example 9: multi or single dimensional array?

// We define this extension method
public static void Add<T>(this List<T> list, params T[] items)
=> list.AddRange(items);

// And then we can make a flattened matrix
var matrix = new List<double>
{
  { 1, 0, 0 },
  { 0, 1, 0 },
  { 0, 0, 1 }
};
```
([Try it online](https://try.dot.net/?bufferId=Example9.cs&fromGist=d8400ad900e4fa3ac57d707e1df1207e&canshowgithubpanel=true))

This might be useful when we are working with [multi dimensional arrays](https://en.wikipedia.org/wiki/Stride_of_an_array), for example matrices and images. Maybe.

Now we have curly braces that don't do anything, they are just there to look pretty. Well, curly braces aren't really that pretty, not as pretty as parentheses anyways. And if we go back to the example with the cities above, isn't a bit strange that we use curly braces to hold a list of arguments? It looks like object initialization, but it's not. Can we use parentheses instead? Will it make us more like lisp programmers?

```csharp
// Example 10: add a tuple

// We can gather up all the parameters in a tuple
public static void Add(this List<City> list, (string name, int population, string country) city)
=> list.Add(city.name, city.population, city.country);

// Now we have parenthesis, not curly braces
var cities = new List<City>
{
  ("Chongqing", population: 30_751_600, "China"),
  ("Shanghai", population: 24_256_800, "China"),
  ("Delhi", population: 11_034_555, "India"),
  ("Beijing", population: 21_516_000, "China"),
  ("Dhaka", population: 14_399_000, "Bangladesh")
};
```
([Try it online](https://try.dot.net/?bufferId=Example10.cs&fromGist=07c5787a66bed01121d466d747f8122b&canshowgithubpanel=true))

Ah, much better. Here we just wrap the `Add(name, population, country)` method we created in the original example, so we can pick and choose which one we want to use. We could even do every other line with parentheses and curly braces, if we are in a bad mood. Notice that we can name the arguments, like I've done with the population, an option we don't have with curly braces.

Oh, BTW, did you notice the fancy [digit separator](https://airbrake.io/blog/csharp/digit-separators-reference-returns-and-binary-literals) in the numbers above? The syntax for using `_` in numbers like `7_550_262_101` was added in C# 7.0 as is pretty neat, but a bit weird when we are used to seeing numbers represented like 7,550,262,101. Can we fix this using extension methods? Yes, we can hack it!

```csharp
// Example 11: add with params

// Use params to take several ints, each representing 3 digits
public static void Add<TKey>(this IDictionary<TKey, int> dictionary, TKey key, params int[] values)
=> dictionary.Add(key, values.Aggregate(0, (s, v) => s*1000 + v));

// Now we can write it like this
var populations = new Dictionary<string, int>
{
  { "China", 1,409,517,397 },
  { "India", 1,339,180,127 },
  { "USA", 324,459,463 },
  { "Indonesia", 263,991,379 },
  { "Brazil", 209,288,278 }
};
```
([Try it online](https://try.dot.net/?bufferId=Example11.cs&fromGist=35fa20bd963dd9e80145da0266d52988&canshowgithubpanel=true))

OK, even I realize the examples are getting pretty silly now, so let's stop.

## The future

In the examples with dictionaries you might have noticed that I didn't use the [index initializer](http://geekswithblogs.net/BlackRabbitCoder/archive/2015/05/08/c.net-little-wonders-indexer-initializer-syntax.aspx), which looks like this:

```csharp
var populations = new Dictionary<string, int>{
  ["China"] = 1_409_517_397,
  ["India"] = 1_339_180_127,
  ["USA"] = 324_459_463,
  ["Indonesia"] = 263_991_379,
  ["Brazil"] = 209_288_278
};
```

This might look very similar to the collection initialization we have used in many of the examples, but it's not, it's the closely related object initializer. This code ends up calling the [index operator](https://docs.microsoft.com/en-us/dotnet/csharp/programming-guide/indexers/using-indexers) which is defined as an operator on the class. As of C# 7.2 it's only possible to extend instance methods, not overloaded operators, so we can't use this syntax for magic.

But there is a proposal called [Extension Everything](https://github.com/dotnet/roslyn/issues/11159) that will make it possible to extend not just instance methods, but also properties and operators, including the index operator! It is marked for C# 8.0, but that seems unlikely as it hasn't gotten any attention lately, at least not compared to some of the other features that are planned, like [nullable reference types](https://github.com/dotnet/csharplang/wiki/Nullable-Reference-Types-Preview) and [patterns and ranges](https://github.com/dotnet/csharplang/wiki/vNext-Preview). We'll just have to wait and see when it will be possible to extend other fun stuff and what kind of cool and silly things might be possible in the future.

