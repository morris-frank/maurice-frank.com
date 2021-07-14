from pathlib import Path
import librosa
from rich import print
import numpy as np
from datetime import datetime
from scipy.io import wavfile
import json
import subprocess
from rich.console import Console

console = Console()

data_dir = Path(__file__).parents[2] / "data" / "room-volume"

def moving_average(x, w):
    return np.convolve(x, np.ones(w), 'valid') / w


for day in filter(Path.is_dir, data_dir.iterdir()):
    for mp3_file in day.glob("*mp3"):
        print(mp3_file)
        wav_file = mp3_file.with_suffix(".wav")
        if not wav_file.exists():
            with console.status("[bold green]Converting to wav..."):
                subprocess.run(f"ffmpeg -y -i {mp3_file} {wav_file}", stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, shell=True)
                console.log(f"{wav_file} generated")
        with console.status(f"Loading…"):
            sr, signal = wavfile.read(wav_file)
            signal = signal / 32_767
            console.log(f"Length is {len(signal) / sr / 60 / 60:.3} hours (at {sr})")
        with console.status("Making FFT"):
            n_fft = 2048
            spec = np.abs(librosa.stft(signal, hop_length=sr, n_fft=n_fft))
            spec_db = librosa.amplitude_to_db(spec, ref=0.001)[:, :-1]
            freqs = librosa.fft_frequencies(sr=sr, n_fft=n_fft)
            a_weights = librosa.A_weighting(freqs)
            a_weights = np.expand_dims(a_weights, axis=1)

        spec_dba = spec_db + a_weights
        loudness = librosa.feature.rms(S=librosa.db_to_amplitude(spec_dba)) + 25
        loudness = loudness.flatten().astype(int).tolist()

        start = int(datetime.strptime(wav_file.stem[:19], "%Y-%m-%d_%H-%M-%S").timestamp())
        index = list(range(start, start+len(loudness)))

        with open(wav_file.with_suffix(".json"), "w") as fp:
            json.dump([index, loudness], fp)
        # wav_file.unlink()