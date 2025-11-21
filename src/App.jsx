import React, { useState, useEffect } from 'react';
import { 
  Mail, 
  MapPin, 
  Github, 
  Linkedin, 
  FileText, 
  BookOpen, 
  Award, 
  Code, 
  Mic, 
  Layers, 
  ExternalLink, 
  Copy, 
  Check, 
  Moon, 
  Sun,
  Menu,
  X,
  GraduationCap,
  Download,
  Globe
} from 'lucide-react';

/**
 * ====================================================================================
 * 🟢 USER DATA CONFIGURATION
 * Update this section to change the content of your website.
 * ====================================================================================
 */
const data = {
  profile: {
    name: "Changheng Li",
    title: "PhD Candidate in Electrical Engineering",
    affiliation: "Delft University of Technology (TUD)",
    department: "Group of Signal Processing Systems, EEMCS",
    email: "C.Li-7@tudelft.nl",
    location: "Delft, The Netherlands",
    googleScholar: "#", // Add your Google Scholar URL here
    researchGate: "#",  // Add your ResearchGate URL here
    github: "#",        // Add your GitHub URL here
    linkedin: "#",      // Add your LinkedIn URL here
    about: "I am a PhD candidate at Delft University of Technology, working under the supervision of Prof. Alle-Jan van der Veen and Dr. Richard C. Hendriks. My research focuses on advanced signal processing techniques, specifically targeting microphone arrays and speech enhancement in complex acoustic environments. I received my Master's and Bachelor's degrees from the University of Science and Technology of China (USTC), where I was part of the School of the Gifted Young.",
  },
  interests: [
    { title: "Microphone Array Signal Processing", icon: "Mic", desc: "Beamforming, localization, and parameter estimation in reverberant environments." },
    { title: "Speech Enhancement", icon: "Layers", desc: "Noise reduction and dereverberation algorithms for hearing aids and communication systems." },
    { title: "Reconfigurable Intelligent Surfaces", icon: "Code", desc: "Leveraging smart surfaces to control acoustic propagation and improve signal quality." },
  ],
  news: [
    { date: "April 2024", text: "Invited talk at Fudan University on Microphone array signal dereverberation." },
    { date: "2023", text: "Paper accepted at the 57th Asilomar Conference on Signals, Systems, and Computers." },
    { date: "2023", text: "Two papers published in IEEE/ACM Transactions on Audio, Speech, and Language Processing." },
  ],
  education: [
    {
      degree: "PhD in Electrical Engineering",
      school: "Delft University of Technology (TUD)",
      year: "Mar. 2021 – Sept. 2025 (Expected)",
      details: "Promotors: Prof. Alle-Jan van der Veen & Dr. Richard C. Hendriks"
    },
    {
      degree: "M.Sc. in Electrical Engineering",
      school: "University of Science and Technology of China (USTC)",
      year: "Sep. 2017 – Jun. 2020",
      details: "School of Information Science and Technology. Advisor: Dr. Jian Li"
    },
    {
      degree: "B.Sc. in Applied Mathematics",
      school: "University of Science and Technology of China (USTC)",
      year: "Sep. 2013 – Jun. 2017",
      details: "School of the Gifted Young. Advisor: Dr. Jian Li"
    }
  ],
  publications: [
    {
      title: "Multimicrophone Signal Parameter Estimation in A Multi-Source Noisy Reverberant Scenario",
      authors: "C. Li and R. C. Hendriks",
      venue: "IEEE/ACM Transactions on Audio, Speech, and Language Processing (Awaiting Decision)",
      year: "2024",
      type: "Journal",
      link: "#"
    },
    {
      title: "Alternating Least-Squares-Based Microphone Array Parameter Estimation for A Single-Source Reverberant and Noisy Acoustic Scenario",
      authors: "C. Li and R. C. Hendriks",
      venue: "IEEE/ACM Transactions on Audio, Speech, and Language Processing, vol. 31, pp. 3922-3924",
      year: "2023",
      type: "Journal",
      link: "#"
    },
    {
      title: "Joint Maximum Likelihood Estimation of Microphone Array Parameters for a Reverberant Single Source Scenario",
      authors: "C. Li, J. Martinez and R. C. Hendriks",
      venue: "IEEE/ACM Transactions on Audio, Speech, and Language Processing, vol. 31, pp. 695-705",
      year: "2023",
      type: "Journal",
      link: "#"
    },
    {
      title: "ADaptive Time Segmentation for Improved Signal Model Parameter Estimation for a Single-Source Scenario",
      authors: "C. Li and R. C. Hendriks",
      venue: "57th Asilomar Conference on Signals, Systems, and Computers",
      year: "2023",
      type: "Conference",
      link: "#"
    },
    {
      title: "Noise PSD Insensitive RTF Estimation in a Reverberant and Noisy Environment",
      authors: "C. Li and R. C. Hendriks",
      venue: "IEEE International Conference on Acoustics, Speech and Signal Processing (ICASSP)",
      year: "2023",
      type: "Conference",
      link: "#"
    },
    {
      title: "Low Complex Accurate Multi-Source RTF Estimation",
      authors: "C. Li, J. Martinez and R. C. Hendriks",
      venue: "IEEE International Conference on Acoustics, Speech and Signal Processing (ICASSP)",
      year: "2022",
      type: "Conference",
      link: "#"
    },
    {
      title: "Quantization-Aware Binaural MWF Based Noise Reduction Incorporating External Wireless Devices",
      authors: "J. Zhang and C. Li",
      venue: "IEEE/ACM Transactions on Audio, Speech, and Language Processing, vol. 29",
      year: "2021",
      type: "Journal",
      link: "#"
    },
    {
      title: "Angular-Domain Channel Estimation for One-Bit Massive MIMO Systems",
      authors: "F. Liu, H. Zhu, C. Li, et al.",
      venue: "IEEE Transactions on Vehicular Technology, vol. 69, no. 3",
      year: "2020",
      type: "Journal",
      link: "#"
    },
    {
      title: "Range Estimation and Range-Doppler Imaging Using Signed Measurements in LFMCW Radar",
      authors: "R. Zhang, C. Li, J. Li and G. Wang",
      venue: "IEEE Transactions on Aerospace and Electronic Systems",
      year: "2019",
      type: "Journal",
      link: "#"
    },
    {
      title: "Bayesian Information Criterion for Signed Measurements With Application to Sinusoidal Signals",
      authors: "C. Li, R. Zhang, J. Li and P. Stoica",
      venue: "IEEE Signal Processing Letters, vol. 25, no. 8",
      year: "2018",
      type: "Journal",
      link: "#"
    },
    {
      title: "Model Order Determination for Signed Measurements via the Bayesian Information Criterion",
      authors: "C. Li, R. Zhang, J. Li and P. Stoica",
      venue: "IEEE 10th Sensor Array and Multichannel Signal Processing Workshop (SAM)",
      year: "2018",
      type: "Conference",
      link: "#"
    },
    {
      title: "On the Stability of Consensus Control under Rotational Ambiguities",
      authors: "Z. Li, C. Li and R. T. Rajan",
      venue: "IEEE Control Systems Letters (In Preparation)",
      year: "2024",
      type: "Preprint",
      link: "#"
    }
  ],
  skills: ["MATLAB", "Python", "LaTeX", "Signal Processing", "Parameter Estimation"],
  awards: [
    { title: "National Award for Graduates", issuer: "Ministry of Education, China", year: "2018" }
  ],
  teaching: [
    { role: "Teaching Assistant", course: "Estimation and Detection (Graduate Course)", year: "2021/22 Q2", school: "TUD" }
  ]
};

/**
 * ====================================================================================
 * 🟢 COMPONENTS
 * ====================================================================================
 */

const IconMap = {
  Mic: Mic,
  Layers: Layers,
  Code: Code,
  BookOpen: BookOpen,
};

const Navbar = ({ darkMode, toggleDarkMode }) => {
  const [isOpen, setIsOpen] = useState(false);

  const navLinks = [
    { name: 'Home', href: '#home' },
    { name: 'Research', href: '#research' },
    { name: 'Publications', href: '#publications' },
    { name: 'CV', href: '#cv' },
    { name: 'Contact', href: '#contact' },
  ];

  return (
    <nav className={`sticky top-0 z-50 backdrop-blur-md border-b ${darkMode ? 'bg-slate-900/90 border-slate-700 text-slate-100' : 'bg-white/90 border-slate-200 text-slate-800'} transition-colors duration-300`}>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          <div className="flex-shrink-0 font-bold text-xl tracking-tight">
            {data.profile.name}
          </div>
          
          {/* Desktop Menu */}
          <div className="hidden md:flex space-x-8 items-center">
            {navLinks.map((link) => (
              <a key={link.name} href={link.href} className="hover:text-blue-500 transition-colors text-sm font-medium">
                {link.name}
              </a>
            ))}
            <button 
              onClick={toggleDarkMode} 
              className={`p-2 rounded-full ${darkMode ? 'hover:bg-slate-700' : 'hover:bg-slate-100'} transition-colors`}
            >
              {darkMode ? <Sun size={18} /> : <Moon size={18} />}
            </button>
          </div>

          {/* Mobile Menu Button */}
          <div className="md:hidden flex items-center gap-4">
             <button 
              onClick={toggleDarkMode} 
              className={`p-2 rounded-full ${darkMode ? 'hover:bg-slate-700' : 'hover:bg-slate-100'} transition-colors`}
            >
              {darkMode ? <Sun size={18} /> : <Moon size={18} />}
            </button>
            <button onClick={() => setIsOpen(!isOpen)} className="p-2">
              {isOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {isOpen && (
        <div className={`md:hidden px-2 pt-2 pb-3 space-y-1 sm:px-3 border-b ${darkMode ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-200'}`}>
          {navLinks.map((link) => (
            <a 
              key={link.name} 
              href={link.href} 
              onClick={() => setIsOpen(false)}
              className="block px-3 py-2 rounded-md text-base font-medium hover:bg-blue-500/10 hover:text-blue-500 transition-colors"
            >
              {link.name}
            </a>
          ))}
        </div>
      )}
    </nav>
  );
};

const Hero = ({ darkMode }) => {
  return (
    <section id="home" className={`py-20 md:py-32 ${darkMode ? 'bg-slate-900' : 'bg-slate-50'} transition-colors duration-300`}>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row items-center gap-12">
          {/* Profile Image Placeholder - styled as a gradient circle if no image provided */}
          <div className="flex-shrink-0">
            <div className={`w-40 h-40 md:w-56 md:h-56 rounded-full flex items-center justify-center text-4xl font-bold shadow-xl ${darkMode ? 'bg-gradient-to-br from-blue-600 to-indigo-900 text-white' : 'bg-gradient-to-br from-blue-100 to-indigo-100 text-blue-600'}`}>
              CL
            </div>
          </div>
          
          <div className="text-center md:text-left space-y-4">
            <h1 className={`text-4xl md:text-5xl font-extrabold tracking-tight ${darkMode ? 'text-white' : 'text-slate-900'}`}>
              {data.profile.name}
            </h1>
            <p className={`text-xl md:text-2xl font-medium ${darkMode ? 'text-blue-400' : 'text-blue-600'}`}>
              {data.profile.title}
            </p>
            <div className={`flex flex-col gap-2 text-lg ${darkMode ? 'text-slate-300' : 'text-slate-600'}`}>
              <div className="flex items-center justify-center md:justify-start gap-2">
                <GraduationCap size={20} />
                <span>{data.profile.department}</span>
              </div>
              <div className="flex items-center justify-center md:justify-start gap-2">
                <MapPin size={20} />
                <span>{data.profile.affiliation}</span>
              </div>
            </div>
            
            <div className="flex flex-wrap justify-center md:justify-start gap-4 mt-6">
              <a href={`mailto:${data.profile.email}`} className="flex items-center gap-2 px-4 py-2 rounded-full bg-blue-600 text-white hover:bg-blue-700 transition shadow-md">
                <Mail size={18} /> Contact Me
              </a>
              <a href={data.profile.googleScholar} className={`flex items-center gap-2 px-4 py-2 rounded-full border ${darkMode ? 'border-slate-600 hover:bg-slate-800' : 'border-slate-300 hover:bg-white'} transition`}>
                <BookOpen size={18} /> Scholar
              </a>
              <a href="#cv" className={`flex items-center gap-2 px-4 py-2 rounded-full border ${darkMode ? 'border-slate-600 hover:bg-slate-800' : 'border-slate-300 hover:bg-white'} transition`}>
                <FileText size={18} /> CV
              </a>
            </div>
          </div>
        </div>
        
        <div className={`mt-16 p-6 rounded-2xl ${darkMode ? 'bg-slate-800/50' : 'bg-white'} shadow-sm border ${darkMode ? 'border-slate-700' : 'border-slate-200'}`}>
          <h3 className={`text-lg font-semibold mb-2 ${darkMode ? 'text-slate-200' : 'text-slate-800'}`}>About Me</h3>
          <p className={`leading-relaxed ${darkMode ? 'text-slate-300' : 'text-slate-600'}`}>
            {data.profile.about}
          </p>
        </div>
      </div>
    </section>
  );
};

const Research = ({ darkMode }) => {
  return (
    <section id="research" className={`py-20 ${darkMode ? 'bg-slate-950' : 'bg-white'} transition-colors duration-300`}>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-4 mb-12">
          <div className="h-px flex-1 bg-gradient-to-r from-transparent via-slate-300 to-transparent opacity-50"></div>
          <h2 className={`text-3xl font-bold ${darkMode ? 'text-white' : 'text-slate-900'}`}>Research Interests</h2>
          <div className="h-px flex-1 bg-gradient-to-r from-transparent via-slate-300 to-transparent opacity-50"></div>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {data.interests.map((item, index) => {
            const Icon = IconMap[item.icon] || BookOpen;
            return (
              <div key={index} className={`group p-8 rounded-2xl border transition-all duration-300 hover:-translate-y-1 hover:shadow-xl ${darkMode ? 'bg-slate-900 border-slate-800 hover:border-blue-500/30' : 'bg-slate-50 border-slate-100 hover:border-blue-200'}`}>
                <div className={`w-12 h-12 rounded-lg flex items-center justify-center mb-6 transition-colors ${darkMode ? 'bg-blue-900/30 text-blue-400 group-hover:bg-blue-600 group-hover:text-white' : 'bg-blue-100 text-blue-600 group-hover:bg-blue-600 group-hover:text-white'}`}>
                  <Icon size={24} />
                </div>
                <h3 className={`text-xl font-bold mb-3 ${darkMode ? 'text-slate-100' : 'text-slate-900'}`}>{item.title}</h3>
                <p className={`${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>{item.desc}</p>
              </div>
            );
          })}
        </div>

        {/* News Section */}
        <div className="mt-20">
          <h3 className={`text-2xl font-bold mb-8 flex items-center gap-2 ${darkMode ? 'text-white' : 'text-slate-900'}`}>
            <div className="w-2 h-8 bg-blue-500 rounded-full"></div>
            Latest News
          </h3>
          <div className={`space-y-6 border-l-2 ${darkMode ? 'border-slate-800' : 'border-slate-200'} ml-3 pl-8 relative`}>
            {data.news.map((item, i) => (
              <div key={i} className="relative">
                <div className={`absolute -left-[39px] top-1.5 w-5 h-5 rounded-full border-4 ${darkMode ? 'bg-slate-900 border-blue-900' : 'bg-white border-blue-100'}`}></div>
                <span className={`text-sm font-mono font-semibold ${darkMode ? 'text-blue-400' : 'text-blue-600'}`}>{item.date}</span>
                <p className={`mt-1 ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>{item.text}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

const Publications = ({ darkMode }) => {
  const [filter, setFilter] = useState('All');
  const [copiedId, setCopiedId] = useState(null);

  const categories = ['All', 'Journal', 'Conference', 'Preprint'];

  const filteredPubs = filter === 'All' 
    ? data.publications 
    : data.publications.filter(pub => pub.type === filter);

  const handleCopy = (id, title) => {
    // In a real app, this would copy the actual BibTeX
    navigator.clipboard.writeText(`@article{${id}, title={${title}}, author={Li, Changheng}, year={2024}}`);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <section id="publications" className={`py-20 ${darkMode ? 'bg-slate-900' : 'bg-slate-50'} transition-colors duration-300`}>
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <h2 className={`text-3xl font-bold mb-8 ${darkMode ? 'text-white' : 'text-slate-900'}`}>Publications</h2>
        
        {/* Filter Buttons */}
        <div className="flex flex-wrap gap-2 mb-10">
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setFilter(cat)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${
                filter === cat 
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20' 
                  : `${darkMode ? 'bg-slate-800 text-slate-400 hover:bg-slate-700' : 'bg-white text-slate-600 hover:bg-slate-100'} border ${darkMode ? 'border-slate-700' : 'border-slate-200'}`
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        <div className="space-y-6">
          {filteredPubs.map((pub, idx) => (
            <div key={idx} className={`p-6 rounded-xl border transition-all hover:shadow-md ${darkMode ? 'bg-slate-800/50 border-slate-700 hover:border-slate-600' : 'bg-white border-slate-200 hover:border-slate-300'}`}>
              <div className="flex flex-col sm:flex-row gap-4 justify-between sm:items-start">
                <div className="space-y-2">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`text-xs font-bold px-2 py-0.5 rounded border ${
                      pub.type === 'Journal' ? 'bg-emerald-100 text-emerald-700 border-emerald-200' : 
                      pub.type === 'Conference' ? 'bg-blue-100 text-blue-700 border-blue-200' : 
                      'bg-amber-100 text-amber-700 border-amber-200'
                    }`}>
                      {pub.type}
                    </span>
                    <span className={`text-sm font-medium ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>{pub.year}</span>
                  </div>
                  <h3 className={`text-lg font-bold leading-snug ${darkMode ? 'text-slate-100' : 'text-slate-900'}`}>
                    {pub.title}
                  </h3>
                  <p className={`${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                    {pub.authors.split('C. Li').flatMap((part, i, arr) => 
                      i < arr.length - 1 ? [part, <strong key={i} className={darkMode ? 'text-blue-300' : 'text-blue-700'}>C. Li</strong>] : [part]
                    )}
                  </p>
                  <p className={`text-sm italic ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                    {pub.venue}
                  </p>
                </div>
                
                <div className="flex sm:flex-col gap-2 shrink-0">
                 <button 
                    onClick={() => handleCopy(idx, pub.title)}
                    className={`p-2 rounded-lg flex items-center justify-center transition-colors ${darkMode ? 'bg-slate-700 hover:bg-slate-600 text-slate-300' : 'bg-slate-100 hover:bg-slate-200 text-slate-600'}`}
                    title="Copy Citation"
                  >
                    {copiedId === idx ? <Check size={18} className="text-green-500" /> : <Copy size={18} />}
                  </button>
                  {pub.link !== '#' && (
                    <a href={pub.link} className={`p-2 rounded-lg flex items-center justify-center transition-colors ${darkMode ? 'bg-slate-700 hover:bg-slate-600 text-slate-300' : 'bg-slate-100 hover:bg-slate-200 text-slate-600'}`}>
                      <ExternalLink size={18} />
                    </a>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

const CVSection = ({ darkMode }) => {
  return (
    <section id="cv" className={`py-20 ${darkMode ? 'bg-slate-950' : 'bg-white'} transition-colors duration-300`}>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <h2 className={`text-3xl font-bold mb-12 ${darkMode ? 'text-white' : 'text-slate-900'}`}>Curriculum Vitae</h2>
        
        <div className="grid gap-12">
          {/* Education */}
          <div>
            <h3 className={`text-xl font-bold mb-6 flex items-center gap-2 ${darkMode ? 'text-blue-400' : 'text-blue-700'}`}>
              <GraduationCap size={24} /> Education
            </h3>
            <div className={`space-y-8 border-l ${darkMode ? 'border-slate-800' : 'border-slate-200'} ml-3 pl-8`}>
              {data.education.map((edu, idx) => (
                <div key={idx} className="relative">
                   <div className={`absolute -left-[37px] top-1.5 w-4 h-4 rounded-full border-2 ${darkMode ? 'bg-slate-950 border-blue-500' : 'bg-white border-blue-500'}`}></div>
                   <div className="flex flex-col sm:flex-row sm:justify-between sm:items-baseline mb-1">
                     <h4 className={`text-lg font-bold ${darkMode ? 'text-slate-200' : 'text-slate-900'}`}>{edu.degree}</h4>
                     <span className={`text-sm font-mono ${darkMode ? 'text-slate-500' : 'text-slate-500'}`}>{edu.year}</span>
                   </div>
                   <div className={`font-medium mb-2 ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>{edu.school}</div>
                   <p className={`text-sm ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>{edu.details}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Skills & Awards Grid */}
          <div className="grid md:grid-cols-2 gap-12">
             <div>
                <h3 className={`text-xl font-bold mb-6 flex items-center gap-2 ${darkMode ? 'text-blue-400' : 'text-blue-700'}`}>
                  <Code size={24} /> Technical Skills
                </h3>
                <div className="flex flex-wrap gap-2">
                  {data.skills.map((skill, i) => (
                    <span key={i} className={`px-3 py-1 rounded-md text-sm font-medium ${darkMode ? 'bg-slate-900 text-slate-300 border border-slate-800' : 'bg-slate-100 text-slate-700 border border-slate-200'}`}>
                      {skill}
                    </span>
                  ))}
                </div>
             </div>
             <div>
                <h3 className={`text-xl font-bold mb-6 flex items-center gap-2 ${darkMode ? 'text-blue-400' : 'text-blue-700'}`}>
                  <Award size={24} /> Awards
                </h3>
                <div className="space-y-4">
                   {data.awards.map((award, i) => (
                     <div key={i} className={`p-4 rounded-lg ${darkMode ? 'bg-slate-900' : 'bg-slate-50'}`}>
                       <div className={`font-bold ${darkMode ? 'text-slate-200' : 'text-slate-800'}`}>{award.title}</div>
                       <div className={`text-sm ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>{award.issuer}, {award.year}</div>
                     </div>
                   ))}
                </div>
             </div>
          </div>
        </div>
        
        <div className="mt-12 text-center">
          <button className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-blue-600 text-white font-medium hover:bg-blue-700 transition shadow-lg shadow-blue-500/30">
            <Download size={20} /> Download Full CV (PDF)
          </button>
        </div>
      </div>
    </section>
  );
};

const Footer = ({ darkMode }) => {
  useEffect(() => {
    // Check if script already exists to avoid duplicates
    if (!document.getElementById('mapmyvisitors')) {
      const script = document.createElement('script');
      script.src = "//mapmyvisitors.com/map.js?d=jasWhK82vh3XfEJ_FOTtmHMD8ZnmpmRQC82DnGW1BBM&cl=ffffff&w=a";
      script.id = "mapmyvisitors";
      script.type = "text/javascript";
      
      // Find the container and append the script
      const container = document.getElementById('map-container');
      if (container) {
        container.appendChild(script);
      }
    }
  }, []);

  return (
    <footer id="contact" className={`py-12 border-t ${darkMode ? 'bg-slate-950 border-slate-900' : 'bg-slate-100 border-slate-200'}`}>
       <div className="max-w-4xl mx-auto px-4 text-center">
         <h2 className={`text-2xl font-bold mb-8 ${darkMode ? 'text-white' : 'text-slate-900'}`}>Get In Touch</h2>
         <div className="flex flex-col md:flex-row justify-center gap-8 mb-8">
           <div className="flex items-center justify-center gap-3">
             <Mail className="text-blue-500" />
             <span className={darkMode ? 'text-slate-300' : 'text-slate-600'}>{data.profile.email}</span>
           </div>
           <div className="flex items-center justify-center gap-3">
             <MapPin className="text-blue-500" />
             <span className={darkMode ? 'text-slate-300' : 'text-slate-600'}>{data.profile.location}</span>
           </div>
         </div>

         {/* Visitor Map Container */}
         <div className="flex justify-center mb-8">
           {/* ADDED: w-full, max-w-[300px], and min-h to prevent collapse */}
           <div id="map-container" className="overflow-hidden rounded-lg w-full max-w-[300px] min-h-[100px]">
             {/* The script will inject the map here automatically */}
           </div>
         </div>

         <p className={`text-sm ${darkMode ? 'text-slate-600' : 'text-slate-500'}`}>
           © {new Date().getFullYear()} {data.profile.name}. All rights reserved.
         </p>
       </div>
    </footer>
  );
};

export default function App() {
  // Default to system preference, but easy to default to light or dark
  const [darkMode, setDarkMode] = useState(false);

  const toggleDarkMode = () => {
    setDarkMode(!darkMode);
  };

  return (
    <div className={`min-h-screen font-sans selection:bg-blue-500/30 ${darkMode ? 'bg-slate-900' : 'bg-white'}`}>
      <Navbar darkMode={darkMode} toggleDarkMode={toggleDarkMode} />
      <Hero darkMode={darkMode} />
      <Research darkMode={darkMode} />
      <Publications darkMode={darkMode} />
      <CVSection darkMode={darkMode} />
      <Footer darkMode={darkMode} />
    </div>
  );
}