---
  id: 5
  title: "Pimponator"
  image: "images/project/pimponator_2.png"
  date: "2011-04-13"
---

http://www.youtube.com/watch?v=eLDVVwEIbq4

At the beginning of last semester i started designing a pimpin' [Imponator](http://omegav.no/byggekurs); a Pimponator. This imponator, like all imponators, would use flashing LEDs to impress other students, but I would be able to reprogram it from my cellphone using Bluetooth. The front of the Pimponator would have a 16 by 5 LED matrix, where the brightness of the LEDs could be controlled individually. The design was quickly finished, and I soon had a soldered device to play with. The only problem was that it didn't work. And so it ended up at the bottom of my electronics drawer, along with all the other projects I never finish, and it remained there for almost six months.

[image_link pimponator1.jpg]

A few weeks ago I decided to make it work, no matter how much time it would take. The device had worked in a few tests, just not consistently, so I knew I would eventually get it to work. After a few days of scoping, debugging and soldering I finally got rid of the bugs, and had the Pimponator communicating with my Android phone. It took another few days to put the firmware and Android app together so it would work as intended.

The Pimponator Android application makes it easy to put together an animation for the device. Several scrolling text phrases can be combined to make an animation, which is compiled into hexcode on the phone before it is transferred using Bluetooth to the device. The device stores the animation in flash memory, so even if the battery is replaced, the animation is still there.

[image_link pimponator2.jpg]

The Pimponator uses an AVR Atmega 128 micro controller, running at 7.372800Mhz, to control the 16 column by 5 row LED matrix. The micro controller has 64KiB of flash available for the animation, which means it can store almost 6000 frames. To transfer animations to the Pimponator an [RN41 Bluetooth module](http://www.rovingnetworks.com/rn-41.php), which shows up as a virtual COM port, is used. The Android phone is running an app which opens a serial connection the the AVR when it is time to transfer the animation.



The Android app can store several animations, each made up of one or more sequences of frames. Currently the app only supports scrolling text, but because it is plugin based, it is very easy to write another app which produces a different sequence.
