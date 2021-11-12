---
title: "Collection of Python snippets"
---

### General stuff

#### Use _ in numbers
 
 ```py
 # Underscores in numbers are ignored, but can increase readability
 2_000_000 == 2000000
```

#### Use _ for catching returns

```py
# User underscores to _ignore_ return elemens, event wildcard
def func():
    …
    return a, b, c, d

a, _, b, c, d = func()
a, *_, d = func()
```

### Packages

#### Defining wildcard import

```py
# file package.py

```

### Paths

#### Can use slash with pathlib
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

### itertools

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