---
  id: 4
  title: "Multiple dispatch with partial classes in C#"
  short: "Using dynamic and partial classes we can get multiple dispatch in C#"
  image: ""
  date: "2014-10-13"
---

Multiple dispatch is a way to ...

C# supports both static (aka, early) binding and dynamic (aka, late) binding. With version X of C# the dynamic binding went from single dispatch (where only one parameter decided which implementation to invoke) to multiple dispatch (where multiple parameters together decide which implementation to invoke). Single dispatch is available in C# using polymorphism: Given an interface with a method, multiple implementations of that interface can be made, and each one has a different version of the method. Only at runtime (in other words, as late as possible, hence late binding) can the correct implementation be found, as shown in the code example below.

```c#
public interface IAnimal
{
  public string MakeSound();
}

public class Cat : IAnimal
{
  public string MakeSonud()
  {
    return "Meow";
  }
}

public class Dog : IAnimal
{
  public string MakeSonud()
  {
    return "Woff";
  }
}

public class Program
{
  public static void Main(...string[] args)
  {
    var cat = new Cat();
    var dog = new Dog();
    DoLateBinding(RandomlyDecide() ? cat : dog);
  }
  public void DoLateBinding(IAnimal animal){
    Console.WriteLine(animal.MakeSound()); //Meow or Woff
  }
}
```

Late binding is useful and common in OOP codebases. One advantage is that it lets you decide between multiple implementations without having to write if statements. But it only works with one unknown variable. In the above code the cat always says `Meow`, but cats only say that to humans. If the cat was communicating with the dog, then it would likely hiss at it, and the dog would proably growl back.

Multiple dispatch (or dynamic dispatch) lets the system decide on an implementation to invoke based on multiple parameters. This is implemented in C# using the `dynamic` keyword, as shown in the code below:

```c#
public interface IAnimal
{
  public string CommunicateTo(IAnimal);
}

public class Cat : IAnimal
{
  public string ComunicateTo(Human human)
  {
    return "Meow";
  }
  public string ComunicateTo(Cat cat)
  {
    return "Purr";
  }
  public string ComunicateTo(Dog dog)
  {
    return "Hiss";
  }
}

public class Dog : IAnimal
{
  public string ComunicateTo(Human human)
  {
    return "Woff";
  }
  public string ComunicateTo(Dog dog)
  {
    return "";
  }
}

public class Program
{
  public static void Main(...string[] args)
  {
    var cat = new Cat();
    var dog = new Dog();
    DoLateBinding(RandomlyDecide() ? cat : dog);
  }
  public void DoLateBinding(IAnimal animal){
    Console.WriteLine(animal.MakeSound()); //Meow or Woff
  }
}
```

