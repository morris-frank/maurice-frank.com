+++
title = "Using plots as ticks in PyPlot"
tags = ["Python"]
+++

Another week another tutorial for something that you never thought about doing. Can we replace the ticks in a PyPlot figure with plots?

### Why?

I was building a heatmap showing some result on different signal sources. The
signals where different simple curves: sinus, triangle, square and saw-tooth
waves. Now for annotating the plot, yes you could write down the names of the
signals on the axis and yes that's probably the 'correct' way to do it. But it
is ugly and not intuitive if you could also just show the signals:

<figure>
    <img src="/img/heatmap_ticks_plot.png" alt="A histogram plot where the ticks on the left and top axis are printed as for different plots.">
</figure>

### How?

Unsuprisingly we proceed as follows: We remove all actual ticks from the plot
and add correctly small sized axes onto the figure. Adding axes to arbitrary
places of a figure is best possible with the `inset_axes` function
provided by the (probably) little known `axes_grid1` toolbox in
`mpl_toolkits` ([docs](https://matplotlib.org/api/_as_gen/mpl_toolkits.axes_grid1.inset_locator.inset_axes.html#mpl_toolkits.axes_grid1.inset_locator.inset_axes)).

`inset_axes` is called as:

```py3
inset_axes(ax, width=, height=, bbox_transform=, bbox_to_anchor=, loc=)
```

We want to position our new axis relative to the axis we position it into
(which is `ax`). To do so we can set `bbox_transform` to
the bounding box of the parent axis: `ax.transAxes`. `bbox_to_anchor`
will set the anchor/position of the new axis, as we are now setting relative
values this can e.g. be `(0.05, 1.01)` which would be 5% from the
left but 1% outside the figure to the bottom. `loc` sets which point
in the new axis is the anchor. For the full list see the documentation, we will
need _8_ for _'lower center'_ and _7_ for _'center right'_.

`inset_axes` will return the new axis which you than can proceed to
plot into! So here the full function that will add _one_ tick at a given
position on either the upper x axis or the left y axis:

```py3
from mpl_toolkits.axes_grid1.inset_locator import inset_axes

def add_plot_tick(
    ax: plt.Axes,
    symbol: str,
    pos: float = 0.5,
    where: str = "x",
    size: float = 0.05
):

    if "x" in where:
        anchor, loc = (pos, 1.01), 8
    else:
        anchor, loc = (-0.025, pos), 7

    _ax = inset_axes(
        ax,
        width=size,
        height=size,
        bbox_transform=ax.transAxes,
        bbox_to_anchor=anchor,
        loc=loc,
    )
    _ax.axison = False

    x = np.linspace(0, τ)

    if "sin" in symbol:
        y = np.sin(x)
    elif "tri" in symbol:
        y = sawtooth(x, width=0.5)
    elif "saw" in symbol:
        y = sawtooth(x, width=1.0)
    elif "sq" in symbol:
        y = square(x)
    else:
        raise ValueError("unknown symbol")

    _ax.plot(x, y, linewidth=3, c="k")
```

Obviously this code is specific to my use-case of those four signals. One could
also just return the axis and then manually plot into it.

To add all four singal ticks we utilize the new function and just loop over the
signals. The outer code looks something like:


```py3
ax = plt.figure()

ax.imshow(…)
ax.set_axis_off()

pos_tick = np.linspace(0, 1, 2 * 4 + 1)[1::2]
symbols = ["sin", "sq", "tri", "saw"]
for i in range(4):
    add_plot_tick(ax, symbols[i], pos=pos_tick[i], where="x", size=0.25)
    add_plot_tick(ax, symbols[i], pos=pos_tick[-i - 1], where="y", size=0.25)
```
