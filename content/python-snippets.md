---
title: "Collection of Python snippets"
---

#### Use _ in numbers

Underscores in numbers are ignored, but can increase readability

```py
2_000_000 == 2000000
```

#### Use _ for catching returns

User underscores to _ignore_ return elemens, even can use a wildcard `*`

```py
def func():
    …
    return a, b, c, d

a, _, c, d = func()
a, *_, d = func()
```

#### Use type in add_argument to directly transform input

#### Namespace straight to args

Have an argument parser that matches the arguments of the main function and just
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

#### Infinite defaultdict
Want to set

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


#### global vs nonlocal

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


#### Defining wildcard import

```py
# file package.py

```

#### Using \_\_file\_\_

#### Using slash with `pathlib` Paths

The `/` operator is overloaded for `pathlib` so you can easily extend paths:

```py
from pathlib import Path

path = Path("/home/morris")
code_path = path / "code"

code_path == Path("/home/morris/code")
```

#### Iterate over only folders in a folder
```py
from pathlib import Path

for folder in filter(Path.is_dir, Path(path).iterdir()):
    pass
```

#### Use product to reduce nested for loops

```py
# instead of
for i in range(N):
    for j in range(N):
        pass

# you can do
from itertools import product
for i, j in product(range(N), range(N)):
    pass