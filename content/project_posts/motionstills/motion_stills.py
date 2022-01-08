from pathlib import Path
import shutil
import subprocess

from tqdm.auto import tqdm
import torchvision
import torch

# Folder settings...............................................................
originals = Path("/Users/mfr/Desktop/ms/originals")
to_match = Path("/Users/mfr/Desktop/ms/processed")
save_directory = Path("/Users/mfr/Desktop/ms/matched")
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


def imread(model: torch.nn.Module, path: Path) -> torch.Tensor:
    """Reads an image from disks and gets the deep feature representation from the pretrained model."""
    x = torchvision.io.read_image(str(path)).unsqueeze(0) / 256
    x = model.normalize(x)
    x = model.features(x)
    return x[0, ...].detach()


def build_frames_from_dir(directory: Path, featurize=False):
    """Extracts the first frame from all videos in a folder."""
    for path in tqdm(directory.glob("*mp4"), desc=f"Export frames {directory}"):
        if path.with_suffix(".jpg").exists():
            continue
        subprocess.run(f"ffmpeg -y -i {path} -vframes 1 -f image2 {path.with_suffix('.jpg')}",
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
            shell=True
        )        
        if featurize:
            if not path.with_suffix(".jpg").exists():
                print(f"ffmpeg didnt work for {path}")
                continue
            torch.save(imread(model, path.with_suffix(".jpg")), path.with_suffix(".p"))


build_frames_from_dir(originals, True)
build_frames_from_dir(to_match, True)
print("Exported frames for input videos")

# Create features of frames
reference = {p.stem: torch.load(p) for p in originals.glob("*.p")}
origis = {p.stem: torch.load(p) for p in to_match.glob("*.p")}

# Find NN for movies
def find_closest(dictionary, feat):
    min_d = 1e12
    match = "UNKNOWN"
    for name, ref in dictionary.items():
        if (d := torch.dist(feat, ref).item()) < min_d:
            min_d, match = d, name
    return match, min_d

for path in to_match.glob("*.p"):
    if not path.with_suffix(".mp4").exists():
        continue
    match, distance = find_closest(reference, torch.load(path))
    print(f"{path.stem}\t->\t{match}\t:{distance}")
    while (save_directory / f"{match}.mp4").exists():
        match += "_"
    save_path = save_directory / f"{match}.mp4"
    shutil.copy(path.with_suffix(".mp4"), save_path)

for save_path in tqdm(save_directory.glob("*mp4"), desc=f"Make webm {save_directory}"):
    subprocess.run(f"/usr/local/bin/ffmpeg -i {save_path} -c:v libvpx-vp9 -c:a libopus {save_path.with_suffix('.webm')}",
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
        shell=True
    )

build_frames_from_dir(save_directory, False)
