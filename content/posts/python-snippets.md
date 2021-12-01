---
title: "Collection of Python snippets"
---

My running un-sorted list of snippets for Python that I use regulary, and I have seen that people don't know about them.
Some are really basic some weirdly advanced…

### Use underscores in numbers

Underscores in numbers are ignored, but can increase readability:

```py
2_000_000 == 2000000
```

### Use underscores to discard  returns

Use underscores to _ignore_ return elemens. More advanced, use can use a wildcard `*` to discard a sub-set of the return arguments:

```py
def some_function():
    …
    return a, b, c, d

a, _, c, d = func()
a, *_, d = func()
```

### Use type in `add_argument` to directly transform input

A pattern I use a lot in `ArgumentParser` is to abuse the `type` argument. As the input argument is just casted by calling the `type` object you can also just give a function to transform the input. For example a config file:

```py
from argparse import ArgumentParser
import json

parser = ArgumentParser()
parser.add_argument("--config", type=lambda x: json.load(open(x, 'r')))
args = parser.parse_args()

args.config # is now the loaded config file already!
```


### Unpack namespace as keyword arguments

Assume you have an argument parser that matches the arguments of the main function and just
want them put in:

```py
from argparse import ArgumentParser

def main(file: str, name: str):
    pass

parser = ArgumentParser()
parser.add_argument("--file")
parser.add_argument("--name")
```

with `vars` you can make the `Namespace` a dict and unpack it in one statement:

```py
main(**vars(parser.parse_args()))
```

### Implicit infinite defaultdict

Lets say you want to set

```py
dictionary["level1"]["level2"]["arg"]["attr"] = some_value
```

without having to define any of the levels. Make a infinite defaultdict:

```py
from collections import defaultdict

infinite_defaultdict = defaultdict(lambda: infinite_defaultdict)
dictionary = infinite_defaultdict()

dictionary["level1"]["level2"]["arg"]["attr"] = some_value
```

### global vs nonlocal

Use the keyword `nonlocal` to access the `index` variable in the outer function but not the global variable which you would access with `global`.

```py
index = 0

def outer_function():
    index = 42
    def inner_fucntion():
        nonlocal index
        index += 1
    inner_function()
```


### Defining wildcard import

```py
# file package.py

```

### Using \_\_file\_\_

### Using slash with `pathlib` Paths

The `/` operator is overloaded for `pathlib` so you can easily extend paths:

```py
from pathlib import Path

path = Path("/home/morris")
code_path = path / "code"

code_path == Path("/home/morris/code")
```

### Iterate over only folders in a folder
```py
from pathlib import Path

for folder in filter(Path.is_dir, Path(path).iterdir()):
    pass
```

### Use product to reduce nested for loops

```py
# instead of
for i in range(N):
    for j in range(N):
        pass

# you can do
from itertools import product
for i, j in product(range(N), range(N)):
    pass
```

### Generate a random list of words
```py
import random

def random_words(n: int) -> list[str]:
    return random.sample(open("/usr/share/dict/words").read().splitlines(), n)
```


### Import sub-modules into alias
