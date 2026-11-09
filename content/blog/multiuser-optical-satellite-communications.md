NASA's TBIRD mission demonstrated a 200 Gbit/s optical downlink from a small satellite to a ground station. Now imagine a satellite sending different data to 32 ground receivers at 1 Gbit/s each. The total rate is much lower, but the terminal has to deliver 32 distinct messages, put enough light into each receiving telescope and keep its beams on target. [1]

One approach gives each active beam its own modulation chain, the electronics and optical modulator that put data onto the light. In this arrangement, 32 simultaneous links require 32 chains. Could we reduce the number of chains while letting users receive at the same time?

# A third way to share the equipment

With eight chains, a satellite could take turns serving four groups of eight users. Each user would receive for one quarter of the time and would need 4 Gbit/s during its turn to average 1 Gbit/s. With the same total optical power and the same fraction of light collected, an active receiver gets four times the power and four times the bit rate. Its average received energy per bit stays the same. Switching time and the faster receiver's noise and bandwidth requirements still enter the comparison.

| Approach | How users get their data | Main constraint |
| - | - | - |
| Separate modulation | Each link has a dedicated chain and can transmit continuously | More parallel high-speed hardware |
| Time sharing | A chain serves users in successive turns | Higher rate during each turn and gaps between turns |
| Shared modulation | Several links transmit together through one chain | The combined waveform must fit its bandwidth and voltage limits |

A shared chain can serve users during the same interval, with a separate data stream and pointing path for each. The simplest case has two users.

# Two beams from one modulation chain

Put user A's data in one frequency band and user B's in another. Add the two electrical waveforms and use a shared in-phase and quadrature (IQ) modulator to transfer the result onto light. Frequency-selective optics then separate the bands and route them into the two pointing paths. Each receiver processes its own band.

```figure
architecture
```

A shared chain saves one set of high-speed modulation hardware in this example. Its driver and modulator must handle the combined signal, and the terminal still needs a way to separate and steer both beams. Coherent digital subcarrier multiplexing already supports point-to-multipoint transmission in fibre networks. In free space, Ren and colleagues demonstrated four-beam communication over 100 km with a phased-array terminal. These results illustrate different parts of the architecture. Here I use ideal separation of the two optical bands as a starting assumption. [2] [3]

# Average power leaves out the peaks

Imagine checking the two electrical waveforms one at a time. Each may fit within the driver's voltage range. When they are added, a large excursion in one can coincide with a large excursion in the other. A peak beyond the driver's linear range can distort the transmitted signal. Reducing the drive amplitude to avoid that peak uses less of the available optical signal power in the linear model, which can make the data harder to decode.

We can change each waveform's phase by a constant amount over a transmission block. In an IQ modulator, that rotates the waveform in the plane of its two drive voltages. The rotation preserves the user's average drive power and frequency band within the block. Choosing the phases together changes how the voltages add, and can make their peaks smaller.

```figure
waveforms
```

In this example, each user has four tones carrying QPSK symbols, with the two sets of tones in disjoint bands. Both users keep the same data and average drive power in the two panels. The transmitter chooses one phase per user from 64 options. On a dense time grid, the largest I or Q voltage in absolute value drops from 1.97 V to 1.39 V. A derivative bound places the continuous-time peak after phase selection below 1.41 V, within the example's 1.5 V limit. The gain depends on the data block and the power split.

The corresponding model writes the combined complex drive voltage as

```math
u(t)=\sqrt{q_A}\,e^{j\theta_A}s_A(t)+\sqrt{q_B}\,e^{j\theta_B}s_B(t).
```

Each s denotes a unit-power waveform in its user's band. The two waveforms are orthogonal over the block. Each q is a mean-square drive voltage in V² and each angle is a chosen phase. With a fixed laser power and a linear field response, average modulated optical power is proportional to the sum of these mean-square voltages. The hardware constraint applies separately to the real (I) and imaginary (Q) drive voltages throughout the block.

```math
|\mathrm{Re}\,u(t)|\leq V_{\max},\qquad |\mathrm{Im}\,u(t)|\leq V_{\max}.
```

The example compares voltage at fixed per-user power. A link benefit can arise when phase selection avoids distortion or allows less amplitude reduction to stay within the voltage limit.

# Can each receiver still decode its own data?

The model uses coherent detection. Each receiver estimates the amplitude and phase of its own link from known symbols called pilots. If the transmitter applies the same rotation to a user's data and pilots, the receiver sees that rotation as part of the link's phase. With a channel that is approximately constant over the block and a suitable pilot pattern, ordinary single-user channel estimation and equalization can recover the data.

The required power still depends on propagation. A small receiving aperture may collect very little of a spreading beam, and pointing errors and turbulence change the collected power. Álvarez Roa and colleagues show how to turn these effects into tractable error-rate approximations for pulse-amplitude modulation with intensity modulation and direct detection. In the coherent model here, we need the corresponding link gain and noise model to relate drive power to decoding reliability. [4]

Luo and colleagues demonstrated subcarrier phase selection for reducing peaks in coherent passive optical networks. Adegbite and colleagues studied pilot-assisted phase selection in OFDM with data recovery that avoids a separate phase-index estimate. The question here is how much traffic a shared chain can support under a specified set of hardware and receiver constraints. [5] [6]

# Which pairs of user requirements can one chain support?

Fix a total bandwidth, average optical power budget and peak drive voltage. Give each user a rate target and a maximum probability of a failed block. Under these conditions, a rate pair is feasible when a single shared chain can meet both targets using the allowed waveform, phase selection and receiver processing.

One quick check follows from the two voltage limits. The squared magnitude of the complex drive is the sum of the squared I and Q voltages. It can therefore be at most twice the squared voltage limit. Averaging over a block of duration T and using the orthogonality of the two waveforms gives

```math
q_A+q_B=\frac{1}{T}\int_0^T|u(t)|^2\,dt\ \leq\ 2V_{\max}^2.
```

If the two links require more mean-square drive voltage than this, changing the phases cannot make sharing feasible under this model. A pair that passes the check may still have peaks that exceed the limit. A tighter test must account for the shapes of the signals and how much control a single phase per user offers.

The useful answer is a region of rate pairs. An inner bound comes from designs that meet both users' targets. An outer bound rules out pairs for every allowed design. For random data, the analysis should account for the chance of a block exceeding the drive limit alongside the chance of decoding failure. One conservative way to do this is to count blocks that cannot be transmitted within the limit as failures and allocate them part of each user's error budget.

```figure
region
```

# What would make the boundary useful?

**Tighter bounds.** Compare a constructively achievable region with an outer bound that applies to every allowed phase rule. A smaller gap gives a clear architecture decision for more user pairs.

**Attainability.** Construct phases that reach the boundary in identifiable regimes, or quantify the gap. Compare designs at the same power and bandwidth and check both port voltages over the full waveform.

**Power imbalance and block duration.** At fixed total power, vary the share each link requires. Compare block durations at fixed bandwidth and symbol rate, with one phase per user per block. A longer block changes the peaks that the phase choice must accommodate, as well as coding performance and pilot overhead.

The goal is a test for deciding which users can share one modulation chain. Evaluating it on a terminal requires the filter losses and transients, driver response and link gains.

# Sources

1. [Riesing et al., Operations and Results from the 200 Gbps TBIRD Laser Communication Mission](https://ntrs.nasa.gov/citations/20230007959), 2023.

2. [Duthel et al., DSP Design for Coherent Optical Point-to-Multipoint Transmission](https://doi.org/10.1109/JLT.2023.3322076), 2024.

3. [Ren et al., 100 km One-Point to Multi-Point Simultaneous Laser Communication](https://opg.optica.org/jlt/abstract.cfm?uri=jlt-43-17-8029), 2025.

4. [Álvarez Roa et al., On Error Rate Approximations for FSO Systems With Weak Turbulence and Pointing Errors](https://doi.org/10.1109/JSTQE.2025.3590410), 2026.

5. [Luo et al., Partial Transmit Subcarrier Technology Based on m-Sequence for Simplified PAPR Reduction in 400G TFDM Coherent PON](https://doi.org/10.1109/JLT.2025.3603788), 2025.

6. [Adegbite et al., A joint OFDM PAPR reduction and data decoding scheme with no SI estimation](https://doi.org/10.1186/s13638-016-0596-2), 2016.

*Prepared with ChatGPT assistance. The voltage example is computed for one illustrative data block. The feasibility diagram shows the roles of the bounds.*
