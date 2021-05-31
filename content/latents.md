+++
title = "Sampling music videos from latent space"
slug = "latents"
tldr =  "Sampling music videos from latent space"
+++

### Dark Star
{{< video "dark_star_000_with_audio" >}}

- Sampled keyframes from VQGAN at 15FPS
- 100 sampling iterations per keyframe
- Interpolation to 30FPS with ffmpeg 

{{< video "dark_star_001_with_audio" >}}

- Sampled keyframes from VQGAN at 15FPS
- 100 sampling iterations per keyframe
- Interpolation between keyframe latents in latent space at 60FPS

### Lucy in the Sky with diamonds
{{< video "lucy_000_with_audio" >}}

- Sampled keyframes from VQGAN at 15FPS
- 100 sampling iterations per keyframe
- Interpolation between keyframe latents in latent space at 60FPS