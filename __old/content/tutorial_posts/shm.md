---
title: "Persistant shared memory"
tags: ["Python"]
date: "2021-11-10"
tldr: "How to create a store in memory easily share and survive restarts etc… in pure Python"
---

For a data visualization project at my current employer we need a way to save big data matrices in-memory and access them from random processes. On the server mulitple [DASH](https://dash.plotly.com/) dashboards are hosted, with which you can build nice web data viz dashboards while staying purely in Python. The data displayed in the dashboards where consisting of matrices, each up to 5GB big. As the dashboards are, of course, multi-user and a also randomly shutting down and up and also are running by different users on the system, if you would just access the pickled numpy files on the hard drive, when needed, you would be constantly loading data which takes forever.

### Usage of _shared_memory_

Therefore we are using the [Shared memory](https://docs.python.org/3/library/multiprocessing.shared_memory.html) module from the `multiprocessing` package in the standard library to load those big matrices into the shared memory (SHM), from where they then can loaded by the different processes.

Basic usage of the module is fairly simple, as shown below. You create a numpy array which is buffered in the _named_ shared memory. Then in another process you can access the matrix, by opening the shared memory by its name. Here shown, basic _SET_ and _GET_ methods:

```py
import numpy as np
from pathlib import Path
from multiprocessing import shared_memory

def set_shared_matrix(matrix: np.ndarray, name: str) -> np.ndarray:
    matrix = np.array(matrix, dtype=np.float16)
    shm = shared_memory.SharedMemory(name=name, create=True, size=matrix.nbytes)
    Xshm = np.ndarray(matrix.shape, dtype=np.float16, buffer=shm.buf)
    Xshm[:] = matrix[:]
    return XShm

def get_shared_matrix(name: str) -> np.ndarray:
    shm = shared_memory.SharedMemory(name=name)
    return np.ndarray(shape, dtype=np.float16, buffer=shm.buf).copy()
```

Moving a matrix into memory then looks like:

```py
matrix = np.random.rand(1_000, 1_000)

set_shared_matrix(matrix, "my_shared_matrix")

print(Path("/dev/shm/my_shared_matrix").exists())
# True
```

And retrieving it:

```py
matrix = get_shared_matrix("my_shared_matrix)
```

The problem with this approach is, that Python will keep track of who (or how many) processes are accessing a named shared memory item. If that counter goes to zero, the item is deleted from memory. It should be fairly obvious that this is a sensible approach, as if you would not do that, you would block memory with data that is un-connected to any process and if you then do not keep track of it menually, you will eventually leak memory.

### Making it permanent

Well, we don't care about those risks! We want _really persistant_ shared memory. This can be accomplished by a simple hack. 

The singleton that keeps track of the shared memory items is a `ResourceTracker` object, also defined in `multiprocessing`. The method used to register a new object in the registry is the `register` method:

**Source code:** [Lib/multiprocessing/shared_memory.py](https://github.com/python/cpython/blob/3.10/Lib/multiprocessing/resource_tracker.py)
```py
def register(self, name, rtype):
    '''Register name of resource with resource tracker.'''
    self._send('REGISTER', name, rtype)
```

So to hack that method, we load the singleton `resource_tracker` in our code before setting any `SharedMemory` matrices and hot-patch it to not register `shared_memory` items:

```py
from multiprocessing import resource_tracker

def __resource_register_patch(name, rtype):
    if rtype != "shared_memory":
        resource_tracker._resource_tracker._send("REGISTER", name, rtype)

resource_tracker.register = __resource_register_patch
```

Now if you use the `set_shared_matrix()` function from above, the matrix is set in shared memory and stays there indefinitely! So you can even kill all Python processes, start a new one with a different user and you will find the same matrix under the same name!


### Quickly clearing the Shared Memory

In practice, we definitly made mistakes and started leaking dead memory into SHM. So quickly you will ask yourself how can I quickly and easily get rid of all those matrices? Luckily, on Linux the shared memory is mounted as a file system and you can find it under `/dev/shm`. In that folder you will find your shared memory matrices as files with the filename being the name you set when saving them.

So you can easily clear the whole thing by doing in the shell:

```bash
rm /dev/shm/*
```

Probably you want to only delete your Python shared memory objects, so in our code we made it a rule that the names of the `SharedMemory` buffers should all end in `.shm`. So then to clean only those we just do:

```bash
rm /dev/shm/*shm
```

All of this is a quite the hack, but you know what, it works… And you do not need to install any additional packages, so that is pretty cool.
