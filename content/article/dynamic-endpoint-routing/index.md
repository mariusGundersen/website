---
title: "Dynamic endpoint routing"
short: "How to use the EndpointDataSource in asp.net"
date: "2021-09-08"
type: "article"
---

# Dynamic endpoint routing in asp.net

I want to share a bit about how the endpoint routing in asp.net can be made dynamic. I tried to look into this, but couldn't find any documentation and so decided that I had to write about it myself. I will use asp.net 6 in this article since I can then use the [minimal apis](https://www.hanselman.com/blog/exploring-a-minimal-web-api-with-aspnet-core-6) and more easily fit everything into a single file, but the code shown here will work in asp.net 5 and will work with the classical `Startup` class too.

With a minimal api we have a `program.cs` file that looks like this:

```csharp
var builder = WebApplication.CreateBuilder(args);

var app = builder.Build();

app.MapGet("/", () => "Hello World!");

app.Run();
```

This very simple example adds a single route that responds `Hello World!` to `GET /` requests, and we can add more such routes by copying and slightly changing the `app.MapGet()` line. But we are limited in that we can only statically add routes, we can't change routes at runtime. How would we add, remove or change a route while the application is running, without having to restart it?

The short answer is to use an `EndpointDataSource`. The slightly longer answer is that everything is already using `EndpointDataSource`, it's just hidden inside extension methods. The `app` variable is a class that implements [`IEndpointRouteBuilder` interface](https://github.com/dotnet/aspnetcore/blob/main/src/Http/Routing/src/IEndpointRouteBuilder.cs) which looks like this:

```csharp
// Licensed to the .NET Foundation under one or more agreements.
// The .NET Foundation licenses this file to you under the MIT license.

using System;
using System.Collections.Generic;
using Microsoft.AspNetCore.Builder;

namespace Microsoft.AspNetCore.Routing
{
    /// <summary>
    /// Defines a contract for a route builder in an application. A route builder specifies the routes for
    /// an application.
    /// </summary>
    public interface IEndpointRouteBuilder
    {
        /// <summary>
        /// Creates a new <see cref="IApplicationBuilder"/>.
        /// </summary>
        /// <returns>The new <see cref="IApplicationBuilder"/>.</returns>
        IApplicationBuilder CreateApplicationBuilder();

        /// <summary>
        /// Gets the sets the <see cref="IServiceProvider"/> used to resolve services for routes.
        /// </summary>
        IServiceProvider ServiceProvider { get; }

        /// <summary>
        /// Gets the endpoint data sources configured in the builder.
        /// </summary>
        ICollection<EndpointDataSource> DataSources { get; }
    }
}
```

That's the whole interface, all the fun methods like `MapGet()` and `MapControllers()` are extension methods that can only work with these three exposed members. There's no list of endpoints here that the `MapGet()` extension method could add to, so how are new endpoints added? Instead of adding an endpoint directly the extension methods add data sources to the `DataSources` collection.

The `DataSources` is a collection of [`EndpointDataSource`](https://github.com/dotnet/aspnetcore/blob/main/src/Http/Routing/src/EndpointDataSource.cs) objects. This abstract class is defined below, and here you can see the `Endpoints` member that exposes a list of endpoints.

```csharp
// Licensed to the .NET Foundation under one or more agreements.
// The .NET Foundation licenses this file to you under the MIT license.

using System.Collections.Generic;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Primitives;

namespace Microsoft.AspNetCore.Routing
{
    /// <summary>
    /// Provides a collection of <see cref="Endpoint"/> instances.
    /// </summary>
    public abstract class EndpointDataSource
    {
        /// <summary>
        /// Gets a <see cref="IChangeToken"/> used to signal invalidation of cached <see cref="Endpoint"/>
        /// instances.
        /// </summary>
        /// <returns>The <see cref="IChangeToken"/>.</returns>
        public abstract IChangeToken GetChangeToken();

        /// <summary>
        /// Returns a read-only collection of <see cref="Endpoint"/> instances.
        /// </summary>
        public abstract IReadOnlyList<Endpoint> Endpoints { get; }
    }
}
```

So instead of adding endpoints (aka routes) to `app` directly, we instead specify a list of endpoint sources, each of which specifies a list of endpoints. But as you can see from the abstract class above, there is also a `GetChangeToken()` method, which sounds interesting. Maybe we can change what endpoints are registered by playing around with this token?

<code-wave>

```csharp
var builder = WebApplication.CreateBuilder(args);

var app = builder.Build();

app.MapGet("/", () => "Hello World!");

app.Run();
```

## Registering an EndpointDataSource

We'll start with the minimal api and then add stuff to it.

```csharp
var builder = WebApplication.CreateBuilder(args);

var app = builder.Build();

app.MapGet("/", () => "Hello World!");

app.Run();

public class MyEndpointDataSource : EndpointDataSource
{
    // we have no changeToken
    public override IChangeToken GetChangeToken() => default;

    // we don't have any endpoints either
    public override IReadOnlyList<Endpoint> Endpoints { get; } = Array.Empty<Endpoint>();
}
```

Let's make our own `EndpointDataSource`. This on doesn't really do anything, we can make it more useful later on. How would we use this class?

```csharp
var builder = WebApplication.CreateBuilder(args);

var app = builder.Build();

app.DataSources.Add(new MyEndpointDataSource());

app.MapGet("/", () => "Hello World!");

app.Run();

public class MyEndpointDataSource : EndpointDataSource
{
    // we have no changeToken
    public override IChangeToken GetChangeToken() => default;

    // we don't have any endpoints either
    public override IReadOnlyList<Endpoint> Endpoints { get; } = Array.Empty<Endpoint>();
}
```

This is the simplest way to do it, but that's not very pretty. We can hide this detail inside an extension method, just like Microsoft does.

```csharp
var builder = WebApplication.CreateBuilder(args);

var app = builder.Build();

app.UseMyEndpoints();

app.MapGet("/", () => "Hello World!");

app.Run();

public static class MyExtensionMethods
{
    public static void UseMyEndpoints(this IEndpointRouteBuilder endpoints)
    {
        endpoints.DataSources.Add(new MyEndpointDataSource());
    }
}

public class MyEndpointDataSource : EndpointDataSource
{
    // we have no changeToken
    public override IChangeToken GetChangeToken() => default;

    // we don't have any endpoints either
    public override IReadOnlyList<Endpoint> Endpoints { get; } = Array.Empty<Endpoint>();
}
```

Very nice, this looks much more professional. We can now hide details of how `MyEndpointDataSource` is constructed inside this extension method, and all anyone else ever needs to know is that they should call `UseMyEndpoints()`.

But now we have a `new MyEndpointDataSource()` in the extension method, can we improve this? What if we want to inject things into this constructor? To do that we need to get the `MyEndpointDataSource` from the services list:

```csharp
var builder = WebApplication.CreateBuilder(args);

var app = builder.Build();

app.UseMyEndpoints();

app.MapGet("/", () => "Hello World!");

app.Run();

public static class MyExtensionMethods
{
    public static void UseMyEndpoints(this IEndpointRouteBuilder endpoints)
    {
        var dataSource = endpoints.ServiceProvider.GetService<MyEndpointDataSource>();

        if (dataSource is null)
        {
            throw new Exception("Did you forget to add MyEndpointDataSource to the services?");
        }

        endpoints.DataSources.Add(dataSource);
    }
}

public class MyEndpointDataSource : EndpointDataSource
{
    // we have no changeToken
    public override IChangeToken GetChangeToken() => default;

    // we don't have any endpoints either
    public override IReadOnlyList<Endpoint> Endpoints { get; } = Array.Empty<Endpoint>();
}
```

The extension method now relies on the service provider and dependency injection to create the `MyEndpointDataSource`. This means that we can inject whatever we want into its constructor, and we don't have to change anything here. We'll see later how that becomes useful. But, as the exception says, we also have to remember to add `MyEndpointDataSource` to the list of injectable services.

```csharp
var builder = WebApplication.CreateBuilder(args);

builder.Services.AddSingleton<MyEndpointDataSource>();

var app = builder.Build();

app.UseMyEndpoints();

app.MapGet("/", () => "Hello World!");

app.Run();

public static class MyExtensionMethods
{
    public static void UseMyEndpoints(this IEndpointRouteBuilder endpoints)
    {
        var dataSource = endpoints.ServiceProvider.GetService<MyEndpointDataSource>();

        if (dataSource is null)
        {
            throw new Exception("Did you forget to add MyEndpointDataSource to the services?");
        }

        endpoints.DataSources.Add(dataSource);
    }
}

public class MyEndpointDataSource : EndpointDataSource
{
    // we have no changeToken
    public override IChangeToken GetChangeToken() => default;

    // we don't have any endpoints either
    public override IReadOnlyList<Endpoint> Endpoints { get; } = Array.Empty<Endpoint>();
}
```

By adding it as a singleton before calling `builder.Build()` we can get the service later by explicitly calling `GetService` or implicitly through constructor injection. But again, this is exposing some details that aren't so nice. We can make another extension method in order to clean up this a bit, making it more like the asp.net routing.

```csharp
var builder = WebApplication.CreateBuilder(args);

builder.Services.AddMyEndpoints();

var app = builder.Build();

app.UseMyEndpoints();

app.MapGet("/", () => "Hello World!");

app.Run();

public static class MyExtensionMethods
{
    public static void AddMyEndpoints(this IServiceCollection services)
    {
        services.AddSingleton<MyEndpointDataSource>();
    }

    public static void UseMyEndpoints(this IEndpointRouteBuilder endpoints)
    {
        var dataSource = endpoints.ServiceProvider.GetService<MyEndpointDataSource>();

        if (dataSource is null)
        {
            throw new Exception("Did you forget to call Services.AddMyEndpoints()?");
        }

        endpoints.DataSources.Add(dataSource);
    }
}

public class MyEndpointDataSource : EndpointDataSource
{
    // we have no changeToken
    public override IChangeToken GetChangeToken() => default;

    // we don't have any endpoints either
    public override IReadOnlyList<Endpoint> Endpoints { get; } = Array.Empty<Endpoint>();
}
```

Moving the `AddSingleton` call into an extension method hides some details from the developer who is going to maintain our code.

And there we have it, we have set up our own endpoint data source, just like the routing that is part of asp.net does it. Now we just need to make it do something useful.

```csharp 33:40
var builder = WebApplication.CreateBuilder(args);

builder.Services.AddMyEndpoints();

var app = builder.Build();

app.UseMyEndpoints();

app.MapGet("/", () => "Hello World!");

app.Run();

public static class MyExtensionMethods
{
    public static void AddMyEndpoints(this IServiceCollection services)
    {
        services.AddSingleton<MyEndpointDataSource>();
    }

    public static void UseMyEndpoints(this IEndpointRouteBuilder endpoints)
    {
        var dataSource = endpoints.ServiceProvider.GetService<MyEndpointDataSource>();

        if (dataSource is null)
        {
            throw new Exception("Did you forget to call Services.AddMyEndpoints()?");
        }

        endpoints.DataSources.Add(dataSource);
    }
}

public class MyEndpointDataSource : EndpointDataSource
{
    // we have no changeToken
    public override IChangeToken GetChangeToken() => default;

    // we don't have any endpoints either
    public override IReadOnlyList<Endpoint> Endpoints { get; } = Array.Empty<Endpoint>();
}
```

## Providing endpoints

The endpoints data source we currently have is quite bare, it provides only an empty list of endpoints. Let's set it up so that it at least provides one endpoint, although it's hardcoded and not terribly interesting.

```csharp
var builder = WebApplication.CreateBuilder(args);

builder.Services.AddMyEndpoints();

var app = builder.Build();

app.UseMyEndpoints();

app.MapGet("/", () => "Hello World!");

app.Run();

public static class MyExtensionMethods
{
    public static void AddMyEndpoints(this IServiceCollection services)
    {
        services.AddSingleton<MyEndpointDataSource>();
    }

    public static void UseMyEndpoints(this IEndpointRouteBuilder endpoints)
    {
        var dataSource = endpoints.ServiceProvider.GetService<MyEndpointDataSource>();

        if (dataSource is null)
        {
            throw new Exception("Did you forget to call Services.AddMyEndpoints()?");
        }

        endpoints.DataSources.Add(dataSource);
    }
}

public class MyEndpointDataSource : EndpointDataSource
{
    // we have no changeToken
    public override IChangeToken GetChangeToken() => default;

    public override IReadOnlyList<Endpoint> Endpoints { get; } = new []
    {
        CreateEndpoint("/myEndpoint", async context =>
        {
            await context.Response.WriteAsync("Hello World!");
        })
    };

    private static Endpoint CreateEndpoint(string pattern, RequestDelegate requestDelegate) =>
        new RouteEndpointBuilder(
            requestDelegate: requestDelegate,
            routePattern: RoutePatternFactory.Parse(pattern),
            order: 0)
        .Build();
}
```

The static `CreateEndpoint` method wraps the `RouteEndpointBuilder` and the `RoutePatternFactory` to make an endpoint from a string and a delegate. Making an endpoint is surprisingly difficult, so making your own simplified methods is recommended.

I use this method to create a single endpoint for the `Endpoints` list, so you can see how it works. The first parameter is the route pattern, which needs to follow the rules for [route templates](https://docs.microsoft.com/en-us/aspnet/core/fundamentals/routing?view=aspnetcore-5.0#route-template-reference). The second parameter should be a delegate/lambda/method that handles the request.

You can change the code to add more endpoints if you want to. But all those endpoints will be static, that is, they will be defined before the application starts and cannot be changed. How can we add another endpoint while the application is running?

```csharp
var builder = WebApplication.CreateBuilder(args);

builder.Services.AddMyEndpoints();

var app = builder.Build();

app.UseMyEndpoints();

app.MapGet("/", () => "Hello World!");

app.Run();

public static class MyExtensionMethods
{
    public static void AddMyEndpoints(this IServiceCollection services)
    {
        services.AddSingleton<MyEndpointDataSource>();
    }

    public static void UseMyEndpoints(this IEndpointRouteBuilder endpoints)
    {
        var dataSource = endpoints.ServiceProvider.GetService<MyEndpointDataSource>();

        if (dataSource is null)
        {
            throw new Exception("Did you forget to call Services.AddMyEndpoints()?");
        }

        endpoints.DataSources.Add(dataSource);
    }
}

public class MyEndpointDataSource : EndpointDataSource
{
    // we have no changeToken
    public override IChangeToken GetChangeToken() => default;

    public override IReadOnlyList<Endpoint> Endpoints { get; } = MakeEndpoints("myEndpoint");

    private IReadOnlyList<Endpoint> MakeEndpoints(string route)
        => new []
        {
            // routes have to start with /
            CreateEndpoint($"/{route}", async context =>
            {
                await context.Response.WriteAsync("Hello World!");
            }),
            CreateEndpoint("/setEndpoint/{**route}", async context => {
                Endpoints = MakeEndpoints(context.Request.RouteValues["route"]);
            })
        };

    private static Endpoint CreateEndpoint(string pattern, RequestDelegate requestDelegate) =>
        new RouteEndpointBuilder(
            requestDelegate: requestDelegate,
            routePattern: RoutePatternFactory.Parse(pattern),
            order: 0)
        .Build();
}
```

This is a bit of a silly example that lets you change the route using another route. Here you can go to `/myEndpoint` to get the `"Hello World!"` response, but if you go to `/setEndpoint/yourEndpoint`, then `/myEndpoint` will no longer work, and now you have to go to `/yourEndpoint`. Well, in theory at least. We need to implement the `GetChangeToken` for the changes to take place.

```csharp
var builder = WebApplication.CreateBuilder(args);

builder.Services.AddMyEndpoints();

var app = builder.Build();

app.UseMyEndpoints();

app.MapGet("/", () => "Hello World!");

app.Run();

public static class MyExtensionMethods
{
    public static void AddMyEndpoints(this IServiceCollection services)
    {
        services.AddSingleton<MyEndpointDataSource>();
    }

    public static void UseMyEndpoints(this IEndpointRouteBuilder endpoints)
    {
        var dataSource = endpoints.ServiceProvider.GetService<MyEndpointDataSource>();

        if (dataSource is null)
        {
            throw new Exception("Did you forget to call Services.AddMyEndpoints()?");
        }

        endpoints.DataSources.Add(dataSource);
    }
}

public class MyEndpointDataSource : EndpointDataSource
{
    private CancellationTokenSource _cancellationTokenSource = new CancellationTokenSource();

    public override IChangeToken GetChangeToken() => new CancellationChangeToken(_cancellationTokenSource.Token);

    public override IReadOnlyList<Endpoint> Endpoints { get; } = MakeEndpoints("myEndpoint");

    private IReadOnlyList<Endpoint> MakeEndpoints(string route)
        => new []
        {
            // routes have to start with /
            CreateEndpoint($"/{route}", async context =>
            {
                await context.Response.WriteAsync("Hello World!");
            }),
            CreateEndpoint("/setEndpoint/{**route}", async context => {
                var oldCancellationTokenSource = _cancellationTokenSource;

                Endpoints = MakeEndpoints(context.Request.RouteValues["route"]);

                _cancellationTokenSource = new CancellationTokenSource();

                oldCancellationTokenSource?.Cancel();
            })
        };

    private static Endpoint CreateEndpoint(string pattern, RequestDelegate requestDelegate) =>
        new RouteEndpointBuilder(
            requestDelegate: requestDelegate,
            routePattern: RoutePatternFactory.Parse(pattern),
            order: 0)
        .Build();
}
```

Here we use a `CancellationTokenSource` to create a `CancellationChangeToken` (which implements `IChangeToken`). This is (kind of) the way it's done in the [asp.net source code](https://github.com/dotnet/aspnetcore/blob/8b30d862de6c9146f466061d51aa3f1414ee2337/src/Mvc/Mvc.Core/src/Routing/ActionEndpointDataSourceBase.cs), and I haven't found a simpler or better way to do it, so I've copied it (with some slight changes) here. It's a bit weird to me that we use the concept of cancellation for notifying changes, but if it's good enough for Microsoft it's good enough for us.

The change token is used to notify asp.net that the `Endpoints` list has changed. If you trigger a change through the change token then asp.net will get the (read only) list of endpoints and update the route table. It seems like it also gets a new change token when it gets the list of endpoints, so the change token can only be triggered once. That is why a new one is made each time the `Endpoints` is written to.

One thing I haven't copied from them (yet) is the locks, which are needed to make it thread-safe. This class is getting a bit too big, having to deal with both the routes and the change notification code, and making it thread-safe will make it even bigger. What we can do is take all the change tracking code and put it in an abstract base class that `MyEndpointDataSource` can extend.

```csharp
var builder = WebApplication.CreateBuilder(args);

builder.Services.AddMyEndpoints();

var app = builder.Build();

app.UseMyEndpoints();

app.MapGet("/", () => "Hello World!");

app.Run();

public static class MyExtensionMethods
{
    public static void AddMyEndpoints(this IServiceCollection services)
    {
        services.AddSingleton<MyEndpointDataSource>();
    }

    public static void UseMyEndpoints(this IEndpointRouteBuilder endpoints)
    {
        var dataSource = endpoints.ServiceProvider.GetService<MyEndpointDataSource>();

        if (dataSource is null)
        {
            throw new Exception("Did you forget to call Services.AddMyEndpoints()?");
        }

        endpoints.DataSources.Add(dataSource);
    }
}

public class MyEndpointDataSource : EndpointDataSource
{
    private CancellationTokenSource _cancellationTokenSource = new CancellationTokenSource();

    public override IChangeToken GetChangeToken() => new CancellationChangeToken(_cancellationTokenSource.Token);

    public override IReadOnlyList<Endpoint> Endpoints { get; } = MakeEndpoints("myEndpoint");

    private IReadOnlyList<Endpoint> MakeEndpoints(string route)
        => new []
        {
            // routes have to start with /
            CreateEndpoint($"/{route}", async context =>
            {
                await context.Response.WriteAsync("Hello World!");
            }),
            CreateEndpoint("/setEndpoint/{**route}", async context => {
                var oldCancellationTokenSource = _cancellationTokenSource;

                Endpoints = MakeEndpoints(context.Request.RouteValues["route"]);

                _cancellationTokenSource = new CancellationTokenSource();

                oldCancellationTokenSource?.Cancel();
            })
        };

    private static Endpoint CreateEndpoint(string pattern, RequestDelegate requestDelegate) =>
        new RouteEndpointBuilder(
            requestDelegate: requestDelegate,
            routePattern: RoutePatternFactory.Parse(pattern),
            order: 0)
        .Build();
}

public abstract class MutableEndpointDataSource : EndpointDataSource
{
    private readonly object _lock = new object();

    private IReadOnlyList<Endpoint> _endpoints;

    private CancellationTokenSource _cancellationTokenSource;

    private IChangeToken _changeToken;

    public MutableEndpointDataSource() : this(Array.Empty<Endpoint>()) { }

    public MutableEndpointDataSource(IReadOnlyList<Endpoint> endpoints)
    {
        SetEndpoints(endpoints);
    }

    public override IChangeToken GetChangeToken() => _changeToken;

    public override IReadOnlyList<Endpoint> Endpoints => _endpoints;

    public void SetEndpoints(IReadOnlyList<Endpoint> endpoints)
    {
        lock (_lock)
        {
            var oldCancellationTokenSource = _cancellationTokenSource;

            _endpoints = endpoints;

            _cancellationTokenSource = new CancellationTokenSource();
            _changeToken = new CancellationChangeToken(_cancellationTokenSource.Token);

            oldCancellationTokenSource?.Cancel();
        }
    }
}
```

Ok, that's a lot of code for the `MutableEndpointDataSource`, but it's going to make `MyEndpointDataSource` much simpler. This abstract class keeps track of endpoints and uses the `CancellationTokenSource` trick for notifying whenever the list of endpoints change. The only way to change that list is to call `SetEndpoints` with a new list of endpoints. That method is wrapped in a lock, so that only one thread can make a change to the list at a time. If multiple threads try to call `SetEndpoints` at the same time they will have to wait and run one at a time.

How would we use this abstract class?

```csharp
var builder = WebApplication.CreateBuilder(args);

builder.Services.AddMyEndpoints();

var app = builder.Build();

app.UseMyEndpoints();

app.MapGet("/", () => "Hello World!");

app.Run();

public static class MyExtensionMethods
{
    public static void AddMyEndpoints(this IServiceCollection services)
    {
        services.AddSingleton<MyEndpointDataSource>();
    }

    public static void UseMyEndpoints(this IEndpointRouteBuilder endpoints)
    {
        var dataSource = endpoints.ServiceProvider.GetService<MyEndpointDataSource>();

        if (dataSource is null)
        {
            throw new Exception("Did you forget to call Services.AddMyEndpoints()?");
        }

        endpoints.DataSources.Add(dataSource);
    }
}

public class MyEndpointDataSource : MutableEndpointDataSource
{
    public MyEndpointDataSource()
    {
        SetEndpoints(MakeEndpoints("myEndpoint"));
    }

    private IReadOnlyList<Endpoint> MakeEndpoints(string route)
        => new[]
        {
            // routes have to start with /
            CreateEndpoint($"/{route}", async context =>
            {
                await context.Response.WriteAsync("Hello World!");
            }),
            CreateEndpoint("/setEndpoint/{**route}", async context => {
                SetEndpoints(MakeEndpoints(context.Request.RouteValues["route"].ToString()));
            })
        };

    private static Endpoint CreateEndpoint(string pattern, RequestDelegate requestDelegate) =>
        new RouteEndpointBuilder(
            requestDelegate: requestDelegate,
            routePattern: RoutePatternFactory.Parse(pattern),
            order: 0)
        .Build();
}

public abstract class MutableEndpointDataSource : EndpointDataSource
{
    private readonly object _lock = new object();

    private IReadOnlyList<Endpoint> _endpoints;

    private CancellationTokenSource _cancellationTokenSource;

    private IChangeToken _changeToken;

    public MutableEndpointDataSource() : this(Array.Empty<Endpoint>()) { }

    public MutableEndpointDataSource(IReadOnlyList<Endpoint> endpoints)
    {
        SetEndpoints(endpoints);
    }

    public override IChangeToken GetChangeToken() => _changeToken;

    public override IReadOnlyList<Endpoint> Endpoints => _endpoints;

    public void SetEndpoints(IReadOnlyList<Endpoint> endpoints)
    {
        lock (_lock)
        {
            var oldCancellationTokenSource = _cancellationTokenSource;

            _endpoints = endpoints;

            _cancellationTokenSource = new CancellationTokenSource();
            _changeToken = new CancellationChangeToken(_cancellationTokenSource.Token);

            oldCancellationTokenSource?.Cancel();
        }
    }
}
```

`MyEndpointDataSource` is now much simpler, it now focuses purely on how to create the endpoints we are interested in. It can call `SetEndpoints` with the new list of endpoints and let the abstract base class deal with the issue of notifications and stuff.

And there we have it, probably the simplest way to implement dynamic route updates in asp.net.

```csharp 1:59
var builder = WebApplication.CreateBuilder(args);

builder.Services.AddMyEndpoints();

var app = builder.Build();

app.UseMyEndpoints();

app.MapGet("/", () => "Hello World!");

app.Run();

public static class MyExtensionMethods
{
    public static void AddMyEndpoints(this IServiceCollection services)
    {
        services.AddSingleton<MyEndpointDataSource>();
    }

    public static void UseMyEndpoints(this IEndpointRouteBuilder endpoints)
    {
        var dataSource = endpoints.ServiceProvider.GetService<MyEndpointDataSource>();

        if (dataSource is null)
        {
            throw new Exception("Did you forget to call Services.AddMyEndpoints()?");
        }

        endpoints.DataSources.Add(dataSource);
    }
}

public class MyEndpointDataSource : MutableEndpointDataSource
{
    public MyEndpointDataSource()
    {
        SetEndpoints(MakeEndpoints("myEndpoint"));
    }

    private IReadOnlyList<Endpoint> MakeEndpoints(string route)
        => new[]
        {
            // routes have to start with /
            CreateEndpoint($"/{route}", async context =>
            {
                await context.Response.WriteAsync("Hello World!");
            }),
            CreateEndpoint("/setEndpoint/{**route}", async context => {
                SetEndpoints(MakeEndpoints(context.Request.RouteValues["route"].ToString()));
            })
        };

    private static Endpoint CreateEndpoint(string pattern, RequestDelegate requestDelegate) =>
        new RouteEndpointBuilder(
            requestDelegate: requestDelegate,
            routePattern: RoutePatternFactory.Parse(pattern),
            order: 0)
        .Build();
}

public abstract class MutableEndpointDataSource : EndpointDataSource
{
    private readonly object _lock = new object();

    private IReadOnlyList<Endpoint> _endpoints;

    private CancellationTokenSource _cancellationTokenSource;

    private IChangeToken _changeToken;

    public MutableEndpointDataSource() : this(Array.Empty<Endpoint>()) { }

    public MutableEndpointDataSource(IReadOnlyList<Endpoint> endpoints)
    {
        SetEndpoints(endpoints);
    }

    public override IChangeToken GetChangeToken() => _changeToken;

    public override IReadOnlyList<Endpoint> Endpoints => _endpoints;

    public void SetEndpoints(IReadOnlyList<Endpoint> endpoints)
    {
        lock (_lock)
        {
            var oldCancellationTokenSource = _cancellationTokenSource;

            _endpoints = endpoints;

            _cancellationTokenSource = new CancellationTokenSource();
            _changeToken = new CancellationChangeToken(_cancellationTokenSource.Token);

            oldCancellationTokenSource?.Cancel();
        }
    }
}
```

## A more realistic usecase

When I needed to implement dynamic endpoint routing and went hunting for some documentation, without finding any, it wasn't for the use case in the code above. What I needed to support was reading a routing table from the `appsettings.json` file and reacting to that file changing while the program was running. I'll quickly walk you through how I did that, based on the code we have already written.

Asp.net has support for listening to changes to the settings files and updating the settings while the program is running, so that part was straight forward to do.

```csharp
var builder = WebApplication.CreateBuilder(args);

builder.Services.AddMyEndpoints(builder.Configuration);

var app = builder.Build();

app.UseMyEndpoints();

app.MapGet("/", () => "Hello World!");

app.Run();

public record MyConfig
{
    public IReadOnlyDictionary<string, string> Routes { get; init; }
}

public static class MyExtensionMethods
{
    public static void AddMyEndpoints(this IServiceCollection services, IConfiguration configuration)
    {
        services.Configure<MyConfig>(Configuration);
        services.AddSingleton<MyEndpointDataSource>();
    }

    public static void UseMyEndpoints(this IEndpointRouteBuilder endpoints)
    {
        var dataSource = endpoints.ServiceProvider.GetService<MyEndpointDataSource>();

        if (dataSource is null)
        {
            throw new Exception("Did you forget to call Services.AddMyEndpoints()?");
        }

        endpoints.DataSources.Add(dataSource);
    }
}

public class MyEndpointDataSource : MutableEndpointDataSource
{
    public MyEndpointDataSource()
    {
        SetEndpoints(MakeEndpoints("myEndpoint"));
    }

    private IReadOnlyList<Endpoint> MakeEndpoints(string route)
        => new[]
        {
            // routes have to start with /
            CreateEndpoint($"/{route}", async context =>
            {
                await context.Response.WriteAsync("Hello World!");
            }),
            CreateEndpoint("/setEndpoint/{**route}", async context => {
                SetEndpoints(MakeEndpoints(context.Request.RouteValues["route"].ToString()));
            })
        };

    private static Endpoint CreateEndpoint(string pattern, RequestDelegate requestDelegate) =>
        new RouteEndpointBuilder(
            requestDelegate: requestDelegate,
            routePattern: RoutePatternFactory.Parse(pattern),
            order: 0)
        .Build();
}

public abstract class MutableEndpointDataSource : EndpointDataSource
{
    private readonly object _lock = new object();

    private IReadOnlyList<Endpoint> _endpoints;

    private CancellationTokenSource _cancellationTokenSource;

    private IChangeToken _changeToken;

    public MutableEndpointDataSource() : this(Array.Empty<Endpoint>()) { }

    public MutableEndpointDataSource(IReadOnlyList<Endpoint> endpoints)
    {
        SetEndpoints(endpoints);
    }

    public override IChangeToken GetChangeToken() => _changeToken;

    public override IReadOnlyList<Endpoint> Endpoints => _endpoints;

    public void SetEndpoints(IReadOnlyList<Endpoint> endpoints)
    {
        lock (_lock)
        {
            var oldCancellationTokenSource = _cancellationTokenSource;

            _endpoints = endpoints;

            _cancellationTokenSource = new CancellationTokenSource();
            _changeToken = new CancellationChangeToken(_cancellationTokenSource.Token);

            oldCancellationTokenSource?.Cancel();
        }
    }
}
```

This code assumes our `appsettings.json` looks something like this:

<div>

```json
{
  "Logging": {
      // the usual stuff here
  },
  "Routes": {
      "/home": "Hello from home",
      "/about": "This is the about page"
      "/some/other/page": "This page has many segments"
  }
}
```

</div>

I've created a record called `MyConfig` that contains a dictionary of routes. I would like to bind this to the `appsettings.json` file, and that's what the `Configure<MyConfig>(configuration)` call does. I need to pass the configuration into the extension method here, so a small change is needed right at the top of the code too.

The `Configure<MyConfig>(confiuration)` line also registers `IOptionsMonitor<MyConfig>` in the services, so we can inject it into `MyEndpointDataSource`.

```csharp
var builder = WebApplication.CreateBuilder(args);

builder.Services.AddMyEndpoints(builder.Configuration);

var app = builder.Build();

app.UseMyEndpoints();

app.MapGet("/", () => "Hello World!");

app.Run();

public record MyConfig
{
    public IReadOnlyDictionary<string, string> Routes { get; init; }
}

public static class MyExtensionMethods
{
    public static void AddMyEndpoints(this IServiceCollection services, IConfiguration configuration)
    {
        services.Configure<MyConfig>(Configuration);
        services.AddSingleton<MyEndpointDataSource>();
    }

    public static void UseMyEndpoints(this IEndpointRouteBuilder endpoints)
    {
        var dataSource = endpoints.ServiceProvider.GetService<MyEndpointDataSource>();

        if (dataSource is null)
        {
            throw new Exception("Did you forget to call Services.AddMyEndpoints()?");
        }

        endpoints.DataSources.Add(dataSource);
    }
}

public class MyEndpointDataSource : MutableEndpointDataSource
{
    public MyEndpointDataSource(IOptionsMonitor<MyConfig> options)
    {
        SetEndpoints(MakeEndpoints(options.CurrentValue));
    }

    private IReadOnlyList<Endpoint> MakeEndpoints(MyConfig config)
        => config.Routes
            .Select(route => CreateEndpoint(
                route.Key,
                context => context.Response.WriteAsync(route.Value)))
            .ToList();

    private static Endpoint CreateEndpoint(string pattern, RequestDelegate requestDelegate) =>
        new RouteEndpointBuilder(
            requestDelegate: requestDelegate,
            routePattern: RoutePatternFactory.Parse(pattern),
            order: 0)
        .Build();
}

public abstract class MutableEndpointDataSource : EndpointDataSource
{
    private readonly object _lock = new object();

    private IReadOnlyList<Endpoint> _endpoints;

    private CancellationTokenSource _cancellationTokenSource;

    private IChangeToken _changeToken;

    public MutableEndpointDataSource() : this(Array.Empty<Endpoint>()) { }

    public MutableEndpointDataSource(IReadOnlyList<Endpoint> endpoints)
    {
        SetEndpoints(endpoints);
    }

    public override IChangeToken GetChangeToken() => _changeToken;

    public override IReadOnlyList<Endpoint> Endpoints => _endpoints;

    public void SetEndpoints(IReadOnlyList<Endpoint> endpoints)
    {
        lock (_lock)
        {
            var oldCancellationTokenSource = _cancellationTokenSource;

            _endpoints = endpoints;

            _cancellationTokenSource = new CancellationTokenSource();
            _changeToken = new CancellationChangeToken(_cancellationTokenSource.Token);

            oldCancellationTokenSource?.Cancel();
        }
    }
}
```

This simplified example takes the dictionary and maps it so that the key is a route and when you go to it you get the value as a response. For example, you can now request `/home` and the application will respond with `Hello from home`.

There is just one small line of code needed to make it react to `appsettings.json` changes.

```csharp
var builder = WebApplication.CreateBuilder(args);

builder.Services.AddMyEndpoints(builder.Configuration);

var app = builder.Build();

app.UseMyEndpoints();

app.MapGet("/", () => "Hello World!");

app.Run();

public record MyConfig
{
    public IReadOnlyDictionary<string, string> Routes { get; init; }
}

public static class MyExtensionMethods
{
    public static void AddMyEndpoints(this IServiceCollection services, IConfiguration configuration)
    {
        services.Configure<MyConfig>(Configuration);
        services.AddSingleton<MyEndpointDataSource>();
    }

    public static void UseMyEndpoints(this IEndpointRouteBuilder endpoints)
    {
        var dataSource = endpoints.ServiceProvider.GetService<MyEndpointDataSource>();

        if (dataSource is null)
        {
            throw new Exception("Did you forget to call Services.AddMyEndpoints()?");
        }

        endpoints.DataSources.Add(dataSource);
    }
}

public class MyEndpointDataSource : MutableEndpointDataSource
{
    public MyEndpointDataSource(IOptionsMonitor<MyConfig> options)
    {
        SetEndpoints(MakeEndpoints(options.CurrentValue));
        options.OnChange(config => SetEndpoints(MakeEndpoints(config)));
    }

    private IReadOnlyList<Endpoint> MakeEndpoints(MyConfig config)
        => config.Routes
            .Select(route => CreateEndpoint(
                route.Key,
                context => context.Response.WriteAsync(route.Value)))
            .ToList();

    private static Endpoint CreateEndpoint(string pattern, RequestDelegate requestDelegate) =>
        new RouteEndpointBuilder(
            requestDelegate: requestDelegate,
            routePattern: RoutePatternFactory.Parse(pattern),
            order: 0)
        .Build();
}

public abstract class MutableEndpointDataSource : EndpointDataSource
{
    private readonly object _lock = new object();

    private IReadOnlyList<Endpoint> _endpoints;

    private CancellationTokenSource _cancellationTokenSource;

    private IChangeToken _changeToken;

    public MutableEndpointDataSource() : this(Array.Empty<Endpoint>()) { }

    public MutableEndpointDataSource(IReadOnlyList<Endpoint> endpoints)
    {
        SetEndpoints(endpoints);
    }

    public override IChangeToken GetChangeToken() => _changeToken;

    public override IReadOnlyList<Endpoint> Endpoints => _endpoints;

    public void SetEndpoints(IReadOnlyList<Endpoint> endpoints)
    {
        lock (_lock)
        {
            var oldCancellationTokenSource = _cancellationTokenSource;

            _endpoints = endpoints;

            _cancellationTokenSource = new CancellationTokenSource();
            _changeToken = new CancellationChangeToken(_cancellationTokenSource.Token);

            oldCancellationTokenSource?.Cancel();
        }
    }
}
```

Just one little line of code and now the application reacts to changes to the `appsettings.json` file and updates the routing without having to restart.

</code-wave>

The full code can be found below. It should be possible to paste this into a brand new `net6.0` project and run it.

```csharp
using Microsoft.AspNetCore.Routing.Patterns;
using Microsoft.Extensions.Options;
using Microsoft.Extensions.Primitives;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddMyEndpoints(builder.Configuration);

var app = builder.Build();

app.UseMyEndpoints();

app.MapGet("/", () => "Hello World!");

app.Run();

public record MyConfig
{
    public IReadOnlyDictionary<string, string> Routes { get; init; }
}

public static class MyExtensionMethods
{
    public static void AddMyEndpoints(this IServiceCollection services, IConfiguration configuration)
    {
        services.Configure<MyConfig>(Configuration);
        services.AddSingleton<MyEndpointDataSource>();
    }

    public static void UseMyEndpoints(this IEndpointRouteBuilder endpoints)
    {
        var dataSource = endpoints.ServiceProvider.GetService<MyEndpointDataSource>();

        if (dataSource is null)
        {
            throw new Exception("Did you forget to call Services.AddMyEndpoints()?");
        }

        endpoints.DataSources.Add(dataSource);
    }
}

public class MyEndpointDataSource : MutableEndpointDataSource
{
    public MyEndpointDataSource(IOptionsMonitor<MyConfig> options)
    {
        SetEndpoints(MakeEndpoints(options.CurrentValue));
        options.OnChange(config => SetEndpoints(MakeEndpoints(config)));
    }

    private IReadOnlyList<Endpoint> MakeEndpoints(MyConfig config)
        => config.Routes
            .Select(route => CreateEndpoint(
                route.Key,
                context => context.Response.WriteAsync(route.Value)))
            .ToList();

    private static Endpoint CreateEndpoint(string pattern, RequestDelegate requestDelegate) =>
        new RouteEndpointBuilder(
            requestDelegate: requestDelegate,
            routePattern: RoutePatternFactory.Parse(pattern),
            order: 0)
        .Build();
}

public abstract class MutableEndpointDataSource : EndpointDataSource
{
    private readonly object _lock = new object();

    private IReadOnlyList<Endpoint> _endpoints;

    private CancellationTokenSource _cancellationTokenSource;

    private IChangeToken _changeToken;

    public MutableEndpointDataSource() : this(Array.Empty<Endpoint>()) { }

    public MutableEndpointDataSource(IReadOnlyList<Endpoint> endpoints)
    {
        SetEndpoints(endpoints);
    }

    public override IChangeToken GetChangeToken() => _changeToken;

    public override IReadOnlyList<Endpoint> Endpoints => _endpoints;

    public void SetEndpoints(IReadOnlyList<Endpoint> endpoints)
    {
        lock (_lock)
        {
            var oldCancellationTokenSource = _cancellationTokenSource;

            _endpoints = endpoints;

            _cancellationTokenSource = new CancellationTokenSource();
            _changeToken = new CancellationChangeToken(_cancellationTokenSource.Token);

            oldCancellationTokenSource?.Cancel();
        }
    }
}
```

I want to share one extra little thing that I had trouble finding. The code below shows how to make an endpoint that reacts to only POST, unlike the endpoints we have made so far that react to any HTTP method.

```csharp

    private static Endpoint CreatePostEndpoint(string pattern, RequestDelegate requestDelegate) =>
        new RouteEndpointBuilder(
            requestDelegate: requestDelegate,
            routePattern: RoutePatternFactory.Parse(pattern),
            order: 0)
            {
                Metadata =
                {
                    new HttpMethodMetadata(new []{ HttpMethods.Post })
                }
            }
            .Build();
```

<template id="code-wave-template">
<style>
    :host{
        width: calc(100vw - 20px);
        margin-left: calc(50% - 50vw);
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 10px;
    }
    .code-container {
        height: 100dvh;
        position: sticky;
        top: 0;
        bottom: 0;
        background: #1e1e1e;
        overflow: hidden;
        .transformer {
            position: absolute;
            top: 0;
            left: 0;
            transition: scale 1s;
            transform-origin: top left;
            ::slotted(pre){
                overflow: visible !important;
                position: absolute;
                top: 0;
                left: 0;
            }
        }
    }
    .text-container {
        position: relative;
        padding: 50vh 25px;
        ::slotted(pre){
            display: none !important;
        }
        ::slotted(div.text){
            --min-height: 25vh;
            scroll-snap-align: center;
            margin-block: max(3em, calc(100% - 25vh));
        }
        ::slotted(div.current){
            anchor-name: --text;
        }
        &::after {
            content: '';
            position: absolute;
            position-anchor: --text;
            top: anchor(top);
            bottom: anchor(bottom);
            left: 0;
            width: 5px;
            background: red;
            transition: inset .5s;
        }
    }
</style>
      <div class="code-container">
        <div class="transformer">
            <slot name="code"></slot>
            <slot name="code-new"></slot>
        </div>
      </div>
      <div class="text-container">
        <slot>
      </div>
</template>

<script type="module" src="./code-wave.mjs">
