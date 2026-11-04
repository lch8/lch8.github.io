NASA has demonstrated a satellite laser link running at 200 gigabits per second. That is a very fast connection to one ground station. [1]

Now suppose a satellite needs to send different data to 32 ground receivers, each at just one gigabit per second. The total is only 32 gigabits per second. Why should that be difficult?

Because a fast connection to one destination does not automatically become 32 separate connections. Each receiver needs its own data, enough light to read it, and a beam that stays on target.

The challenge becomes clearer when we compare two ways of sharing the equipment.

# Keep 32 beams on or take turns with eight

One option is to send 32 independently controlled beams, one to each receiver. Everyone receives continuously.

Why consider fewer beams? In a design with one independently driven branch per beam, serving 32 receivers at once means operating 32 branches at once. Each must put its user's data onto the light and direct that light toward the correct receiver. Depending on the architecture, this involves separate modulators, electronic drivers and steering components, with their own power consumption, space and calibration needs.

An eight-beam design reuses eight such branches across four groups of eight receivers. After serving one group, each branch points to a receiver in the next group and sends that receiver's data. The potential gain is a smaller terminal with fewer parallel components and less fixed overhead per channel. This matters on a satellite, where mass, electrical power and heat removal are limited.

The exchange is eight faster, reusable branches in place of 32 slower ones. It does not mean that the whole terminal becomes four times cheaper: shared equipment remains, each branch must support a higher data rate, and switching adds work. The 32 ground receivers are still needed, and the total transmitted optical power need not decrease.

Each receiver now gets a turn only one quarter of the time. To receive the same amount of data overall, it must receive four times as fast during its turn.

| | 32 beams at once | Eight beams taking turns |
| - | - | - |
| Receivers served at a time | 32 | 8 |
| Each receiver gets data | Continuously | One quarter of the time |
| Speed while receiving | 1 gigabit per second | 4 gigabits per second |
| Waiting between turns | None from this schedule | Depends on how often the beams switch |

This is already a meaningful design choice. Continuous connections require more simultaneous sending channels. Taking turns allows fewer channels, but those channels must run faster and the users must tolerate gaps.

Switching also takes time, so a real eight-beam system would need to send somewhat faster than the ideal fourfold rate.

# Four times the power, but one quarter of the time per bit

Fewer active beams let us put more light into each beam. To see whether this helps a receiver read its data, we need to count both the light arriving each second and the bits arriving each second.

For this first comparison, keep the total optical power at four watts and assume that each beam has the same width, pointing accuracy and propagation losses in both designs. The receiver therefore collects the same fraction of its beam's transmitted power. Ignore switching time for now.

If M beams share the power equally, the transmitted power per beam is:

```math
P_{\mathrm{beam}}=\frac{P_{\mathrm{total}}}{M}.
```

With 32 beams, each carries 0.125 watts. With eight beams, each carries 0.5 watts. A receiver gets four times as much light per second while its beam is on.

But it must also receive four times as many bits per second. If each of the 32 users needs an average rate r, serving only M at a time requires:

```math
R_{\mathrm{active}}=\frac{32}{M}\,r.
```

For our one-gigabit-per-second service, the continuous design sends a bit every nanosecond. The eight-beam design must send a bit every quarter of a nanosecond during a user's turn. Its brighter beam has only one quarter as long to deliver the energy associated with each bit.

Power measures energy arriving per second. Dividing it by the number of bits arriving per second gives the average received energy per bit:

```math
E_{\mathrm{bit}}=\frac{P_{\mathrm{received}}}{R_{\mathrm{active}}}.
```

At the transmitter, 0.125 watts divided by one billion bits per second is 125 picojoules per bit. The eight-beam case gives the same result: 0.5 watts divided by four billion bits per second is also 125 picojoules per bit. Because the collected fraction is unchanged, the received energy per bit is unchanged too:

```math
\frac{4P}{4R}=\frac{P}{R}.
```

**With the same beam width and losses, time sharing concentrates both power and data into shorter turns. It does not increase the average light energy available to each bit.**

This is an energy comparison, not a prediction of identical error rates. Faster receivers can have different bandwidth, noise and coding requirements. Switching time also reduces the useful sending time.

The hardware saving remains possible: we may need only eight transmitting branches. An additional optical gain would require something else to improve, such as a narrower beam or lower optical loss. That brings us to the telescope.

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

# Does each beam use the full telescope or a smaller opening?

The previous example showed why beam width matters: a smaller spot puts a larger fraction of the light into the receiving telescope. The transmitting telescope helps determine that spot size. For a diffraction-limited beam, at the same wavelength and distance, doubling the transmitting opening's diameter roughly halves the beam's width at the receiver.

Now consider two ways to build a terminal with M beams. Keep the total transmitted power and the total available transmitting area fixed.

**One full opening shared by all beams.** An optical system can combine independently modulated beams so that each uses the full transmitting opening, while leaving in a different direction. The beams share a telescope; they are not assigned separate pieces of its area. Ideally, adding beams divides the available power without reducing the aperture available to each beam. Each receiver then collects the same fraction of its beam, and its received power falls in proportion to 1/M.

**One smaller opening for each beam.** Alternatively, divide the available transmitting area equally among M separate, similarly shaped apertures. Each beam gets 1/M of the area as well as 1/M of the power. Since circular area grows as diameter squared, each opening's diameter is smaller by a factor of the square root of M. Its diffraction-limited beam becomes wider by that same factor, spreading over M times the area at the receiver.

For a small, centred receiving aperture, that wider spot reduces the collected fraction by another factor of M. The two reductions multiply: one from sharing power, one from spreading that power over a larger spot.

```math
\begin{aligned}
\text{Power divided only:}\quad&
P_{\mathrm{received}}\propto\frac{1}{M},\\
\text{Power and area divided:}\quad&
P_{\mathrm{received}}\propto\frac{1}{M^2}.
\end{aligned}
```

A concrete comparison makes the difference easier to see. Suppose we replace 32 small transmitting openings with eight larger ones, keeping their total area unchanged. Each new opening has four times the area and twice the diameter. Its beam is roughly half as wide at the receiver, so the receiver collects about four times the fraction of light. Each beam also carries four times the transmitted power. Together, these changes give about 16 times the received power during a turn.

The active data rate still increases fourfold. In this ideal example, received energy per bit therefore rises by a factor of four: 16 times the received power divided by four times the bit rate. **That extra gain comes from the larger aperture available to each beam.** It was absent from the earlier comparison because that comparison held beam width fixed.

Merely switching off 24 beams in a terminal with 32 fixed small openings does not enlarge the remaining openings. To obtain this gain, the eight-beam design must actually give each beam more transmitting area. A terminal in which every beam already uses the full telescope does not obtain this particular aperture gain by taking turns.

These estimates assume diffraction-limited beams, comparable optical efficiency, accurate pointing and a receiving aperture much smaller than the light spot. Sharing the full telescope requires suitable combining and steering optics; dividing it requires separate apertures. The useful design question is therefore how much power and transmitting area each active beam can actually use, and at what hardware cost.

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
