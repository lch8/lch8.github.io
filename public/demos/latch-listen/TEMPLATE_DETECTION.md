# Detecting a buckle with a template

A target template can trigger the detector even when the energy gate stays closed. Both scanners run on every 5 ms hop of the incoming signal. Select a call in **Inspect a template match** to compare its winning enrollment take with the recorded candidate. [Waveform demo](https://lch8.github.io/demos/latch-listen/?method=coherent) · [STFT demo](https://lch8.github.io/demos/latch-listen/?method=spectral)

## Coherent waveform match

For a known pulse in additive colored noise, whitening the observation and the template before correlation maximizes output SNR among linear filters under the assumed covariance. The block implementation approximates the covariance by a diagonal matrix in the DFT basis. The score below also allows an unknown sign and searches over arrival time and enrollment take. [Oppenheim and Verghese, *Signal Detection*, §14.3.4](https://ocw.mit.edu/courses/6-011-introduction-to-communication-control-and-signal-processing-spring-2010/61ec3ac814f18a1f05b4ce0c90e89282_MIT6_011S10_chap14.pdf)

$$
C_j(\ell)=
\frac{\left|\sum_{k=1}^{N-1} X_m[k] H_j[k]^* e^{2\pi i k\ell/N}/P_m[k]\right|}
     {\sqrt{\sum_{k=1}^{N-1}|H_j[k]|^2/P_m[k]}}.
$$

Here $X_m$ is the 256-point DFT of the current unwindowed block. Each $H_j$ contains a 10 ms pulse cropped from 4 ms before the annotated anchor to 6 ms after it, with a short edge taper and zero padding. $P_m$ comes from **preceding** Hann periodograms with window-energy scaling, a clipped update and a frequency floor. The inverse transform evaluates 80 new, fully supported sample delays per hop. A 20 ms local-peak lookahead merges adjacent high scores. A changing transfer function or strike speed can change relative phase even after aligning arrival time.

## STFT magnitude template

This detector compares time–frequency shapes. At 16 kHz it uses a 256-sample Hann window, an 80-sample hop and 16 bands of 500 Hz. Five frame centres span −5 to +15 ms around the putative anchor. Let $P_{tb}$ and $Q_{jtb}$ be the observed and enrolled band powers, and $B_b$ the recent noise power in band $b$. The matrices used for matching are

$$
A_{tb}=\max(0,\sqrt{P_{tb}/B_b}-1),\qquad D_{jtb}=\sqrt{Q_{jtb}/B_b}.
$$

The score is the largest regularized cosine across enrolled takes,
$$
\max_j\frac{\langle A,D_j\rangle_F}{\|D_j\|_F\sqrt{\|A\|_F^2+80}}.
$$

The additive 80 is one unit per patch cell and reduces scores on weak background fluctuations. Dropping phase permits different waveforms to match a similar spectral decay. A short tool impact can share that decay. The two plots in the demo display unwhitened band magnitudes relative to each patch’s peak. The numbers above the plots use noise weighting. Spectrogram correlation has a long history in acoustic detection. [Mellinger and Clark, 2000](https://doi.org/10.1121/1.429434)

## Comparing the front ends

Enrollment copies two training takes for the station profile and four for the unseen profile. Each take contributes 40 ms of audio. No optimizer runs. All audio, including content below the energy gate, is scanned. At the sensitive setting, every method uses the same development-set rule targeting 90% event recall. The template-plus-verifier variants first select a proposal cutoff to match the energy gate’s **development** proposal count, then run the original acoustic verifier on the same hop-aligned 50 ms crop convention. The classifier weights are frozen. The deployment score cutoffs come from development audio.

| Station test, 15 minutes | Clicks found / 208 | False calls | p95 delay from label | CPU ms / s of audio |
|---|---:|---:|---:|---:|
| Energy gate | 176 | 636 | 45.8 ms | — |
| Whitened waveform | 194 | 680 | 31.5 ms | 6.27 |
| STFT magnitude | 174 | 621 | 45.8 ms | 1.99 |
| Energy + verifier | 198 | 444 | 45.8 ms | 0.15 |
| Waveform + verifier | 185 | 375 | 45.3 ms | 6.36 |
| STFT + verifier | 166 | 238 | 45.7 ms | 2.09 |

The legacy implementation emits gate-only scores when the candidate crop is ready. Its timing includes verification. CPU times measure streaming computation in Node 24 on an AMD EPYC 9V74, after one warm-up clip. They exclude file I/O, microphone buffering and device output. Waveform matching emits some calls sooner, but adding the verifier requires the entire 50 ms crop. Delay from the annotated reference also includes localization error.

**Which targets enter the classifier?** At the matched development budget, the station energy gate covered 203 targets in 931 test proposals. The waveform matcher covered 197 in 925. It recovered four targets missed by energy and lost ten that energy caught. The magnitude scanner covered 172 in 776. These are the candidate ceilings at those cutoffs. The old head was trained on energy-proposed crops, so this experiment measures a drop-in front-end change.

**Does a lower false count hold at equal recall?** Sweeping final score thresholds on held-out station data until all methods find 167/208 targets gives 270, 233 and 274 false calls for energy, waveform and magnitude with the same verifier. At 188/208 those counts are 354 and 407 for energy and waveform. The magnitude proposal ceiling is below 188. With new buckle recordists, matching 161/201 targets gives 259, 410 and 455 false calls respectively. These sweeps compare rankings and do not set deployment thresholds. The station test repeats one source take and the unseen test repeats two. A new station, mounting position and mechanically checked assembly attempts would test physical transfer. [Full counts and per-SNR results](results/frontends.json)

On a separate 52-minute unannotated workshop recording the three chains generated 231, 160 and 114 activations at their station deployment settings. The true false-alarm count is unknown. [Field counts and recording checksum](results/workshop.json)

## Reproduce

From the demo directory, Node 20+ and Python with NumPy are sufficient. Run the benchmark to regenerate both template banks, development thresholds and the two-profile report.

```sh
python -m pip install numpy==2.3.5
python lab/template_eval.py --out /tmp/latch-templates
node --test tests/*.test.mjs
```

To count activations on a local recording with the frozen settings:

```sh
ffmpeg -v error -i recording.wav -ar 16000 -ac 1 -f s16le - | node lab/template_field.mjs station
```
