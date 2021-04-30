from collections import defaultdict
from pathlib import Path
import shutil
import subprocess

from tqdm.auto import tqdm
import torchvision
import torch

# Folder settings...............................................................
originals = Path("/Users/mfr/Movies/MS/originals")
to_match = Path("/Users/mfr/Movies/MS/tomatch")

save_directory = Path("/Users/mfr/Movies/MS/matched")
# ...............................................................................

model = torchvision.models.vgg16(pretrained=True)
model.normalize = torchvision.transforms.Compose(
    [
        torchvision.transforms.Resize(256),
        torchvision.transforms.CenterCrop(224),
        torchvision.transforms.Normalize(
            mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225]
        ),
    ]
)
model.eval()
print("Set-Up torch model")


def imread(model: torch.Module, path: Path) -> torch.Tensor:
    """Reads an image from disks and gets the deep feature representation from the pretrained model."""
    x = torchvision.io.read_image(str(path)).unsqueeze(0) / 256
    x = model.normalize(x)
    x = model.features(x)
    return x[0, ...].detach(), tuple(x.shape[-2:])


def build_frames_from_dir(directory: Path):
    """Extracts the first frame from all videos in a folder."""
    for path in tqdm(directory.glob("*mp4"), desc=f"Export frames {directory}"):
        if path.with_suffix(".jpg").exists():
            continue
        subprocess.run(
            [
                "ffmpeg",
                "-y",
                "-i",
                path,
                "-vframes",
                "1",
                "-f",
                "image2",
                path.with_suffix(".jpg"),
            ],
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
        )


build_frames_from_dir(originals)
build_frames_from_dir(to_match)
print("Exported frames for input videos")

# Create features of frames
dictionary = defaultdict(dict)
for path in tqdm(originals.glob("*.jpg"), desc="Building features from originals"):
    feat, shape = imread(model, path)
    dictionary[shape][path.stem] = feat

# Find NN for movies
def find_closest(dictionary, feat):
    min_d = 1e12
    match = "UNKNOWN"
    for name, ref in dictionary.items():
        if d := torch.dist(feat, ref) < min_d:
            min_d, match = d, name
    return match, d


for path in to_match.glob("*.jpg"):
    if not path.with_suffix(".mp4").exists():
        continue
    feat, shape = imread(model, path)
    match, distance = find_closest(dictionary[shape], feat)
    print(f"{path.stem}\t->\t{match}\t:{distance}")
    while (save_directory / f"{match}.mp4").exists():
        match += "_"
    shutil.copy(path.with_suffix(".mp4"), save_directory / f"{match}.mp4")

build_frames_from_dir(save_directory)
