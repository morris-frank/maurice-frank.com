from collections import defaultdict
from pathlib import Path
import pickle
import shutil
import subprocess

# from torch.nn import functional as F
from tqdm.auto import tqdm
import torchvision
import torch
print("Finished importing")


model = torchvision.models.vgg16(pretrained=True)
model.normalize = torchvision.transforms.Compose([torchvision.transforms.Resize(256), torchvision.transforms.CenterCrop(224), torchvision.transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225])])

model.eval()
def imread(self, path):
        x = torchvision.io.read_image(str(path)).unsqueeze(0) / 256
        x = self.normalize(x)
        x = self.features(x)
        return x[0, ...].detach(), tuple(x.shape[-2:])
print("Set-Up torch model")

dir_originals = Path("~/Movies/MS/originals").expanduser()
dir_origin = Path("~/Movies/MS/tomatch").expanduser()
dir_target = Path("~/Movies/MS/matched").expanduser()
path_features = dir_originals/"features.p"

# Create fram1es
def build_frames_from_dir(directory: Path):
    for path in tqdm(directory.glob("*mp4"), desc=f"export frames {directory}"):
        if path.with_suffix(".jpg").exists():
            continue
        subprocess.run(["ffmpeg", "-y", "-i", path, "-vframes", "1", "-f", "image2", path.with_suffix('.jpg')], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)

build_frames_from_dir(dir_originals)
build_frames_from_dir(dir_origin)
print("Exported frames for input videos")

# Create features of frames
dictionary = defaultdict(dict)
for path in tqdm(dir_originals.glob("*.jpg"), desc="Building features from originals"):
    feat, shape = imread(model, path)
    dictionary[shape][path.stem] = feat

# Find NN for movies
def find_closest(dictionary, feat):
    min_d = 1e12
    match = "UNKNOWN"
    for name, ref in dictionary.items():
        if (d:=torch.dist(feat, ref) < min_d):
            min_d, match = d, name
    return match, d

for path in dir_origin.glob("*.jpg"):
    if not path.with_suffix(".mp4").exists():
        continue
    feat, shape = imread(model, path)
    match, distance = find_closest(dictionary[shape], feat)
    print(f"{path.stem}\t->\t{match}\t:{distance}")
    while (dir_target/f"{match}.mp4").exists():
        match += "_"
    shutil.copy(path.with_suffix(".mp4"), dir_target/f"{match}.mp4")

build_frames_from_dir(dir_target)