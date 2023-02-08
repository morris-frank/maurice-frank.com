---
title: "ruDALL-e"
tldr: "Experiments with fine-tuning and sampling from ruDALL-e"
---

### Bored Ape Yacht Club

<pre>
- Initial weights: Malevich
- Learning rate: 5e-6 or 1e-6
- Training amount: 1 epoch
- Dataset: The 10_000 apes from their website, paired with their description.
</pre>

As those _stupid_ apes are fairly similar, getting the right learning rate is important at _1e-5_ the model basically collapses on the _mean monkey_ (no accessoiraces, brown background). _1e-6_ gives fairly unconstrained results (less monkey-y), _5e-6_ contrains strongly on the monkey shape but allows stuff to happen.

#### At 5e-6

{{< latents path="rudalle/apes/5e-6/лофи" title="lofi" n=23 >}}
{{< latents path="rudalle/apes/5e-6/лицо как у инопланетянина, реалистичный рендеринг" title="Face like an alien, realistic rendering" n=23 >}}
{{< latents path="rudalle/apes/5e-6/Моне Клод картина" title="Monet Claude painting" n=23 >}}
{{< latents path="rudalle/apes/5e-6/аниме" title="anime" n=23 >}}
{{< latents path="rudalle/apes/5e-6/хиппи бесплатно любовь солнышко" title="hippie free love sunshine" n=23 >}}
{{< latents path="rudalle/apes/5e-6/милая сумасшедшая обезьяна" title="cute crazy monkey" n=23 >}}
{{< latents path="rudalle/apes/5e-6/коллаж" title="collage" n=23 >}}
{{< latents path="rudalle/apes/5e-6/эффект линзы рыбий глаз" title="fish eye lens effect" n=23 >}}
{{< latents path="rudalle/apes/5e-6/Гориллы" title="Gorillas" n=23 >}}
{{< latents path="rudalle/apes/5e-6/вышивка" title="embroidery" n=23 >}}
{{< latents path="rudalle/apes/5e-6/фотошоп" title="Photoshop" n=23 >}}
{{< latents path="rudalle/apes/5e-6/Графика в стиле модерн" title="Art Nouveau graphics" n=23 >}}
{{< latents path="rudalle/apes/5e-6/картина из ван гога" title="van gogh painting" n=23 >}}
{{< latents path="rudalle/apes/5e-6/плоские цвета" title="flat colors" n=23 >}}
{{< latents path="rudalle/apes/5e-6/рисунок тушью" title="ink drawing" n=23 >}}
{{< latents path="rudalle/apes/5e-6/акварель" title="watercolor" n=23 >}}
{{< latents path="rudalle/apes/5e-6/мохнатая кожа" title="shaggy leather" n=23 >}}
{{< latents path="rudalle/apes/5e-6/киберпанк" title="cyberpunk" n=23 >}}
{{< latents path="rudalle/apes/5e-6/киноафиша" title="cinema poster" n=23 >}}
{{< latents path="rudalle/apes/5e-6/векторная графика" title="vector graphic" n=23 >}}
{{< latents path="rudalle/apes/5e-6/детальная картина маслом" title="detailed oil painting" n=23 >}}
{{< latents path="rudalle/apes/5e-6/линейное искусство" title="line art" n=23 >}}
{{< latents path="rudalle/apes/5e-6/оранжевый панк психоделическая картина" title="orange punk psychedelic painting" n=23 >}}
{{< latents path="rudalle/apes/5e-6/пиксельное искусство" title="pixel art" n=23 >}}
{{< latents path="rudalle/apes/5e-6/Советский агитационный плакат" title="Soviet agitation poster" n=23 >}}
{{< latents path="rudalle/apes/5e-6/трехмерный реалистичный рендер" title="three-dimensional realistic rendering" n=23 >}}
{{< latents path="rudalle/apes/5e-6/графический роман" title="graphic novel" n=23 >}}
{{< latents path="rudalle/apes/5e-6/Бексиньский Здзислав картина" title="Beksinski Zdzislaw picture" n=23 >}}
{{< latents path="rudalle/apes/5e-6/электрические цвета" title="electric colors" n=23 >}}
{{< latents path="rudalle/apes/5e-6/средневековый пергамент" title="medieval parchment" n=23 >}}
{{< latents path="rudalle/apes/5e-6/психоделическая музыкальная обложка" title="psychedelic musical cover" n=23 >}}
{{< latents path="rudalle/apes/5e-6/коммунистический социалистический молодежный боец" title="communist socialist youth fighter" n=23 >}}

#### At 1e-6

{{< latents path="rudalle/apes/1e-6/лофи" title="lofi" n=23 >}}
{{< latents path="rudalle/apes/1e-6/Сбой" title="Failure" n=23 >}}
{{< latents path="rudalle/apes/1e-6/аниме" title="anime" n=23 >}}
{{< latents path="rudalle/apes/1e-6/коллаж" title="collage" n=23 >}}
{{< latents path="rudalle/apes/1e-6/эффект линзы рыбий глаз" title="fisheye lens effect" n=23 >}}
{{< latents path="rudalle/apes/1e-6/вышивка" title="embroidery" n=23 >}}
{{< latents path="rudalle/apes/1e-6/фотошоп" title="photoshop" n=23 >}}
{{< latents path="rudalle/apes/1e-6/плоские цвета" title="flat colors" n=23 >}}
{{< latents path="rudalle/apes/1e-6/рисунок тушью" title="ink drawing" n=23 >}}
{{< latents path="rudalle/apes/1e-6/акварель" title="watercolor" n=23 >}}
{{< latents path="rudalle/apes/1e-6/детальная картина маслом" title="detailed oil painting" n=23 >}}
{{< latents path="rudalle/apes/1e-6/линейное искусство" title="line art" n=23 >}}
{{< latents path="rudalle/apes/1e-6/пиксельное искусство" title="pixel art" n=23 >}}
{{< latents path="rudalle/apes/1e-6/Советский агитационный плакат" title="Soviet propaganda poster" n=23 >}}
{{< latents path="rudalle/apes/1e-6/графический роман" title="graphic novel" n=23 >}}
{{< latents path="rudalle/apes/1e-6/электрические цвета" title="electric colors" n=23 >}}
{{< latents path="rudalle/apes/1e-6/средневековый пергамент" title="medieval parchment" n=23 >}}
{{< latents path="rudalle/apes/1e-6/фотореалистичный" title="photorealistic" n=23 >}}


### Asterix & Obelix

I generate a dataset from the Russian versions of the first eight Asterix comic books. [See the tutorial](https://morris-frank.dev/comic_panels/) on how to automatically split a comic book page into its panels see.

{{< latents path="rudalle/asterix/серп" n=23 title="Sickle" >}}

{{< latents path="rudalle/asterix/армия" n=23 title="Army" >}}

{{< latents path="rudalle/asterix/Галлия" n=23 title="Gallia" >}}

{{< latents path="rudalle/asterix/обеликс" n=23 title="Obelix" >}}

{{< latents path="rudalle/asterix/римляне" n=23 title="Romans" >}}

{{< latents path="rudalle/asterix/римляне сумасшедшие" n=23 title="Romans are crazy" >}}

{{< latents path="rudalle/asterix/гладиатор" n=23 title="Gladiator" >}}

{{< latents path="rudalle/asterix/магическое зелье" n=23 title="Magic potion" >}}

{{< latents path="rudalle/asterix/звездочка" n=23 title="звездочка" >}}

{{< latents path="rudalle/asterix/борьба" n=23 title="борьба" >}}

### Naruto

Same as with the Asterix comics. I generated a dataset from around a dozen Russian issues of the Naruto comic books (all black & white). Sadly this fine-tuning did not seem to work very well, so below are just some random outputs.

{{< latents path="rudalle/naruto" n=8 title="Naruto" >}}

### Emojich

The [Emojich](https://rudalle.ru/demo_emoji) is only trained on Emojis. Below are some sampling examples. The Asterix one is again (really shortly) fine-tuned on the Asterix panels. The others are just sampled from the initial pre-trained Emojich weights.

{{< latents path="rudalle/emojich/asterix" n=8 title="Asterix panels" >}}
{{< latents path="rudalle/emojich/amsterdam" n=8 title="Amsterdam" >}}
{{< latents path="rudalle/emojich/napoleon" n=8 title="Napoleon" >}}