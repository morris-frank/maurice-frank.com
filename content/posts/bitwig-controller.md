+++
title = "Bitwig controller script tutorial"
tags = ["Bitwig", "Music"]
date = "2020-12-15"
tldr = ""
+++

### Shotrcuts

|                             |                                             |
| --------------------------- | ------------------------------------------- |
| <kbd>Ctrl + Shift + J</kbd> | Console                                     |
| <kbd>Ctrl + R</kbd>         | Reload the script live while in the console |

### Functions

#### Utilities

|                                 |                                           |
| ------------------------------- | ----------------------------------------- |
| `println(string)`               | Print a line in the console               |
| `errorln(string)`               | Print a error in the console              |
| `showPopupNotification(string)` | Show a popup in the GUI (not the console) |
| `printMidi(status, key, value)` | Helper to print a Midi command            |

### Global settings

```javascript
loadAPI(12);

host.setShouldFailOnDeprecatedUse(true);
host.defineController(
  "M-Audio", // Company Name
  "M-Audio Axiom 25 MK1", // Device Name
  "0.1", // Version of this script
  "62841c6e-c163-481f-aba4-88bb25697e9a", // Random identifier of this script
  "morris-frank" // Name of the developer of this script
);
host.defineMidiPorts(1, 1); // Tell the host how many midi inputs and outputs this device has
host.addDeviceNameBasedDiscoveryPair(
  ["USB Axiom 25 MIDI 1"],
  ["USB Axiom MIDI 2"]
);
```

### MIDI cheat sheet

| Status (Hex) | Command              | data1           | data2          |
| ------------ | -------------------- | --------------- | -------------- |
| 0x80         | Note-Off             | key             | velocity       |
| 0x90         | Note-on              | key             | velocity       |
| 0xA0         | After-touch          | key             | touch          |
| 0xB0         | Continous controller | controller      | value          |
| 0xC0         | Patch change         | instrument      |                |
| 0xD0         | Channel pressure     | pressure        |                |
| 0xE0         | Pich bend            | least sign bits | most sign bits |

*Channel pressure vs Poly After-touch*: Both of these are after-touch, meaning they start sending after the key press down *bottoms out*. The polyphonic after-touch sends a key specific touch strength, while the channel pressure sends a global pressure value.


### Track Bank

A page is a window inside a bank / remote controls.

### Writing a Bitwig controller script

This is a write-up on how to write a JavaScript controller script for a simple Midi Controller for Bitwig. I'm developing a controller plugin for the **M-Audio Axiom 25** (Mk1 _not_ Mk2). The functionality is pretty similar to other controllers with some keys, pads and knobs but other devices might have more complex functionality for which this tutorial is not enough.

I learned about the controller scripting from [Jürgen Moßgrabers video tutorial series](https://www.youtube.com/watch?v=l4AuiQ8krQc&list=PLqRWeSPiYQ66KBGONBenPv1O3luQCFQR2) on YouTube, so check that out too but I wanted a smaller write-up as reference for myself.

#### Setting up a new project

#### Global objects

| Name          | Code                         | Meaning |
| ------------- | ---------------------------- | ------- |
| Transport     | `host.createTransport()`     |         |
| User-Controls | `host.createUserControls(N)` |         |
