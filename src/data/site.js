export const profile = {
  name: 'Changheng Li',
  role: 'Postdoctoral Researcher',
  affiliation: 'TU Delft',
  department: 'Embedded Systems & WISE',
  email: 'C.Li-7@tudelft.nl',
  location: 'Delft, the Netherlands',
  scholar: 'https://scholar.google.com/citations?user=dG05wrgAAAAJ',
  github: 'https://github.com/lch8',
  thesis: 'https://doi.org/10.4233/uuid:0d6f592e-42d8-40ab-8a9f-47ae7b5eb6fe',
  software: 'https://sps.ewi.tudelft.nl/Repository/topicdetails.php?ti=12',
  cv: '/downloads/changheng-li-cv.pdf',
};

export const research = [
  {
    id: 'acoustic-inference', number: '01', field: 'Audio & acoustic inference',
    title: 'Microphone arrays & speech enhancement',
    status: 'Published research', kind: 'published', visual: 'audio',
    question: 'How can we estimate sources, reverberation and noise together, without making the computation impractical?',
    contribution: 'I developed joint estimators of relative transfer functions and power spectral densities using statistical structure shared across time frames. The work connects maximum likelihood, alternating least squares and covariance-based estimation to speech enhancement.',
    takeaway: 'Joint estimation, with structure that makes it computationally useful.',
    methods: ['Statistical estimation', 'Covariance models', 'Low-complexity algorithms'],
    evidence: [
      { label: 'Multi-source estimation · 2025', href: 'https://doi.org/10.1109/TASLPRO.2025.3533374' },
      { label: 'Alternating least squares · 2023', href: 'https://doi.org/10.1109/TASLP.2023.3306713' },
      { label: 'MATLAB implementations', href: profile.software },
    ],
  },
  {
    id: 'reconfigurable-systems', number: '02', field: 'Reconfigurable wireless systems',
    title: 'Response-aware LC-RIS optimization',
    status: 'Current research', kind: 'current', visual: 'ris',
    question: 'How should a liquid-crystal reconfigurable surface serve several users when its phase changes take time?',
    contribution: 'My current work models slow, asymmetric LC-RIS responses and optimizes phase configurations under reconfiguration-time constraints. I study the trade-off between received signal quality, coordinated user service and computational cost.',
    takeaway: 'Response-aware optimization for physically constrained wireless systems.',
    methods: ['Constrained optimization', 'Phase trajectories', 'Physical system models'],
    evidence: [],
    next: 'I am also exploring the tracking limits of slow surfaces for moving users.',
  },
  {
    id: 'quantized-inference', number: '03', field: 'Inference from quantized measurements',
    title: 'Inference from quantized measurements',
    status: 'Published research', kind: 'published', visual: 'quantized',
    question: 'What can be inferred when a sensor records a sign or a few bits instead of a full-resolution sample?',
    contribution: 'My earlier work studies model-order selection from signed measurements, with applications to sinusoidal signals. Related collaborative work addresses one-bit massive-MIMO channel estimation and radar range–Doppler inference.',
    takeaway: 'Model-aware inference under limited measurement resolution.',
    methods: ['Model selection', 'One-bit measurements', 'Performance analysis'],
    evidence: [
      { label: 'BIC for signed measurements · 2018', href: 'https://doi.org/10.1109/LSP.2018.2847559' },
      { label: 'One-bit MIMO estimation · 2020', href: 'https://doi.org/10.1109/TVT.2020.2966003' },
    ],
  },
];

export const directions = [
  {
    number: 'A', title: 'Fundamental limits & waveform design',
    text: 'When is OFDM optimal for a chosen communication-and-sensing criterion? What changes when sensing cares about selected range sidelobes?',
    tags: 'Information theory · analytical models',
  },
  {
    number: 'B', title: 'Estimation and control under dynamics',
    text: 'How do motion, uncertainty and slow hardware set tracking limits? I am interested in deriving those limits and designing policies that approach them.',
    tags: 'Dynamic systems · optimization',
  },
  {
    number: 'C', title: 'Learning with physical structure',
    text: 'How can learned estimators retain the structure of acoustic models and beamformers while adapting to changing scenes?',
    tags: 'Model-based learning · array processing',
  },
];

// These are questions and ongoing directions, not claims of published results.
export const education = [
  { year: '2025', title: 'PhD · Electrical Engineering', school: 'Delft University of Technology', detail: 'Signal Processing Systems. Supervisors: Alle-Jan van der Veen and Richard C. Hendriks.' },
  { year: '2017–2020', title: 'MSc · Electronic Engineering', school: 'University of Science and Technology of China', detail: 'School of Information Science and Technology. Advisor: Jian Li.' },
  { year: '2013–2017', title: 'BSc · Applied Mathematics', school: 'University of Science and Technology of China', detail: 'School of the Gifted Young. Advisor: Jian Li.' },
];

export const selectedWork = [
  {
    paperId: 'multi-source-2025',
    title: 'Joint acoustic parameter estimation',
    contribution: 'Jointly estimates source transfer functions and the power of sources, reverberation and noise in multi-source scenes.',
    venue: 'IEEE TASLPRO · 2025',
    software: 'https://sps.ewi.tudelft.nl/Repository/repitem.php?id=57&ti=12',
  },
  {
    paperId: 'als-2023',
    title: 'Low-complexity microphone-array estimation',
    contribution: 'Uses shared structure across time frames to jointly estimate transfer functions and the power of speech, reverberation and noise.',
    venue: 'IEEE/ACM TASLP · 2023',
    software: profile.software,
  },
  {
    paperId: 'bic-2018',
    title: 'Model selection from signed measurements',
    contribution: 'Develops a Bayesian information criterion for model-order selection when observations retain only their signs.',
    venue: 'IEEE Signal Processing Letters · 2018',
  },
];
