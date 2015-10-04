---
title: "Early impressions of Docker"
short: "I've only used Docker for a few days, here are my impressions"
date: "2015-01-17"
type: "article"
---

Docker is a tool for deploying applications to servers easily, by creating standardized containers for the applications and running those containers in "virtual machines" that have a simple API for communicating with each other. This means that a container working on one machine will work on any other machine that runs Docker, without any further configuration. The goal seems to be to make it safe and simple to deploy to and set up production and test environments. BTW, I put virtual machine in "quotes" as I'm sure there are people who disagree that Docker is doing virtualization, and the quotes protects me from those people. As I'm sure you can tell, I only have a fairly basic understanding of Docker, since I've only used it for about a week.

I installed Docker last weekend after my hosting provider pointed out my server was sending spam, and kindly asked me to format the server or go somewhere else. After backing up all of the apache virtual hosts and tomcat webservices, I formated the server and installed the latest version of Ubuntu server, since it is the best Linux server. At this point I had a choice between installing all the old software that was on my old server, or trying something new that I had never done before. The second option seemed like the best option, and I installed Docker.

I use the server mostly as a web host, but I have a lot different websites that I host on different domains and subdomains. Apache lets you easily configure several virtual hosts to handle this, so I wanted something similar with Docker. After a bit of Googling I came across the [nginx proxy](https://registry.hub.docker.com/u/mingzeke/nginx-proxy/) that finds other docker containers with a specific envionment variable and correctly routes HTTP traffic to them. This let me host several websites, each a separate docker container, and have them all accessible on port 80.

Within an hour, and without having to install any other software on the server, I had most of the old server up and running again. Each website got its own Dockerfile, so it is easy to recreate the container later, or for a different server. Docker lets you create specialized containers, for example running a [database](https://registry.hub.docker.com/u/marvambass/mysql/), and then linking them with other containers, for example running the [web application](https://registry.hub.docker.com/u/marvambass/piwik/). With this setup I had several standardized containers that others had put together up and running and communicating with other after only a few hours of work. TL;DR: Docker is awesome.

## Criticisms of Docker
It might be that I don't have enough experience with Docker yet, but there are some things that I wish were different. There's absolutely no doubt about the fact that we will use containers to deploy our applications in the future, but there might be an alternative to Docker that does it better. Or maybe Docker will change and improve. In any case, these are the improvements I hope we will get in the future.

### Name and version in the Dockerfile
Just like package.json in node, the Dockerfile should contain the name of the image and the version/tag that it will build. It seems strange that this is something that is provided to the build command rather than the definition of the container. The Dockerfile syntax is very simple, and will probably change in the future to become more powerful, and hopefully the name and version will be added to it. 

### Build should output a file
Running the docker build command, for example `sudo docker build -t me/mycontainer:v2 .` takes a path as input, but does not produce an output, at least not the path provided. Instead docker builds the ~~container~~ image in some other location and keeps them there. Combined with the previous criticisms, the build command could be as simple as `sudo docker build`, since the path could be taken from the current working directory. This simple command should produce the image as a file, either in the current directory or in a bin directory, with the name and tag provided in the Dockerfile.

### What are images?
After building images you can run them by referring to their name (a running image is called a container). It feels weird to me that all of this is happening behind the scenes somewhere. What are images? Are they files that I can share with others? Are they group of files? Have they been built specifically for my system (I don't think so, since I can push them to the Docker Hub)? This might make sense to someone responsible for a much larger system, but I really want to know where the stuff I build ends up, and when I run `docker run` I want to point it to a file that it should run.

### Running containers takes too many arguments
The proxy I referred to earlier has the following command for starting:

```
$ docker run -d --name=proxy --privileged=true -p 80:80 -p 443:443 \
-e DEFAULT_VHOST=example.com -e DEFAULT_SSL=TRUE \
-v /path/to/certs/folder:/certs \
-v /var/run/docker.sock:/var/run/docker.sock  mingzeke/nginx-proxy
```

Having to remember this to start a container is impossible (after the container has been running without issue for several years), especially if your system consists of many different containers that all need different options to start correctly. Like everything else in the world this can be solved with shell script, but it is the kind of thing that Docker should solve. One way this could be solved is to have an interactive startup, where running ```docker run container-name``` prompts the user for all the options that the container needs for starting, with sane defaults. These defaults could probably be specified in the Dockerfile, along with the name and tag of the image. I realize that this is only useful for idiots like me who don't work with Docker every day, so there obviously needs to be a non-interactive mode for cool people.

### Restarting a container with the same arguments
Restarting a container because you have made changes to it, for example in your own development environment, is too complicated. First you need to build, using `docker build -t name .`, then `Docker stop name`, then `Docker rm name` and finally you need to run the long `docker run` command again. These should all be combined into one simple command that can be used for testing an application in docker. Sure, you can use shell scripts here too, but it would be great if Docker provided a better write-compile-run-test experience.

### Sharing containers
Sharing containers today consists of pushing it to a Hub, and by default this is the public Docker Hub. Depending on the environment I really want more control of where a docker image is pushed. Its probable that I want to push the a docker image to the same repository multiple times, just like I push a git repository to the same place every time. This would be something that could be in a config file in the same place as the Dockerfile, instead of being either a global system setting or something I have to specify each time I want to push. Again, my point isn't that this is impossible, only that it is needlessly complex.

### Summary
Docker is great for deploying and hosting applications, but it's not very user friendly yet. Currently it is very centralized with a lot of focus on the official Docker Hub. I wish it was more decentralized so that I could more easily share containers within my organization only. I also wish that building and running containers would be as simple as `docker build` and `docker run my-container`, without all the command line arguments. If these changes aren't made to Docker, then I predict an alternative will surface that will become more popular.

