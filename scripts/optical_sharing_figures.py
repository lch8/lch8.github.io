"""Figures for the two-user shared-modulator example."""
import numpy as np
import matplotlib.pyplot as plt
from matplotlib.patches import FancyBboxPatch

INK = '#19374b'
TEAL = '#007e76'
BLUE = '#315f9a'
LIMIT = '#a34d41'


def architecture():
    fig, ax = plt.subplots(figsize=(8.5, 3.65))
    ax.set(xlim=(0, 8.5), ylim=(0, 3.65))
    ax.axis('off')

    def box(left, y, width, label, fill='#ffffff', edge='#91a9b0'):
        ax.add_patch(FancyBboxPatch(
            (left, y - 0.25), width, 0.5, boxstyle='round,pad=0.025,rounding_size=0.06',
            facecolor=fill, edgecolor=edge, linewidth=1.1,
        ))
        ax.text(left + width / 2, y, label, ha='center', va='center', fontsize=11, color=INK)

    def arrow(x1, y1, x2, y2):
        ax.annotate('', (x2, y2), (x1, y1),
                    arrowprops={'arrowstyle': '-|>', 'color': '#607984', 'lw': 1.3})

    ax.text(0.15, 3.48, 'Separate modulation · two IQ chains', fontsize=13,
            color=INK, weight='bold')
    for name, y in [('A', 2.91), ('B', 2.27)]:
        box(0.15, y, 1.36, f'Data {name}')
        box(2.22, y, 2.0, f'IQ chain {name}', fill='#e8eff7', edge=BLUE)
        box(6.64, y, 1.72, f'Beam {name}')
        arrow(1.51, y, 2.22, y)
        arrow(4.22, y, 6.64, y)

    ax.axhline(1.87, color='#c6d7d8', lw=0.9)
    ax.text(0.15, 1.59, 'Shared modulation · one IQ chain', fontsize=13,
            color=INK, weight='bold')
    for name, y in [('A', 1.04), ('B', 0.40)]:
        box(0.15, y, 1.36, f'Data {name}, band {name}')
        box(6.64, y, 1.72, f'Beam {name}')
        arrow(1.51, y, 2.22, 0.72)
        arrow(6.08, 0.72, 6.64, y)
    box(2.22, 0.72, 2.0, 'Digital sum\nShared IQ chain', fill='#dcefe8', edge=TEAL)
    box(4.81, 0.72, 1.27, 'Optical\nband splitter')
    arrow(4.22, 0.72, 4.81, 0.72)
    fig.subplots_adjust(left=0.015, right=0.985, bottom=0.02, top=0.98)
    return fig


def waveforms():
    # The finite tone sets are orthogonal on the illustrated periodic block.
    frequencies = np.array([[-5, -4, -3, -2], [2, 3, 4, 5]])
    symbols = np.array([[-1, 1j, -1j, -1j], [1, 1, 1, 1]])
    q = 0.5  # V² per user
    samples = 4096
    time = np.arange(samples) / samples
    tones = np.exp(2j * np.pi * frequencies[..., None] * time)
    drives = np.sqrt(q) * (symbols[..., None] * tones).sum(axis=1) / 2
    unrotated = drives.sum(axis=0)
    phases = np.exp(2j * np.pi * np.arange(64) / 64)

    def port_peak(waveform):
        return np.maximum(np.abs(waveform.real), np.abs(waveform.imag)).max(axis=-1)

    best = unrotated
    for phase_a in phases:
        candidates = phase_a * drives[0] + phases[:, None] * drives[1]
        candidate = candidates[np.argmin(port_peak(candidates))]
        if port_peak(candidate) < port_peak(best):
            best = candidate

    voltage_limit = 1.5
    # Bound the increase from the nearest grid point using |du/d(t/T)|.
    derivative_bound = 2 * np.pi * np.sqrt(q) * np.abs(frequencies).sum() / 2
    continuous_upper = port_peak(best) + derivative_bound / (2 * samples)
    print(f'Voltage example: {port_peak(unrotated):.4f} V → {port_peak(best):.4f} V, '
          f'continuous upper bound {continuous_upper:.4f} V')

    fig, axes = plt.subplots(2, 1, figsize=(8.5, 4.8), sharex=True, sharey=True)
    for ax, u, label in zip(axes, [unrotated, best], ['Before phase selection', 'After phase selection']):
        ax.plot(time[::8], u.real[::8], label='I voltage', color=BLUE, lw=1.7)
        ax.plot(time[::8], u.imag[::8], label='Q voltage', color=TEAL, lw=1.7)
        ax.axhline(voltage_limit, color=LIMIT, ls='--', lw=1.2, label='±1.5 V limit')
        ax.axhline(-voltage_limit, color=LIMIT, ls='--', lw=1.2)
        ax.set(xlim=(0, 1), ylim=(-2.15, 2.15), yticks=[-2, -1, 0, 1, 2])
        ax.set_title(f'{label} (sampled peak {port_peak(u):.2f} V)',
                     loc='left', fontsize=12, color=INK, weight='bold', pad=7)
        ax.grid(alpha=0.21)
        ax.spines[['top', 'right']].set_visible(False)
        ax.tick_params(labelsize=10, colors=INK)
    fig.legend(*axes[0].get_legend_handles_labels(), loc='upper center',
               ncol=3, frameon=False, fontsize=11)
    fig.supylabel('Drive voltage (V)', x=0.025, fontsize=11, color=INK)
    axes[-1].set_xlabel('Time within one block (t/T)', fontsize=11, color=INK)
    fig.subplots_adjust(left=0.10, right=0.98, bottom=0.115, top=0.83, hspace=0.45)
    return fig


def region():
    fig, ax = plt.subplots(figsize=(7.4, 3.9))
    x = np.linspace(0, 1, 400)
    inner = np.maximum(0, 0.66 * (1 - (x / 0.78) ** 1.6))
    outer = np.maximum(0, 0.90 * (1 - (x / 0.94) ** 1.7))
    ax.fill_between(x, 0, inner, color='#c9e9de')
    ax.fill_between(x, inner, outer, color='#e7ebec')
    ax.fill_between(x, outer, 1, color='#f5e2df')
    ax.plot(x[x <= 0.78], inner[x <= 0.78], color=TEAL, lw=2)
    ax.plot(x[x <= 0.94], outer[x <= 0.94], color=LIMIT, lw=2)
    ax.text(0.27, 0.24, 'Achievable\nby construction', ha='center', color=INK, fontsize=12)
    ax.text(0.39, 0.56, 'Unresolved', ha='center', color=INK, fontsize=12)
    ax.text(0.73, 0.78, 'Ruled out\nby the outer bound', ha='center', color=INK, fontsize=12)
    ax.set(xlim=(0, 1), ylim=(0, 1), xticks=[], yticks=[])
    ax.set_xlabel('Rate for user A', color=INK, fontsize=12, labelpad=10)
    ax.set_ylabel('Rate for user B', color=INK, fontsize=12, labelpad=10)
    ax.spines[['top', 'right']].set_visible(False)
    ax.set_title('Schematic at fixed reliability targets', fontsize=12, color=INK, loc='left', pad=9)
    fig.subplots_adjust(left=0.095, right=0.98, bottom=0.14, top=0.90)
    return fig


FIGURES = {
    'architecture': (
        architecture,
        'Figure 1. A shared chain combines the two subbands. A splitter routes each optical band to its own pointing path.',
        'Separate IQ chains feed two beams in the upper panel. One shared chain and an optical band splitter feed two beams in the lower panel.',
    ),
    'waveforms': (
        waveforms,
        'Figure 2. The same two data streams at equal average drive powers before and after choosing a phase for each user.',
        'The I and Q voltages of one block before and after phase selection, with horizontal lines marking the positive and negative 1.5 volt limits.',
    ),
    'region': (
        region,
        'Figure 3. A schematic rate region. The inner bound gives achievable rates. The outer bound excludes rates beyond it. The gap is the target for tighter analysis.',
        'User A rate on the horizontal axis and user B rate on the vertical axis. Green marks achievable rates, grey the gap between bounds, and pink rates excluded by the outer bound.',
    ),
}
