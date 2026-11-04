NASA has demonstrated a satellite laser link running at 200 gigabits per second. That is a very fast connection to one ground station. [1]

Now suppose a satellite needs to send different data to 32 ground receivers, each at just one gigabit per second. The total is only 32 gigabits per second. Why should that be difficult?

Because a fast connection to one destination does not automatically become 32 separate connections. Each receiver needs its own data, enough light to read it, and a beam that stays on target.

The challenge becomes clearer when we compare two ways of sharing the equipment.

# Keep 32 beams on or take turns with eight

One option is to send 32 independently controlled beams, one to each receiver. Everyone receives continuously.

Another is to use eight beams and rotate them among four groups of eight receivers. This could reduce the number of sending channels and associated electronics, but each receiver gets a turn only one quarter of the time.

To receive the same amount of data overall, it must receive four times as fast during its turn.

| | 32 beams at once | Eight beams taking turns |
| - | - | - |
| Receivers served at a time | 32 | 8 |
| Each receiver gets data | Continuously | One quarter of the time |
| Speed while receiving | 1 gigabit per second | 4 gigabits per second |
| Waiting between turns | None from this schedule | Depends on how often the beams switch |

This is already a meaningful design choice. Continuous connections require more simultaneous sending channels. Taking turns allows fewer channels, but those channels must run faster and the users must tolerate gaps.

Switching also takes time, so a real eight-beam system would need to send somewhat faster than the ideal fourfold rate.

# A brighter beam does not give every bit more energy

Using fewer beams has an apparent bonus: each beam can be brighter.

Suppose the satellite divides four watts of light equally among its active beams. If there are M active beams, each receives:

```math
P_{\mathrm{beam}}=\frac{P_{\mathrm{total}}}{M}.
```

With 32 beams, that is 0.125 watts per beam. With eight, it is 0.5 watts: four times as much.

It is tempting to conclude that the eight-beam design has made communication four times easier. But each beam must also carry data four times as fast.

For 32 receivers, each needing an average rate r, the required rate during a receiver's turn is:

```math
R_{\mathrm{active}}=\frac{32}{M}\,r.
```

The energy received for each bit, each tiny piece of digital data, is:

```math
E_{\mathrm{bit}}=\frac{P_{\mathrm{received}}}{R_{\mathrm{active}}}.
```

If the beam shape and losses stay the same, four times the transmitted power gives four times the received power. But four times the data rate gives each bit only one quarter as much transmission time. The two changes cancel:

```math
\frac{4P}{4R}=\frac{P}{R}.
```

**In this ideal comparison, taking turns gives each active receiver more light, but no more light energy per bit.**

That does not make the two designs equivalent. A receiver operating four times faster may need different electronics or suffer different noise and processing penalties. Switching wastes time, and waiting may matter to the application.

The potential saving is fewer simultaneous channels. Whether that saving is worthwhile depends on what the faster channels cost and how well they work.

# Most of the light never enters the receiver

So far, we have divided the light leaving the satellite. Only a small fraction reaches the receiving instrument.

A laser beam spreads as it travels. Imagine that after a 1,000-kilometre journey, its light spot is roughly 20 metres across. The receiving telescope's opening is only 10 centimetres across.

That small opening is what optical engineers call the receiving aperture. It is the part of the instrument that catches incoming light.

Even with perfect aim, most of the beam misses it.

A common model treats the beam as brightest in the middle and gradually dimmer toward the edges. This is a Gaussian beam. For a small circular receiver centred on such a beam, the fraction of light collected is approximately:

```math
\text{fraction collected}\approx
2\left(\frac{\text{receiver radius}}{\text{beam radius}}\right)^2.
```

In our example, the receiver radius is 0.05 metres and the characteristic beam radius is 10 metres:

```math
2\left(\frac{0.05}{10}\right)^2
\approx\frac{1}{20{,}000}.
```

Only about one part in twenty thousand enters the opening, even before other losses.

The squared ratio expresses an area effect: doubling the receiver's radius gives four times the collecting area. The factor of two accounts for the higher brightness at the centre in this particular beam model.

This is why a design can have ample total data-processing speed yet struggle to deliver enough usable light to every receiver.

# Sharing a telescope and dividing it are different choices

A larger transmitting telescope can produce a narrower beam. That helps concentrate light on a distant receiver. Natural wave spreading, known as diffraction, is why the size of the transmitting opening matters.

But there are different ways to build a multi-beam terminal.

One approach lets several independently controlled beams use the same large telescope. Another divides the same total transmitting area into smaller openings, one for each beam.

The distinction matters. When each beam gets a smaller opening, it may spread more widely. The receiver then loses light for two reasons: less power was assigned to its beam, and more of that beam misses the receiver.

For a simplified model in which diffraction sets the beam width and the receiving opening is small:

```math
\begin{aligned}
\text{Power divided only:}\quad&
P_{\mathrm{received}}\propto\frac{1}{M},\\
\text{Power and area divided:}\quad&
P_{\mathrm{received}}\propto\frac{1}{M^2}.
\end{aligned}
```

M is again the number of beams. The second factor comes from the wider light spot.

These scalings describe the stated optical arrangement. They do not mean that every multi-beam device incurs the second penalty.

They explain why “this device produces 32 beams” is an incomplete specification. We also need to know how much power each beam carries, how widely it spreads, and how much light the shared optics lose.

Keeping the full telescope useful for every beam can help. Doing so requires an optical system that carries different messages and steers their beams without excessive loss.

# Narrow beams demand steady aim

Making the beam narrower seems like an obvious remedy: concentrate more light where the receiver sits.

The difficulty is keeping it there.

A satellite's small pointing error becomes a much larger displacement after a long journey. A narrow beam can deliver a strong signal when centred, then weaken sharply when the spacecraft moves or its pointing estimate is slightly wrong.

A wider beam wastes more light around the receiver, but gives it more room to remain inside the spot.

This creates a trade-off between brightness and reliability. The best beam for a perfectly aligned test may not be the best beam for a moving satellite.

Tracking therefore contributes directly to communication performance. Better estimates of where each receiver is can allow narrower beams without increasing the risk of losing the connection.

Shared tracking equipment may also help several beams at once. If the satellite's orientation shifts, many beams can be affected together; estimating that common motion can improve all of them.

For the eight-beam design, tracking must continue while users wait for their next turn. Otherwise, the equipment may spend too much of each turn finding the receiver again.

# Researchers have demonstrated several pieces

There is experimental progress, but different demonstrations answer different questions.

**Independent beams over a long distance.** A 2025 study reported four-beam communication over 100 kilometres using a prototype terminal that directs several beams toward different receivers. It is relevant evidence that one terminal can support several destinations. Extending that result to dozens of satellite users requires new power, pointing and hardware measurements. [2]

**Independent messages from a compact chip.** Another 2025 study demonstrated four separately controlled beams carrying different data streams using a small chip. Electrically driven sound waves inside the device help steer the light and put different data onto its beams. This demonstrates a compact way to control independent beams; its laboratory data rates and losses do not specify a satellite terminal's performance. [3]

**Shared tracking of many counterparts.** ESA's MUATS project explored a sensor designed to find and track up to 20 counterpart terminals. The concept study included a laboratory demonstrator. Knowing where those terminals are supports communication, but does not itself provide 20 simultaneous data links. [4]

Together, these results show progress in sending, steering and tracking. A scalable terminal has to make those capabilities work together within the same power, weight and cost limits.

# The choice depends on what users need

For a service that must reach all 32 receivers continuously, a design needs 32 simultaneous independent data channels, whether it creates them with separate beams or another suitable arrangement.

If users can accept brief gaps, eight beams taking turns become a serious alternative. The comparison then needs three practical answers:

- Can each receiver read the faster transmission with the light it actually collects?

- Can the beams switch quickly while keeping their aim and tracking which receiver they are serving?

- Do eight faster sending channels consume less power and cost less than 32 slower ones?

The answers can differ by application. A bulk file transfer may tolerate interruptions that are unacceptable for a tightly timed control link. Clouds may also require a different ground station or a backup radio connection, regardless of beam count.

The arithmetic gives one useful result before any hardware is built: concentrating the same power into fewer beams also concentrates the data into shorter turns. It does not automatically improve the energy available to each bit.

The engineering opportunity is to share expensive equipment while preserving enough light, accurate aim and timely delivery for every user.

# Sources

1. [NASA TBIRD mission results](https://ntrs.nasa.gov/citations/20230007959), 2023.

2. [Four-beam laser communication over 100 kilometres](https://opg.optica.org/jlt/abstract.cfm?uri=jlt-43-17-8029), 2025.

3. [Integrated multi-beam steering and communication](https://doi.org/10.1038/s41467-025-59831-x), 2025.

4. [ESA MUATS acquisition and tracking project](https://resilience.esa.int/archives/projects/muats).

*Calculation note: The 10-metre beam radius uses the standard Gaussian 1/e² intensity convention. The collection estimate assumes a centred beam and a receiving opening much smaller than the spot.*

*Preparation note: Revised with ChatGPT assistance. The numerical examples illustrate design trade-offs; they are not measurements of a 32-user satellite terminal.*
