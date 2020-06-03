+++
title = "Using a LaTeX macro package"
tags = ["System stuff", "LaTeX"]
date = "2019-12-15"
tldr = "If your writing a lot of small documents all the time and do math in them it is a good idea to write yourself a macro package that contains personalized macros and functions to speed up your typesetting. Especially useful for University assignments and notes."
+++

If you never have written a TeX package, here the short-form with only the stuff
we need. You start the file with

```latex
\NeedsTeXFormat{LaTeX2e}[1994/06/01]
\ProvidesPackage{YOUR-PACKAGE-NAME}
```

end it with

```latex
\endinput
```

and save it with extension `.sty` instead of `.tex`.

### Things to add

-   Packages you always include. For example which fonts to use. In a
    package `.sty` file you use `\RequirePackage` instead
    of `\usepackage` to include other packages.
    ```latex
    \RequirePackage{newpxtext}
    \RequirePackage{mathpazo}
    \RequirePackage{dsfont}
    ```
-   Faster font changes. I use the same macro for bold and italic text in
    math and normal mode using the `\ifmmode` command.
    ```latex
    \newcommand*{\B}[1]{\ifmmode\bm{#1}\else\textbf{#1}\fi}
    \newcommand*{\I}[1]{\ifmmode\mathit{#1}\else\textit{#1}\fi}
    ```
-   Unicode symbols. LaTeX supports Unicode commands so we can write the
    symbols instead of their names. The `\ensuremath` call makes
    commands from `amsmath` also work in normal text mode. If you
    don't have these special characters on your keyboard I have
    [a tutorial]({{< ref "keymap" >}}) to change that.
    ```latex
    \newcommand*\ℝ{\ensuremath{\mathds{R}}}
    \newcommand*\π{\ensuremath{\pi}}
    \newcommand*\Σ{\ensuremath{\sum}}
    ```
    `\mathds` from _dsfont_ gives nicer double-strokes.
-   More math operators. I have to write lot of expected values so I made a
    nicer short version.
    ```latex
    \DeclareMathOperator*{\argmax}{arg\,max}
    \DeclareMathOperator*{\E}{\mathbb{E}}
    ```
    The `\,` makes a tiny space.
-   Anything else. You can <a href="https://github.com/morris-frank/latex-templates/blob/master/morris.sty">check out mine</a>
    or do whatever you like. It is recommended to use the LaTeX macro
    `\newcommand` to define new commands instead of the TeX
    `\def`. If a command name is already taken and you want to
    overwrite it use `\renewcommand` instead of
    `\newcommand`.

All of this is more useful for documents that you're working on by
yourself. Otherwise you have to distribute the package to your collaborators.

### Using it

To make the package visible to your compiler (`pdflatex`,
`xelatex`, …) you have to put it on the TeX path. You can add to your
users local path to make it available to the compiler while using your account.
The path is called `TEXMFHOME` and you can look it up with:

```bash
kpsewhich -var-value TEXMFHOME
```

On most Linux distros this will be `/home/YOUR-USER/texmf`, which
probably doesn't exist. As I do not want to clutter my home folder with that
folder, I changed the path by setting an environment variable with the same
name inside my `xinit.rc`:

```bash
export TEXMFHOME=~/.local/share/texmf
```

After a reboot/re-login the new `TEXMFHOME` should be set. Inside
the folder your supposed to follow the TeX folder structure which means you
should create the folders `~/.local/share/texmf/tex/latex/YOUR-PACKAGE-NAME/`
and put your `YOUR-PACKAGE-NAME.sty` in there.

If the new path is not recognized you might need to rehash the TeX path:

```bash
sudo texhash /home/YOUR-USER/.local/share/textmf
```

Now all my assignment files for University and other scribbles always start
with (as I have a `morris.sty`):

```latex
\usepackage{morris}
```

and I am writing considerably faster and more readable (in my humble opinion).<br>
Instead of:

```latex
\pmb{\sigma} = \begin{bmatrix}
    \frac{\exp{\phi_1}}{\sum_i^N \exp{\phi_i}} & \dots
\end{bmatrix}
```

I write:

```latex
\B{\σ} = \bM{\÷{\exp{\φ_1}}{\Σ_i^N \exp{\φ_i}} & \… }
```
