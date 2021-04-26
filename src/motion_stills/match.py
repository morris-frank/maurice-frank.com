from pathlib import Path
import subprocess
from tqdm import tqdm
from skimage import io as skio
from skimage import feature as skfeat
from skimage import transform as sktrans
from pathlib import Path
from tqdm import tqdm
import shutil
import pickle
import scipy


dir_originals = Path("~/Movies/MS/originals").expanduser()
dir_origin = Path("~/Movies/MS/tomatch").expanduser()
dir_target = Path("~/Movies/MS/matched").expanduser()
path_features = dir_originals/"features.p"


# Create frames
def build_frames_from_dir(directory: Path):
    for path in tqdm(directory.glob("*mp4")):
        if path.with_suffix(".jpg").exists():
            continue
        subprocess.run(["ffmpeg", "-y", "-i", path, "-vframes", "1", "-f", "image2", path.with_suffix('.jpg')])

build_frames_from_dir(dir_originals)
build_frames_from_dir(dir_origin)

# Create features of frames
def imread(path):
    img = skio.imread(path)
    img = sktrans.resize(img, (500, 500))
    feats = skfeat.hog(img)
    return feats

if path_features.exists():
    with open(path_features, "rb") as f:
        feat_originals = pickle.load(f)
else:
    feat_originals = {}

for path in tqdm(dir_originals.glob("*.jpg")):
    if path.stem not in feat_originals:
        feat_originals[path.stem] = imread(path)
with open(path_features, "wb") as f:
    pickle.dump(feat_originals, f)


# Find NN for movies
def find_closest(img):
    d = 1e12
    c = "UNKNOWN"
    for name, o in feat_originals.items():
        _d = scipy.spatial.distance.cosine(img, o)
        if _d < d:
            d = _d
            c = name
    return c, d

for path in dir_origin.glob("*.jpg"):
    if not path.with_suffix(".mp4").exists():
        continue
    img = imread(path)
    match, distance = find_closest(img)
    print(f"{path.stem}\t->\t{match}\t:{distance}")
    shutil.move(path.with_suffix(".mp4"), dir_target/f"{match}.mp4")

build_frames_from_dir(dir_target)