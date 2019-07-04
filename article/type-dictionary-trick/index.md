---
title: "Type-dictionary trick in C#"
short: "Efficient dictionary with Type keys in C#"
date: "2019-06-30"
type: "article"
---

## Type-dictionary trick in C#

This article explores a trick in C# for looking up values based on types, much like a `Dictionary<Type, T>` only it's almost 10x faster! You probably don't need this trick and even if you need it, it will only work in a few very specific scenarios. But it's a neat trick that might be fun to read about. I don't know if this pattern has a name, and I'm not very good at naming things, so maybe I'll just refer to it as the private static generic inner class trick. If you know of a better name, please let me know.

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
  private static ConcurrentDictionary<Type, string> TableNames = new ConcurrentDictionary<Type, string>();

  public static string GetTableName<T>()
    => TableNames.GetOrAdd(typeof(T), type => type
      .GetCustomAttributes(typeof(TableAttribute), true)
      .Cast<TableAttribute>()
      .FirstOrDefault()
      ?.Name);
}
```

(I use `ConcurrentDictionary` here only to get the very useful `GetOrAdd` method, which doesn't exist on `IDictionary`. In a real implementation of this I would probably use just a normal dictionary and a lot more error checking and fallback.)

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
      .GetCustomAttributes(typeof(TableAttribute), true)
      .Cast<TableAttribute>()
      .FirstOrDefault()
      ?.Name;
  }
}
```

Here finally we see the trick in action. The inner class `TableName<T>` is generic, so the static field `Name` will be created once per type `T`. The way generics work in C# is that [at runtime a class is created for each specific type of the generic class](https://www.codeproject.com/Articles/20481/NET-Type-Internals-From-a-Microsoft-CLR-Perspecti#21). The initializer of this field will only be called the first time, just like the way we set up our dictionary in the previous example.

Is this faster than the dictionary? Yes, from simple benchmarks it seems to be almost 10x faster! This is because we have replaced hashcode calculation and dictionary lookup with a single static field read from a class. It's unlikely that we can make this any faster.

### Benchmark you say?

Here is the full code sample for the benchmark, written in BenchmarkDotNet. This is very simple, probably not the best way to do it, but I think it gives a good indication of how this trick works:

```csharp
[CoreJob]
[RankColumn]
public class Program
{
  [Benchmark]
  public string Reflection() => GetFromReflection<BlogPost>();

  [Benchmark]
  public string Dictionary() => GetFromDictionary<BlogPost>();

  [Benchmark]
  public string Inner() => GetFromInner<BlogPost>();

  public static void Main()
    => BenchmarkRunner.Run<Program>();

  private static string GetFromReflection<T>()
    => typeof(T)
      .GetCustomAttributes(typeof(TableAttribute), true)
      .Cast<TableAttribute>()
      .FirstOrDefault()
      ?.Name;

  private static Dictionary<Type, string> _dictionary = new Dictionary<Type, string>();

  private static string GetFromDictionary<T>()
    => _dictionary.TryGetValue(typeof(T), out var result) ? result : _dictionary[typeof(T)] = GetFromReflection<T>();

  private static string GetFromInner<T>()
    => InnerClass<T>.Name;

  private static class InnerClass<T>
  {
    public static readonly string Name = GetFromReflection<T>();
  }
}
```

This is the result I get on my machine:

```
BenchmarkDotNet=v0.11.5, OS=Windows 10.0.18362
Intel Core i7-3517U CPU 1.90GHz (Ivy Bridge), 1 CPU, 4 logical and 2 physical cores
.NET Core SDK=2.2.300
  [Host] : .NET Core 2.2.5 (CoreCLR 4.6.27617.05, CoreFX 4.6.27618.01), 64bit RyuJIT
  Core   : .NET Core 2.2.5 (CoreCLR 4.6.27617.05, CoreFX 4.6.27618.01), 64bit RyuJIT

Job=Core  Runtime=Core

|     Method |         Mean |       Error |      StdDev | Rank |
|----------- |-------------:|------------:|------------:|-----:|
| Reflection | 5,426.419 ns | 120.0703 ns | 328.6905 ns |    3 |
| Dictionary |    32.038 ns |   0.1739 ns |   0.1627 ns |    2 |
|      Inner |     3.844 ns |   0.0532 ns |   0.0471 ns |    1 |

```

While the Dictionary code takes about 32ms to complete the Inner class version runs in 3.8ms, or more than 8x as fast! It varies a bit, and this is a very simple scenario where the dictionary contains only a single item, so I suspect the Inner method will be even more performant, compared to the Dictionary method, in the real world.

### Where does this trick come from?

I found this trick first used in the [Array.Empty<T>](https://github.com/microsoft/referencesource/blob/master/mscorlib/system/array.cs#L1080) method, which relies on the internal class [EmptyArray<T>](https://github.com/microsoft/referencesource/blob/master/mscorlib/system/array.cs#L3080). In this scenario it is used to create a single instance of an empty array of a specific type for the duration of the program. This prevents the wasted CPU and memory of creating a new instance of an empty array every time that is needed. All empty arrays are exactly the same, so we don't need a new one for every scenario, we can just reuse the same empty array (of a specific type) everywhere it is needed. I stole this trick for the [`Empty` class](https://github.com/ClaveConsulting/ExtensionMethods/#empty) in our [extension methods nuget](https://www.nuget.org/packages/Clave.ExtensionMethods) package at work.

I haven't seen it used any other place, probably because of its many limitations.

### Limitations

I've called this article the type-dictionary trick and compared it against the performance of a dictionary, but the code above doesn't much behave like a dictionary. In particular:

* Unlike a dictionary it can only work with `Type` as its key
* Not just that, the type has to be passed in as a generic type, it can't be a normal parameter to the function
* It is not possible to remove entries from the dictionary, they will be there forever
  * Well, you could set the value to null, or create a wrapper type with a special "no-value" value...
  * ... but even then the memory for the entry will not be released, so the dictionary will only ever grow in size
* You can only have a single instance of this dictionary; it has to be static
  * ... or do we? We'll look at a workaround below
* This limitation means that probably you want it to be read-only, since mutating static variables leads to pain and suffering

The result is that you probably only want to use this trick to store some values that don't change and are fixed at compile time, like the value of the attribute in the example above. Reflection caching seems to be a good scenario for this trick, since it works on types and we often use reflection on types, and the result won't change at runtime.

### Another (crazy) example

A place where reflection is often used is for dependency injection, like the `IServiceProvider` in .NET core. We can use the trick to make a super fast service lookup, like this:

```csharp
public class FastServiceProvider
{
  public void AddService<TService>(Func<TService> factory)
    => Inner<TService>.ServiceFactory = factory;

  public TService GetService<TService>()
    => Inner<TService>.ServiceFactory();

  private static class Inner<TService>
  {
      public static Func<TService> ServiceFactory;
  }
}
```

This is a very limited example that only lets you register a factory function and look up a service using the generic `GetService<TService>()` function. But it has a bigger problem, namely that you can't have multiple instances of `FastServiceProvider` with different services, since it all relies on the static inner class. How can we work around this problem? First, we need some way to differentiate different instances of `FastServiceProvider`, and we can do that by making it too generic. The inner class is now unique per two generic type parameters, so as long as we create a `new FastServiceProvider<TypeA>` and a `FastServiceProvider<TypeB>` then they will have different inner classes and different "dictionaries" of services.


```csharp
public class FastServiceProvider<T>
{
  public void AddService<TService>(Func<TService> factory)
    => Inner<TService>.ServiceFactory = factory;

  public TService GetService<TService>()
    => Inner<TService>.ServiceFactory();

  private static class Inner<TService>
  {
      public static Func<TService> ServiceFactory;
  }
}
```

But, we have to make sure to always use a new type every time we create a new instance of `FastServiceProvider<T>`, or else two instances will share services! We need some way to create the generic `FastServiceProvider<T>` with a different type `T` each time. We can do that by dynamically creating types, at runtime, when we need one. The code for doing just that look something like this:

```csharp
public static class MyTypeBuilder
{
  private static int Counter { get; set; } = 0;

  private static AssemblyName MyAssemblyName { get; } = new AssemblyName("MyAssembly");

  private static AssemblyBuilder MyAssembly { get; } = AssemblyBuilder.DefineDynamicAssembly(MyAssemblyName, AssemblyBuilderAccess.Run);

  private static ModuleBuilder MainModule { get; } = MyAssembly.DefineDynamicModule("MainModule");

  public static Type CreateType()
    => GetTypeBuilder($"MyType{Counter++}")
      .CreateType();

  private static TypeBuilder GetTypeBuilder(string name)
    => MainModule.DefineType(name,
        TypeAttributes.Public |
        TypeAttributes.Class |
        TypeAttributes.AutoClass |
        TypeAttributes.AnsiClass |
        TypeAttributes.BeforeFieldInit |
        TypeAttributes.AutoLayout,
        null);
}
```

Don't worry too much about this code, it is mostly copied from a Stack Overflow answer. It creates a new Type in an assembly created at runtime. The type we create here is empty, since we don't need it for anything apart from being unique. The `Counter` that increments ensures that the name is unique.

Now that we have a way to create new unique types whenever we need them we just have to combine it with the generic `FastServiceProvider<T>` somehow. We've used inner classes to solve all kinds of problems so far, so why stop now? We can take the generic class we have and put it inside a new class, one that is static and only has a single public method, `Create()`. This creates a new instance using a new type. The way it does it is through reflection and to make it all easy to use I've created an interface that we can rely on.

```csharp
public interface IFastServiceProvider
{
  void AddService<TService>(Func<TService> factory);

  TService GetService<TService>();
}

public static class FastServiceProvider
{
  public static IFastServiceProvider Create()
    => (IFastServiceProvider) typeof(FastServiceProvider)
      .GetMethod("CreateInner", BindingFlags.NonPublic | BindingFlags.Static)
      .MakeGenericMethod(MyTypeBuilder.CreateType())
      .Invoke(null, null);

  private static InnerFast<T> CreateInner<T>()
    => new InnerFast<T>();

  private class GenericServiceProvider<T>
  {
    public void AddService<TService>(Func<TService> factory)
      => Inner<TService>.ServiceFactory = factory;

    public TService GetService<TService>()
      => Inner<TService>.ServiceFactory();

    private static class Inner<TService>
    {
        public static Func<TService> ServiceFactory;
    }
  }
}
```

Ok, that's quite a bit of convoluted code. I don't know if this is at all useful or just too complicated for any practical use. Since this uses reflection in the `Create` method it is not very fast to create new instances, but once the instances have been made they are lightning fast!

We can work around some of the other limitations in similar convoluted ways, but this is already getting a bit out of hand, so I'll leave that as an excercise for the reader. 

### Conclusion

I've shown here how to use a generic inner class to store data per type in a program. I think this is a neat way to get high performance code, and I've seen it used in the wild, but only a few places. I don't know if this trick has a name, or if it is used other places, but if you do, please let me know. Oh, and if you find mistakes or spelling errors, let me know as well by creating an issue or pull-request [here](https://github.com/mariusGundersen/website).

