+++
title = "Personalize your keyboard layout"
tags = ["System stuff"]
date = "2020-01-15"
tldr = "I adjusted my own keyboard layout and you should too. Here we will quickly see how/why to write a XKB layout file to extend ones keyboard layout."
+++

### What is it?

That's easy. The [XKB](https://w.wiki/DWZ) (X keyboard extension) layout tells your system which character/symbol to
print, when you press a key on your keyboard.

### Why?

Most people that start going down this path and ask _Which keyboard layout
should I use?_ probably end up with one of the modern optimized layouts,
like [Neo](https://w.wiki/DWJ) (German only). The argument being, that
the layout most of use like QWERTY (or QWERTZ, etc.) sucks and makes you type
slower. Which is true. Those layouts were invented to be slow, in a time of
typewriters, so that commonly used keys have a higher distance between each
other and jam less often. Thus it shouldn't be surprising that one can easily
construct a layout which is _way_ more efficient. I personally never felt
though, that my typing speed was holding me back. I just do not write enough
(or think fast enough) to require those kinds of speeds. Nevertheless I found my
keyboard always to be severely underutilized. All those symbols reachable with
<kbd>Shift</kbd> and <kbd>AltGr</kbd>, that I never need, could be symbol I do
need.

The symbols I added that proved especially useful:


-   Greek letters (<kbd>α</kbd>, <kbd>β</kbd>, <kbd>γ</kbd>, …). I use them
    extensively in writing and programming. As Python is ok with most
    unicode symbols as variable names you can code more expressively:
    ```py3
    π = np.pi
    φ = np.random.randint(360)
    x = μ + np.random.rand() * σ
    ```
    which is especially useful in the kind of mathematical, research code I
    am writing often. (Of course, this is more for personal code, if your
    collaborators are not doing the same or are Greek).
-   Mathematical / logic notation. With <kbd>⇔</kbd>, <kbd>∥</kbd>,
    <kbd>·</kbd>, <kbd>¬</kbd>,<kbd>∧</kbd>, <kbd>∨</kbd> etc. it is quite
    easier to communicate math or logic with other people quickly.
-   Emoticons <kbd>🤷</kbd>. Yes, it is 2019 and on my phone I can quickly
    add smileys to a message but chatting on the computer that is
    _clearly_ a lacking possibility. As emoticons are Unicode
    standard we can add what we need <kbd>👍👍👍</kbd>.
-   Bringing dead keys alive. Some keys in a standard keyboard layout are
    so-called <a href="https://w.wiki/DWX">dead keys</a>. E.g the grave
    accent <kbd>`</kbd>. Now for me I need the grave way more commonly as a
    single symbol not as a accent (⇒ <kbd>à</kbd>), you might be the same.

Many of the symbols I use together with
[LaTeX macros so I can write mathematical text:]({{< ref "latex-macros" >}})

```latex
\σ_i = \÷{\exp{\φ_i}}{\Σ_j \exp{\φ_j}}
```

### How?

We do not want to reinvent the wheel. We just want to replace symbols that we
never use with symbols that could be useful. Therefore it is best to start
with a pre-existing layout. For me that would be the German QWERTZ layout. You
find all XKB layout definitions in `/usr/share/X11/xkb/symbols`.

Looking into any of those files (e.g. `symbols/de`) you will find
blocks of the form:

```
default
xkb_symbols "basic" {

    include "latin(type4)"
    include "kpdl(comma)"
    include "level3(ralt_switch)"

    name[Group1]="German";

    …
};
```

The xkb layout definitions are hierarchical, we can include other definitions
with an include statement and override only the parts that we need. The _de_
layout is based on the type4 layout (which itself has latin as its base) in the
file `symbols/latin`. Further included is <var>level3(ralt_switch)</var>
which will make <kbd>Alt</kbd> the modifier with which the third layer is
reached.

The inside of the block consists of lines like:

```
    key &lt;AE04&gt; { [ 4, dollar, onequarter, currency ] };
```

in the angle brackets we have the XKB key symbol we want to define followed
by a list with the four levels: no modifier, <kbd>Shift</kbd>, <kbd>RAlt</kbd>,
<kbd>RAlt</kbd> + <kbd>Shift</kbd> (for this German case).


### Our own layout

We start by just importing the German basic layout (which imports all
underlying imports):

```
default
xkb_symbols "basic" {
    include "de(basic)"

    name[Group1]="German Edited";

    …
};
```

If you want to have a different modifier than <kbd>RAlt</kbd> for level3 you
have to import the definition from `symbols/level3`. Now we need the
XKB symbol names for the keys we are interested in. For this you can run inside
a terminal:

```bash
xev -event keyboard
```

`xev` is included in the _x11-utils_ package.

`xev` gives you a little white window and if you press a key inside
it, it will print information about the pressed  key in the terminal. We are
interested in the _keycode_. If I press my <kbd>F</kbd> key it will
give me keycode 41. Sadly that is the keycode not the _key-symbol_. To
find the key symbol you have to look in `/usr/share/X11/xkb/keycodes/evdev`.
In there we find that the key symbol for key code 41 is <var>&lt;AC04&gt;</var>.

As quick rule for the rows of the keyboard: The number row is <var>&lt;AE##&gt;</var>
(Key 1 ⇒ &lt;AE01&gt;), and the three letter rows are from top to bottom
<var>&lt;AD##&gt;</var>,  <var>&lt;AC##&gt;</var> and <var>&lt;AB##&gt;</var>
(Key Q ⇒ &lt;AD01&gt;, Key A ⇒ &lt;AC01&gt;, Key Y/Z ⇒ &lt;AB01&gt; for QWRTY/Z).
Inside the rows the numbers increase to the right.

Now we want to update our F key to have the Greek small and big Phi on the third
and fourth layer so we write:

```
key &lt;AC04&gt; { [ f, F, Greek_phi, Greek_PHI] };
```

We write <var>Greek_phi</var> instead of φ. Except for the absolute basic numbers
and Latin alphabet you cannot just write the symbols you want but have to use an
identifier. A subset of Unicode symbols have defined names in X11. A list of
those given names is in `/usr/include/X11/keysymdef.h`.
You can use any name from this header file, ignoring the leading _XK\__.
More realistically you can also look in other layout files from `xkb/symbols`.
Besides the given names you may use any Unicode character. For 👍 that will
give you [U+1F44D](https://unicode-table.com/en/1F44D/) which you can
use in the form <var>U1F44D</var> inside the layout. You can also use the Unicodes
instead of the given X11 names (losing some readability…).

Change all the keys you need, put them into the _xkb_symbols_ block and
save the file to somewhere, lets say `deedit`. Next you can install the file into the symbols
directory:

```bash
sudo install -Dm644 deedit /usr/share/X11/xkb/symbols/deedit
```

It is probably a better idea to make a package out of your layout for which
you can check your distros documentation (⇒ for Arch Linux: [PKGBUILD](https://wiki.archlinux.org/index.php/PKGBUILD),
[example](https://github.com/morris-frank/xkb-demod/blob/master/PKGBUILD)).

Lastly, you change your current Keyboard layout and try it out:

```bash
setxkbmap deedit
```

If your happy with it and want to make it stick, append the previous line to
your `xinit.rc` so that it is loaded on every boot.
