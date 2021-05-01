#!/bin/bash
directory=/Users/mfr/Downloads/b2
for file in $directory/*mp4; do
        ffmpeg -i $file -c:v libvpx-vp9 -c:a libopus "${file%.*}.webm"
done
