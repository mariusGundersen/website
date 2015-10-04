---
  id: 9
  title: "Why does Twitter freeze when loading new tweets?"
  short: "An investigation using DevTools"
  image: "twitter.png"
  date: "2015-02-16"
---

I usually don't turn of my work computer when I leave the office for the day, so I can continue to work almost uninterupted the next day. So when I come back next morning Twitter is happy to let me know I have hundreds of unread tweets in my timeline. Unfortunately clicking the button to load them freezes my browser for many seconds, as you can see in the animation below, and this has been annoyed me for quite a while. So, why is Twitter freezing my browser, and why can't Twitter fix this bug?

![twitter is slow gif](slow-twitter.gif)

For this article I've chosen to use the [realtime view with the topic valentines](https://twitter.com/search?f=realtime&amp;q=Valentines&amp;src=tren), since it is a trending topic today. It will load a few hundred tweets in a few minutes, which makes it good for the experiments I have done in this article.

##Investigating

Notice how long it takes from I click the blue ribbon until the content changes. While I'm waiting for the content the browser is completely frozen; I can't click on anything, I can't scroll and, in Firefox, all the other tabs are also frozen. Using the browsers developer tools I can see that it takes 1.33 seconds to render the new tweets. The barchart in the image below shows the frames rendered by the browser. The bars below the horizontal line means the browser can render at 30 frames per second, which will feel smooth to the user. There is another line that isn't shown here for 60fps, which is what you should be aiming for when developing web applications. 60fps means you have 16ms to do the work you want to. The fact that the devtools can't even be bothered to draw the line shows how slow the rendering of the new tweets is.

![bar chart](twitter_bar_chart.PNG)

To begin with I thought twitter was loading the tweets from the server when you click the blue ribbon, but looking at the network tab shows that twitter loads new tweets in the background every 30 seconds. This means it keeps all the HTML in memory until you click the button, at which point it inserts the new HTML into the DOM. In the gif above you can see that it takes a long time, 1.33 seconds, to insert the 220 tweets.

![top down](twitter_top_down.PNG) 

To find out why it takes 1.33 seconds to render ~200 tweets I've used the CPU profiler built into the devtools to find out what JavaScript function is taking up the most time. It's easier to see what takes up the most time the more tweets we try to load, and with a trending topic is is easy to get a thousand tweets in a single load. The images below show the Top Down and Bottom Up views of the profile. There are a few interesting things to note here, and a lot we don't need to consider. (it says 51% next to it, which is the percentage of the total recording time. Note that for 27% of the time nothing happens, and for 21% of the time the browser and garbage collector is doing work, which is out of our hands). The Top Down view shows that the `g.handle.i` function takes 3063ms to return. Looking at the JavaScript source of the page I found that this is probably part of jQuery, and is the `onclick` handler registered by jQuery. So it takes slightly more than 3 seconds for the click handler to return. This is what causes the browser to freeze.

![bottom up](twitter_bottom_up.PNG)

Looking at the Bottom Up view shows us which functions take the longest, not including functions they themselves call. This is often the peaks of the call stacks, the leafs of the call tree. There are three methods that take up more than 33% of the total time, which is more than 66% of the total time in the `g.handle.i` function. The three functions (or getters, to be exact) are `get clientHeight`, `set innerHTML` and `get length`.

![html in json result](twitter_html_response.PNG)

The innerHTML taking a long time makes sense, since looking at the network tabs shows that twitter sends rendered HTML as JSON to the client. This HTML is inserted into the DOM using the `innerHTML` setter, which causes the browser to render the HTML. With a thousand tweets this can of course take a while. 

The other two methods, `get clientHeight` and `get length` are the real culprits. By following the percentage of execution time in the Top Down view we can navigate down into the call tree and find where these two getters are used. The image below shows that the `injectItems` takes up almost all the execution time, and that it uses jQuery to set the `innerHTML`, which accounts for 25% of the time spent. But further down we see that the method `reportInjectedItems` takes up more than 60% of the time. So, what does this method do?

![updateTimestamps function](twitter_updateTimestamps.PNG)

Digging down into it we see two methods that take up most of the time, `updateTimestamps` and `watchUnloadedCards`. Lets start with the first one.

```js
this.updateTimestamps = function() {
    this.$node.find(".js-relative-timestamp").each(function(a, b) {
        var c = $(b);
        var d = c.data("time");
        var e = this.isMuricanLocale() ? "abbreviated" : "short";
        var f = this.formatTimestamp(d, e);
        if(!f.relative){
            c.removeClass("js-relative-timestamp");
        }
        c.text(f.text);
        this.updateAccessibleShortTimestamp(c, d);
    }.bind(this))
}
```

Remember that the new tweets are returned by the server as rendered HTML, and that twitter shows tweets with friendly timestamps, like "a few minutes ago". These timestamps must be updated regularly since they are relative. Since the tweets are loaded in the background every 30 seconds the timestamps rendered in the HTML is outdated very quickly, and needs to be updated before the HTML is shown to the user.

![murica](twitter_isMuricanLocale.PNG)

```js
this.isMuricanLocale = function() {
    var a = ["en"];
    return $.inArray($("html").attr("lang"), a) >= 0
}
```

The `isMuricanLocale` function had such a strange name that I had to look into it, and from the profiling result I saw that it took up quite a bit of the time. This function looks up the `lang` attribute on the `<html>` element and checks if it is `en`, but it does it in an incredibly inefficient way, using arrays. It also does this for every tweet, when the value is unlikely to change at all. It would have been enough to call this method once and stored the result in a variable outside the `.each()` loop. That would have reduced the time it takes to render all the tweets by a few hundred milliseconds.

The remaining time spent in `updateTimestamps` is from creating the jQuery object (`var c = $(b)` in the code above). I don't see any way to improve this right now, so lets take a look at the other slow function, the `watchUnloadedCards`.

![watchUnloadedCards](twitter_watchUnloadedCards.PNG)

The Bottom Up view we looked at right at the beginning showed that time was spent in `get length` and in `get clientHeight`. `updateTimestamps` is responsible for most of the `get length`, while `watchUnloadedCards` is responsible for most of the time spent in `get clientHeight`. The Top Down view in the image above shows that most of the time in `watchUnloadedCards` is spent in `processWatchedCards` which I have recreated below.

```js

this.processWatchedCards = function() {
    var a = 0;
    while (a < this.watchedCards.length) {
        var b = this.watchedCards[a];
        if(viewportHelpers.isWithinBounds(this.$viewport, $(b), 200)){
            this.loadCard(b);
            this.loadedCards.push(b);
            this.watchedCards.splice(a, 1);
        }else{
            a += 1
        }
    }
    a = 0;
    while (a < this.loadedCards.length) {
        var b = this.loadedCards[a];
        if (!viewportHelpers.isWithinBounds(this.$viewport, $(b), 200)) {
            var c = $(b);
            var d = c.find("iframe").attr("height");
            if(d){
              c.css("min-height", d);
            }
            this.unloadCard(b);
            this.watchedCards.push(b);
            this.loadedCards.splice(a, 1);
        } else {
            a += 1
        }
    }
}
```

This function keeps an eye on tweets that have cards; images, videos or links with metadata. It makes sure not to load this content until the tweet is visible (or almost visible, that is what the 200 parameter in the `isWithinBounds` method does), and it unloads the content of the card if the tweet is no longer visible.

From the Top Down view above we can see that it is the `isWithinBounds` method that is the slow part. This method looks at the height and position of the card and figures out if it is inside the viewport. To answer this question it needs the height of the card, and it uses the `clientHeight` property of the DOM element that represents the card to get the height. Unfortunately finding the height of a DOM element is not easy.

##Explanation

For the browser to render HTML it first needs to figure out the position and size of the DOM elements. This process is called flowing the DOM, and it can be a very slow process. There are many great articles on the subject of [reflow](https://developers.google.com/speed/articles/reflow), the process of re-processing DOM elements, so I wont go into too much detail here. The short version is that an element inside another element can affect the outer element, the outer element can affect the inner element and sibling elements can affect each other. This means that the browser sometimes have to process the same element multiple times before it finds out how to position and size it. Having to process many elements (in the case of the several hundred tweets) many times is slow.

So to speed things up we should try not to reflow the DOM. The browser needs to find the size and position of the DOM nodes that are inserted into the DOM, but it knows this is slow and tries to wait until our event handler is done before processing the new DOM elements. Once the event callback returns it calculates the layout and renders the HTML.

![timeline](twitter_timeline.PNG)

But as you can see from the image above twitter is forcing the browser to calculate the sizes and positions before the tweets are inserted into the DOM. These calculations are purple, while the rest of the JavaScript time is shown in yellow. The devtools even tells us the stack trace that caused the layout calculations and warns us that it will be slow. If the purple bars were gone then there would hardly be anything left, and the insertion of all the tweets into the timeline could be made very quickly.

##Improvement

So, what is a way to improve on this? One simple way is to delay the call to `processWatchedCards` until after the browser has rendered the tweets. That would give the browser time to calculate the layout once and then have the results of all those calculations cached on the DOM elements. 

A better function to delay than `processWatchedCards` is probably `reportInjectedItems`. This is the function we looked at right at the beginning, the one that takes up more than 60% of the time. It triggers a few listeners that are handled synchronously, listeners that probably should be handled asynchronously. So a simple fix to this function is to wrap the two triggers in a timeout, which ensure that the triggers are handled after the tweets are inserted into the DOM, not before. The function could look something like this: 

````js
this.reportInjectedItems = function(a, b, c) {
    function g(a) {
        return b == "uiHasInjectedNewTimeline" 
            || b == "uiHasInjectedOldTimelineItems" 
            || b == "uiHasInjectedRangeTimelineItems"
    }
    var d = [], e = 0;
    a.each(function(a, c) {
        if(g(b)){
            d = d.concat(this.extraInteractionData($(c)));
            d.push(this.interactionData(this.findFirstItemContent($(c))));
            e = Math.max(e, this.extractTimestamp($(c)));
            this.trigger(c, "uiHasInjectedTimelineItem")
        }
    }.bind(this));
    d = this.removeDuplicates(d);
    if(g(b)){
        var f = {
            scribeContext: {
                component: "stream"
            },
            scribeData: {},
            items: d
        };
        if(c &amp;&amp; c.autoplay){
            f.scribeData.event_initiator = eventInitiators.clientSideApp;
        }
        setTimeout(function(){
            this.trigger("uiWantsToRefreshTimestamps");
            this.trigger(b, f)
        }.bind(this), 100);
    }
}
```

This is only a simple patch, a better solution would be to implement an `asyncTrigger` function that could be used instead of the `trigger` function. But even with this simple fix the browser is frozen for a much shorter time. 

![after the fix](twitter_after_fix.PNG)

With the help of the devtools it is pretty simple to find what parts of our application is causing the browser to freeze and to fix the issue. It requires that we understand how the browser works and work around the real world limitations.



