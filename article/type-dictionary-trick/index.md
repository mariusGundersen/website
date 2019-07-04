---
title: "Type-dictionary trick in C#"
short: "Efficient dictionary with Type keys in C#"
date: "2019-06-30"
type: "article"
---

## Type-dictionary trick in C#

This article explores a trick in C# for looking up values based on types, much like a `Dictionary<Type, T>` only 10x faster! You probably don't need this trick and even if you need it, it will only work in a few very specific scenarios. But it's a neat trick that might be fun to read about anyways. I don't know if this pattern has a name, and I'm not very good at naming things, so maybe I'll just refer to it as the private static generic inner class trick. If you know of another name, please let me know.

It's a bit tricky to explain exactly how and when to use this trick, so I'll look at a specific use-case and work our way towards a specific solution. From there we can generalize it until we hit on the limitations of this pattern and find other specific use-cases for it within those limitations.

### An imaginary inefficient ORM

Let's imagine we are working on an ORM library, one that will be really good. It will work like many other ORMs, where a C# class maps to a table in our database. Let's ignore if this is a good or bad idea and focus on just a tiny part of the implementation, the way we map the class to the table. We can use the `[Table]` attribute like so:

```csharp
[Table("BlogPosts")]
public class BlogPost
{
  public int Id { get; set; }

  public string Title { get; set; }

  public string Content { get; set; }

  public DateTime Published { get; set; }
}
```

The class `BlogPost` maps to the table `BlogPosts` in the database through the attribute `[Table]`. How can our code find out this? We need to use reflection.

```csharp
public static class Reflections
{
  public static string GetTableName<T>()
    => typeof(T)
      .CustomAttributes
      .OfType<TableAttribute>()
      .First()
      .Name;
}
```

This looks up all the attributes applied to a type, finds the `Table` attributes and takes the first one and gets the `Name` property from it. If you have used reflection in C# then this will look familiar and straight forward. But you will then also know that it's not very efficient.

Reflection is slow. If we run this method every time we query the database then we are not being as efficient as we could be. The `Name` property of the `Table` attribute applied to a specific type will not change while the code is running, so we have a method that will slowly find the same answer every time we call it. We can speed it up by saving the result in a dictionary, so that we don't need to use reflection every time:

```csharp
public static class Reflections
{
  private static IDictionary<Type, string> TableNames = new Dictionary<Type, string>();

  public static string GetTableName<T>()
    => TableNames.GetOrAdd(typeof(T), type => type
      .CustomAttributes
      .OfType<TableAttribute>()
      .FirstOrDefault()
      .Name);
}
```

This way we only use reflection for a type once, after that the result is stored in the dictionary `TableNames`. Benchmarking, which is often wrong, will show that this is 100s or 1000s of times faster for repeated lookups! We have reduced the CPU time a lot by slightly increasing memory usage, a good tradeoff. But we have only reduced the CPU usage, we haven't removed it. That is, there are still further improvements, and this is where the finely named private static generic inner class trick can be used.

So let's do what the name implies and add a private static generic inner class:

```csharp
public static class Reflections
{
  public static string GetTableName<T>()
    => TableName<T>.Name;

  private static class TableName<T>
  {
    public static readonly string Name = typeof(T)
      .CustomAttributes
      .OfType<TableAttribute>()
      .FirstOrDefault()
      .Name;
  }
}
```

Here finally we see the trick in action. The inner class `TableName<T>` is generic, so the static field `Name` will be created once per type `T`. The way generics work in C# is that [at runtime a class is created for each specific type of the generic class](https://www.codeproject.com/Articles/20481/NET-Type-Internals-From-a-Microsoft-CLR-Perspecti#21). The initializer of this field will only be called the first time, just like the way we set up our dictionary in the previous example.

Is this faster than the dictionary? Yes, from simple benchmarks it seems to be 10x faster! This is because we have replaced hashcode calculation and dictionary lookup with a single static field read from a class. It's unlikely that we can make this any faster.

### Where does this trick come from?

I found this trick first used in the [Array.Empty<T>](https://github.com/microsoft/referencesource/blob/master/mscorlib/system/array.cs#L1080) method, which relies on the internal class [EmptyArray<T>](https://github.com/microsoft/referencesource/blob/master/mscorlib/system/array.cs#L3080). In this scenario it is used to create a single instance of an empty array of a specific type for the duration of the program. This prevents the wasted CPU and memory of creating a new instance of an empty array every time that is needed. All empty arrays are exactly the same, so we don't need a new one for every scenario, we can just reuse the same empty array (of a specific type) everywhere it is needed. I stole this trick for the [`Empty` class](https://github.com/ClaveConsulting/ExtensionMethods/#empty) in our [extension methods nuget](https://www.nuget.org/packages/Clave.ExtensionMethods) package at work.

I haven't seen it used any other place, probably because of its many limitations.

### Limitations

I've called this article the type-dictionary trick and compared it against the performance of a dictionary, but the code above doesn't much behave like a dictionary. In particular:

* Unlike a dictionary it can only work with `Type` as its key
* It is not possible to remove entries from the dictionary, they will be there forever
  * Well, you could set the value to null, or create a wrapper type with a special "no-value" value...
  * ... but even then the memory for the entry will not be released, so the dictionary will only ever grow in size
* You can only have a single instance of this dictionary; it has to be static
  * ... or do we? We'll look at a tricksy workaround later
* This limitation means that probably you want it to be read-only, since mutating static variables leads to pain and suffering

The result is that you probably only want to use this trick to store some values that don't change and are fixed at compile time, like the value of the attribute in the example above. Reflection caching seems to be a good scenario for this trick, since it works on types and we often use reflection on types, and the result won't change at runtime.

