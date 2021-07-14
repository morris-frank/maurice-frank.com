```python
for first_level in filter(Path.is_dir, Path(".").iterdir()):
    for second_level in filter(Path.is_dir, first_level.iterdir()):
        process_dir(second_level)
```

```python
for folder in folders:
    for path in paths:
        if path.exists()
        break
    else:
        print("No path found")
        continue
```