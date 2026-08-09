import { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import {
  Activity, ShieldCheck, Check, Star, ArrowRight, Search,
  Heart, Brain, Stethoscope, Smile, Sparkles, Layers,
  ChevronLeft, ChevronRight, Apple, Play, Globe, Mail, Phone,
  Baby, Lock, Shield, HeartPulse
} from "lucide-react";

/* ─── Animated Counter ─── */
function AnimatedCounter({ end, suffix = "", duration = 2000 }) {
  const [count, setCount] = useState(0);
  const ref = useRef(null);
  const started = useRef(false);
  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && !started.current) {
        started.current = true;
        const startTime = Date.now();
        const tick = () => {
          const elapsed = Date.now() - startTime;
          const progress = Math.min(elapsed / duration, 1);
          const eased = 1 - Math.pow(1 - progress, 4);
          setCount(Math.round(eased * end));
          if (progress < 1) requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
      }
    }, { threshold: 0.3 });
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [end, duration]);
  return <span ref={ref}>{count.toLocaleString()}{suffix}</span>;
}

/* ─── Scroll Reveal Wrapper ─── */
function Reveal({ children, delay = 0, className = "" }) {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) { setVisible(true); observer.disconnect(); }
    }, { threshold: 0.05 });
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);
  return (
    <div
      ref={ref}
      className={`transition-all duration-1000 ease-[cubic-bezier(0.16,1,0.3,1)] ${
        visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
      } ${className}`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </div>
  );
}

export default function Home() {
  const [scrolled, setScrolled] = useState(false);
  const [activeSpecialistIdx, setActiveSpecialistIdx] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const services = [
    {
      icon: <Heart className="w-6 h-6 text-[#005A51]" />,
      title: "Cardiology",
      desc: "Comprehensive heart health monitoring and advanced diagnostic procedures."
    },
    {
      icon: <Baby className="w-6 h-6 text-[#005A51]" />,
      title: "Pediatrics",
      desc: "Nurturing care for newborns, children, and adolescents in a gentle environment."
    },
    {
      icon: <Sparkles className="w-6 h-6 text-[#005A51]" />,
      title: "Dermatology",
      desc: "Expert treatment for skin, hair, and nail conditions with precision technologies."
    },
    {
      icon: <Smile className="w-6 h-6 text-[#005A51]" />,
      title: "Dental",
      desc: "Modern restorative and cosmetic dentistry for a healthy, confident smile."
    },
    {
      icon: <Brain className="w-6 h-6 text-[#005A51]" />,
      title: "Mental Health",
      desc: "Compassionate counseling and psychiatric support for emotional wellbeing."
    },
    {
      icon: <Stethoscope className="w-6 h-6 text-[#005A51]" />,
      title: "General Checkup",
      desc: "Routine health screenings and preventative care for all ages."
    }
  ];

  const steps = [
    {
      num: 1,
      title: "Book Appointment",
      desc: "Select your specialist and a time that fits your schedule via our portal."
    },
    {
      num: 2,
      title: "Consult Doctor",
      desc: "Meet your doctor virtually or in-person for a thorough consultation."
    },
    {
      num: 3,
      title: "Follow-up",
      desc: "Receive your digital prescription and schedule necessary follow-up care."
    }
  ];

  const specialists = [
    {
      name: "Dr. Jonathan Reis",
      role: "Senior Cardiologist",
      rating: "4.9",
      img: "/dr-reis.jpg"
    },
    {
      name: "Dr. Sarah Jenkins",
      role: "Pediatric Specialist",
      rating: "4.8",
      img: "/dr-jenkins.jpg"
    },
    {
      name: "Dr. Michael Chen",
      role: "Dermatology Head",
      rating: "5.0",
      img: "/dr-chen.jpg"
    },
    {
      name: "Dr. Elena Rodriguez",
      role: "Lead Psychologist",
      rating: "4.7",
      img: "/dr-rodriguez.jpg"
    }
  ];

  const testimonials = [
    {
      quote: "The precision and ease of booking through MedAI changed how I view healthcare. I felt heard and cared for from the first minute.",
      author: "Robert King",
      details: "Patient for 2 years",
      initials: "RK",
      avatarColor: "bg-blue-600"
    },
    {
      quote: "MedAI's pediatric department is amazing. My children actually look forward to their checkups now!",
      author: "Amanda Lee",
      details: "Mother of three",
      initials: "AL",
      avatarColor: "bg-teal-600"
    },
    {
      quote: "Fast results, secure data, and highly professional doctors. It's exactly what modern healthcare should be.",
      author: "David Chen",
      details: "Routine Checkup Patient",
      initials: "DC",
      avatarColor: "bg-emerald-700"
    }
  ];

  const scrollSpecialists = (direction) => {
    if (direction === "next") {
      setActiveSpecialistIdx((prev) => (prev + 1) % specialists.length);
    } else {
      setActiveSpecialistIdx((prev) => (prev - 1 + specialists.length) % specialists.length);
    }
  };

  return (
    <div className="min-h-screen bg-white text-slate-800 font-plus overflow-x-hidden antialiased">
      {/* ── Google Fonts Import ── */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&family=Outfit:wght@300;400;500;600;700;800&display=swap');
        .font-plus {
          font-family: 'Plus Jakarta Sans', sans-serif;
        }
        .font-outfit {
          font-family: 'Outfit', sans-serif;
        }
        .text-brand-teal {
          color: #005A51;
        }
        .bg-brand-teal {
          background-color: #005A51;
        }
        .border-brand-teal {
          border-color: #005A51;
        }
      `}</style>

      {/* ── NAVBAR ── */}
      <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled ? "bg-white/95 backdrop-blur-md shadow-sm py-4 border-b border-slate-100" : "bg-transparent py-5"
      }`}>
        <div className="max-w-7xl mx-auto px-6 lg:px-8 flex justify-between items-center">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#005A51" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 10.5L12 3l9 7.5V20a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
              <line x1="12" y1="9" x2="12" y2="15" />
              <line x1="9" y1="12" x2="15" y2="12" />
            </svg>
            <span className="text-2xl font-extrabold text-slate-900 tracking-tight font-outfit">MedAI</span>
          </Link>

          {/* Navigation Links */}
          <div className="hidden md:flex items-center gap-8 font-semibold text-slate-600 text-sm">
            <Link to="/" className="hover:text-[#005A51] transition-colors">Home</Link>
            <a href="#appointments" className="hover:text-[#005A51] transition-colors">Appointments</a>
            <a href="#records" className="hover:text-[#005A51] transition-colors">Records</a>
            <a href="#doctors" className="hover:text-[#005A51] transition-colors">Doctors</a>
            <a href="#contact" className="hover:text-[#005A51] transition-colors">Contact</a>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-4">
            <Link to="/login" className="bg-[#005A51] hover:bg-[#004D45] text-white font-bold text-sm px-6 py-2.5 rounded-lg transition-colors shadow-sm shadow-teal-900/10">
              Portal Login
            </Link>
          </div>
        </div>
      </nav>

      {/* ── HERO SECTION ── */}
      <section className="pt-32 pb-20 lg:pt-40 lg:pb-28 relative overflow-hidden bg-gradient-to-b from-teal-50/20 via-white to-white">
        {/* Soft Background Blobs */}
        <div className="absolute top-0 right-0 w-[50%] h-[80%] bg-radial-gradient from-teal-500/5 to-transparent rounded-full blur-3xl pointer-events-none" />
        
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
            
            {/* Left Content */}
            <div className="lg:col-span-6 z-10">
              <Reveal>
                <h1 className="text-5xl lg:text-[64px] font-extrabold tracking-tight text-slate-900 leading-[1.1] font-outfit">
                  Your Health, <span className="text-[#005A51]">Simplified.</span>
                </h1>
              </Reveal>

              <Reveal delay={150}>
                <p className="mt-6 text-slate-600 text-lg leading-relaxed font-medium">
                  Quality Care, Anytime, Anywhere. Experience precision medicine tailored to your lifestyle with our network of world-class specialists.
                </p>
              </Reveal>

              {/* CTAs */}
              <Reveal delay={300}>
                <div className="mt-8 flex flex-wrap gap-4 items-center">
                  <Link to="/signup" className="bg-[#005A51] hover:bg-[#004D45] text-white font-bold px-6 py-3.5 rounded-lg shadow-md shadow-teal-900/15 hover:shadow-lg transition-all flex items-center gap-2 group text-base">
                    Book Appointment <span className="font-light group-hover:translate-x-0.5 transition-transform">+</span>
                  </Link>
                  <a href="#doctors" className="border border-slate-200 text-slate-700 bg-white hover:bg-slate-50 font-bold px-6 py-3.5 rounded-lg shadow-sm transition-colors text-base">
                    View Doctors
                  </a>
                </div>
              </Reveal>

              {/* Search Capsule */}
              <Reveal delay={450}>
                <div className="mt-10 flex items-center bg-white border border-slate-200/80 rounded-full shadow-sm shadow-slate-100/50 pl-5 pr-2 py-2 max-w-lg w-full group focus-within:border-teal-500 focus-within:ring-1 focus-within:ring-teal-500/20 transition-all">
                  <Search className="text-slate-400 mr-2 group-focus-within:text-[#005A51] transition-colors" size={18} />
                  <input
                    type="text"
                    placeholder="Find a doctor or search symptoms..."
                    className="w-full bg-transparent border-none outline-none text-slate-800 placeholder-slate-400/90 text-sm py-1 font-semibold"
                  />
                  <button className="bg-[#0052CC] hover:bg-[#0043A4] text-white font-bold text-sm px-6 py-2.5 rounded-full transition-colors flex-shrink-0">
                    Search
                  </button>
                </div>
              </Reveal>
            </div>

            {/* Right Image Content */}
            <div className="lg:col-span-6 flex justify-center lg:justify-end relative mt-12 lg:mt-0">
              <Reveal delay={200} className="relative w-full max-w-md lg:max-w-lg">
                {/* Doctor Portrait Image container */}
                <div className="relative rounded-3xl border-4 border-white shadow-xl overflow-hidden aspect-[4/5] bg-slate-100">
                  <img
                    src="/hero-doctor.jpg"
                    alt="Female doctor in clinical hallway smiling"
                    className="w-full h-full object-cover object-top hover:scale-[1.02] transition-transform duration-700"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-900/10 via-transparent to-transparent pointer-events-none" />
                </div>

                {/* Badge Overlay */}
                <div className="absolute bottom-6 left-6 right-6 bg-white/95 backdrop-blur-sm border border-slate-100 shadow-xl rounded-2xl p-4 flex items-center gap-3">
                  <div className="bg-teal-50 p-2 rounded-xl text-teal-700">
                    <ShieldCheck className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="text-sm font-extrabold text-slate-900 font-outfit">Verified Care</div>
                    <div className="text-xs text-slate-500 font-bold">Top rated specialists only</div>
                  </div>
                </div>
              </Reveal>
            </div>

          </div>
        </div>
      </section>

      {/* ── STATS SECTION ── */}
      <section className="bg-[#005A51] py-8 text-white relative z-20">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-y-8 gap-x-4 text-center divide-y lg:divide-y-0 lg:divide-x divide-teal-400/20">
            <div className="flex flex-col justify-center items-center">
              <div className="text-3xl lg:text-4xl font-extrabold tracking-tight font-outfit">
                <AnimatedCounter end={500} suffix="+" />
              </div>
              <div className="text-teal-200 text-xs font-bold uppercase tracking-wider mt-1.5 font-outfit">Doctors</div>
            </div>
            
            <div className="flex flex-col justify-center items-center pt-8 lg:pt-0">
              <div className="text-3xl lg:text-4xl font-extrabold tracking-tight font-outfit">
                <AnimatedCounter end={50} suffix="k+" />
              </div>
              <div className="text-teal-200 text-xs font-bold uppercase tracking-wider mt-1.5 font-outfit">Patients Served</div>
            </div>
            
            <div className="flex flex-col justify-center items-center">
              <div className="text-3xl lg:text-4xl font-extrabold tracking-tight font-outfit">24/7</div>
              <div className="text-teal-200 text-xs font-bold uppercase tracking-wider mt-1.5 font-outfit">Support</div>
            </div>
            
            <div className="flex flex-col justify-center items-center pt-8 lg:pt-0">
              <div className="text-3xl lg:text-4xl font-extrabold tracking-tight font-outfit">HIPAA</div>
              <div className="text-teal-200 text-xs font-bold uppercase tracking-wider mt-1.5 font-outfit">Compliant</div>
            </div>
          </div>
        </div>
      </section>

      {/* ── OUR SPECIALIZED CARE ── */}
      <section className="py-24 bg-white" id="services">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <Reveal>
            <div className="text-center max-w-3xl mx-auto">
              <h2 className="text-3xl lg:text-4xl font-extrabold text-slate-900 tracking-tight font-outfit">
                Our Specialized Care
              </h2>
              <p className="mt-4 text-slate-500 font-medium text-base lg:text-lg leading-relaxed">
                Explore our range of clinical services, each delivered with the empathetic precision that defines MedAI.
              </p>
            </div>
          </Reveal>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8 mt-16">
            {services.map((svc, idx) => (
              <Reveal key={svc.title} delay={idx * 100}>
                <div className="bg-white border border-slate-100 rounded-2xl p-8 hover:shadow-lg hover:shadow-slate-100/80 hover:-translate-y-1 transition-all duration-300 flex flex-col items-start shadow-sm">
                  <div className="w-12 h-12 rounded-xl bg-teal-50 border border-teal-100/50 flex items-center justify-center mb-6">
                    {svc.icon}
                  </div>
                  <h3 className="text-lg font-bold text-slate-800 font-outfit">{svc.title}</h3>
                  <p className="mt-3 text-slate-500 text-sm leading-relaxed font-semibold">{svc.desc}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section className="py-24 bg-[#EBF2FC]/70 relative" id="appointments">
        <div className="max-w-7xl mx-auto px-6 lg:px-8 relative z-10">
          <Reveal>
            <div className="text-center max-w-3xl mx-auto">
              <h2 className="text-3xl lg:text-4xl font-extrabold text-slate-900 tracking-tight font-outfit">
                How It Works
              </h2>
            </div>
          </Reveal>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-12 mt-16 relative">
            {/* Desktop Connector Line */}
            <div className="hidden lg:block absolute top-7 left-[15%] right-[15%] h-[2px] bg-slate-200 z-0" />

            {steps.map((step, idx) => (
              <Reveal key={step.title} delay={idx * 150} className="relative z-10 text-center flex flex-col items-center">
                <div className="w-14 h-14 rounded-full bg-white border-2 border-slate-200 flex items-center justify-center text-[#005A51] font-bold text-lg shadow-sm hover:border-[#005A51] transition-colors duration-300">
                  {step.num}
                </div>
                <h3 className="text-lg font-bold text-slate-800 mt-6 font-outfit">{step.title}</h3>
                <p className="mt-3 text-slate-500 text-sm leading-relaxed font-semibold max-w-xs">{step.desc}</p>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── MEET OUR SPECIALISTS ── */}
      <section className="py-24 bg-white" id="doctors">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-6">
            <Reveal>
              <div>
                <h2 className="text-3xl lg:text-4xl font-extrabold text-slate-900 tracking-tight font-outfit">
                  Meet Our Specialists
                </h2>
                <p className="mt-2 text-slate-500 font-semibold text-sm sm:text-base">
                  Top-rated medical professionals across diverse fields.
                </p>
              </div>
            </Reveal>

            {/* Slider arrows */}
            <Reveal className="flex gap-2">
              <button
                onClick={() => scrollSpecialists("prev")}
                className="w-10 h-10 rounded-full border border-slate-200 bg-white flex items-center justify-center text-slate-600 hover:bg-slate-50 transition-colors shadow-sm focus:outline-none"
              >
                <ChevronLeft size={18} />
              </button>
              <button
                onClick={() => scrollSpecialists("next")}
                className="w-10 h-10 rounded-full border border-slate-200 bg-white flex items-center justify-center text-slate-600 hover:bg-slate-50 transition-colors shadow-sm focus:outline-none"
              >
                <ChevronRight size={18} />
              </button>
            </Reveal>
          </div>

          {/* Specialists grid - layout is responsive but can slide */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mt-12">
            {specialists.map((doc, idx) => {
              // Simple dynamic highlighting to simulate slider highlight
              const isHighlighted = idx === activeSpecialistIdx;
              return (
                <Reveal key={doc.name} delay={idx * 100}>
                  <div className={`bg-white border rounded-2xl p-4 shadow-sm hover:shadow-md transition-all duration-300 ${
                    isHighlighted ? "border-[#005A51] ring-1 ring-[#005A51]/20 scale-[1.01]" : "border-slate-100"
                  }`}>
                    <div className="aspect-square w-full rounded-xl overflow-hidden bg-slate-50 relative">
                      <img
                        src={doc.img}
                        alt={doc.name}
                        className="w-full h-full object-cover hover:scale-105 transition-transform duration-500"
                      />
                    </div>
                    
                    <div className="mt-4 flex justify-between items-start">
                      <div>
                        <h3 className="font-bold text-slate-900 font-outfit text-base">{doc.name}</h3>
                        <p className="text-xs text-slate-500 font-bold mt-1">{doc.role}</p>
                      </div>
                      <div className="flex items-center gap-1 bg-emerald-50 text-emerald-800 text-[11px] font-bold px-2 py-0.5 rounded-full">
                        <Star className="w-3 h-3 fill-emerald-600 stroke-emerald-600" />
                        {doc.rating}
                      </div>
                    </div>

                    <Link to="/login" className="w-full bg-[#EBF2FC] hover:bg-[#D8E6FC] text-[#005A51] font-extrabold text-xs py-2.5 rounded-lg transition-colors mt-4 text-center block font-outfit">
                      Profile
                    </Link>
                  </div>
                </Reveal>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── PATIENT SUCCESS STORIES ── */}
      <section className="py-24 bg-[#EBF2FC]/70" id="records">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <Reveal>
            <div className="text-center max-w-3xl mx-auto">
              <h2 className="text-3xl lg:text-4xl font-extrabold text-slate-900 tracking-tight font-outfit">
                Patient Success Stories
              </h2>
            </div>
          </Reveal>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mt-16">
            {testimonials.map((test, idx) => (
              <Reveal key={test.author} delay={idx * 150}>
                <div className="bg-white border border-slate-100 rounded-2xl p-8 shadow-sm flex flex-col justify-between h-full">
                  <div>
                    {/* Stars */}
                    <div className="flex gap-1 mb-6 text-emerald-600">
                      {[...Array(5)].map((_, i) => (
                        <Star key={i} className="w-4 h-4 fill-emerald-600 stroke-emerald-600" />
                      ))}
                    </div>
                    <p className="text-slate-600 text-sm italic font-semibold leading-relaxed">
                      "{test.quote}"
                    </p>
                  </div>

                  {/* Profile info */}
                  <div className="flex items-center gap-3 mt-8 pt-6 border-t border-slate-50">
                    <div className={`w-10 h-10 rounded-full ${test.avatarColor} text-white flex items-center justify-center font-bold text-xs`}>
                      {test.initials}
                    </div>
                    <div>
                      <h4 className="text-sm font-extrabold text-slate-900 font-outfit">{test.author}</h4>
                      <p className="text-xs text-slate-500 font-bold">{test.details}</p>
                    </div>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── MOBILE APP TEASER ── */}
      <section className="py-20 bg-white" id="contact">
        <div className="max-w-6xl mx-auto px-6 lg:px-8">
          <Reveal>
            <div className="bg-[#005A51] rounded-[32px] p-8 md:p-12 lg:p-16 text-white overflow-hidden relative shadow-xl shadow-teal-900/10">
              {/* background lighting gradient */}
              <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-radial-gradient from-teal-400/20 to-transparent rounded-full blur-2xl pointer-events-none" />

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center relative z-10">
                
                {/* Text Block */}
                <div className="lg:col-span-7">
                  <h2 className="text-3xl sm:text-4xl lg:text-[42px] font-extrabold tracking-tight leading-[1.15] font-outfit">
                    Manage your health on the go
                  </h2>
                  <p className="mt-4 text-teal-100 text-base lg:text-lg leading-relaxed font-semibold text-teal-100/90 max-w-xl">
                    Download the MedAI app to book appointments, view labs, and message your doctor securely from anywhere.
                  </p>

                  {/* Store Buttons */}
                  <div className="mt-8 flex flex-wrap gap-4">
                    {/* App Store */}
                    <a href="#store" className="bg-slate-950 hover:bg-slate-900 text-white border border-slate-800 rounded-xl px-5 py-2.5 flex items-center gap-3 transition-colors shadow-md">
                      <Apple className="w-6 h-6 fill-white text-white" />
                      <div className="text-left">
                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider leading-none">Download on the</div>
                        <div className="text-sm font-bold font-outfit leading-tight mt-1">App Store</div>
                      </div>
                    </a>

                    {/* Google Play */}
                    <a href="#store" className="bg-slate-950 hover:bg-slate-900 text-white border border-slate-800 rounded-xl px-5 py-2.5 flex items-center gap-3 transition-colors shadow-md">
                      <Play className="w-6 h-6 fill-white text-white" />
                      <div className="text-left">
                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider leading-none">Get it on</div>
                        <div className="text-sm font-bold font-outfit leading-tight mt-1">Google Play</div>
                      </div>
                    </a>
                  </div>
                </div>

                {/* Smartphone Preview Mockup */}
                <div className="lg:col-span-5 flex justify-center">
                  <div className="border-[6px] border-white rounded-[40px] w-64 h-[420px] bg-slate-50 relative shadow-2xl overflow-hidden">
                    {/* Status Bar */}
                    <div className="h-6 bg-slate-100/80 border-b border-slate-200/50 flex justify-between items-center px-6">
                      <span className="text-[10px] font-bold text-slate-600">9:41</span>
                      <div className="flex gap-1 items-center">
                        <div className="w-2.5 h-2.5 bg-slate-500 rounded-full scale-75" />
                        <div className="w-3.5 h-2 bg-slate-600 rounded-sm" />
                      </div>
                    </div>

                    {/* Screen Content */}
                    <div className="p-4 flex flex-col gap-3 h-full justify-between">
                      {/* Logo and Greeting */}
                      <div className="flex items-center gap-1.5 mt-1">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#005A51" strokeWidth="3">
                          <path d="M3 10.5L12 3l9 7.5V20a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                        </svg>
                        <span className="text-[11px] font-extrabold text-slate-900 font-outfit">MedAI</span>
                      </div>

                      {/* Pill Cards */}
                      <div className="flex-1 flex flex-col gap-2.5 justify-center py-2">
                        {/* Green Card */}
                        <div className="bg-teal-50/70 border border-teal-100 rounded-xl p-3 flex items-center justify-between">
                          <div className="w-7 h-7 rounded-lg bg-teal-500/10 flex items-center justify-center">
                            <Activity className="w-4 h-4 text-teal-700" />
                          </div>
                          <div className="flex-1 ml-2.5">
                            <div className="h-2 bg-teal-800/20 rounded w-16" />
                            <div className="h-1.5 bg-teal-800/10 rounded w-10 mt-1" />
                          </div>
                        </div>

                        {/* Blue Card */}
                        <div className="bg-blue-50/70 border border-blue-100 rounded-xl p-3 flex items-center justify-between">
                          <div className="w-7 h-7 rounded-lg bg-blue-500/10 flex items-center justify-center">
                            <ShieldCheck className="w-4 h-4 text-blue-700" />
                          </div>
                          <div className="flex-1 ml-2.5">
                            <div className="h-2 bg-blue-800/20 rounded w-20" />
                            <div className="h-1.5 bg-blue-800/10 rounded w-12 mt-1" />
                          </div>
                        </div>

                        {/* Large Card mockup */}
                        <div className="bg-slate-100/50 border border-slate-200/50 rounded-xl p-3">
                          <div className="h-2 bg-slate-300 rounded w-2/3" />
                          <div className="h-1.5 bg-slate-200 rounded w-1/2 mt-1.5" />
                          <div className="h-1.5 bg-slate-200 rounded w-5/6 mt-1" />
                          
                          <div className="mt-4 flex gap-2">
                            <div className="h-5 bg-[#005A51] rounded-lg w-16" />
                            <div className="h-5 bg-white border border-slate-200 rounded-lg w-12" />
                          </div>
                        </div>
                      </div>

                      {/* Phone Bottom Button */}
                      <div className="bg-[#005A51] rounded-full h-8 text-[10px] font-bold text-white flex items-center justify-center shadow-md mb-8">
                        Book Appointment
                      </div>
                    </div>
                  </div>
                </div>

              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="bg-white border-t border-slate-100 pt-16 pb-8">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-8 lg:gap-12 pb-12">
            {/* Brand Block */}
            <div className="lg:col-span-5 flex flex-col items-start">
              <Link to="/" className="flex items-center gap-2">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#005A51" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 10.5L12 3l9 7.5V20a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                  <line x1="12" y1="9" x2="12" y2="15" />
                  <line x1="9" y1="12" x2="15" y2="12" />
                </svg>
                <span className="text-2xl font-extrabold text-slate-900 tracking-tight font-outfit">MedAI</span>
              </Link>
              <p className="mt-4 text-slate-500 text-sm font-semibold leading-relaxed max-w-sm">
                Empowering patients with precision healthcare through advanced technology and empathetic care teams.
              </p>
            </div>

            {/* Quick Links */}
            <div className="lg:col-span-2">
              <h4 className="text-xs font-bold text-slate-900 uppercase tracking-widest font-outfit">Quick Links</h4>
              <ul className="mt-4 space-y-2.5 text-slate-500 text-sm font-semibold">
                <li><a href="#doctors" className="hover:text-[#005A51] transition-colors">Our Doctors</a></li>
                <li><a href="#services" className="hover:text-[#005A51] transition-colors">Services</a></li>
                <li><Link to="/signup" className="hover:text-[#005A51] transition-colors">Booking</Link></li>
                <li><a href="#blog" className="hover:text-[#005A51] transition-colors">Health Blog</a></li>
              </ul>
            </div>

            {/* Legal & Compliance */}
            <div className="lg:col-span-2.5">
              <h4 className="text-xs font-bold text-slate-900 uppercase tracking-widest font-outfit">Legal & Compliance</h4>
              <ul className="mt-4 space-y-2.5 text-slate-500 text-sm font-semibold">
                <li><a href="#privacy" className="hover:text-[#005A51] transition-colors">Privacy Policy</a></li>
                <li><a href="#terms" className="hover:text-[#005A51] transition-colors">Terms of Service</a></li>
                <li><a href="#security" className="hover:text-[#005A51] transition-colors">Security Architecture</a></li>
                <li><a href="#hipaa" className="hover:text-[#005A51] transition-colors">HIPAA Compliance</a></li>
              </ul>
            </div>

            {/* Follow Us */}
            <div className="lg:col-span-2.5">
              <h4 className="text-xs font-bold text-slate-900 uppercase tracking-widest font-outfit">Follow Us</h4>
              <div className="mt-4 flex gap-3.5">
                <a href="#social" className="w-10 h-10 rounded-full bg-[#EBF2FC] text-[#005A51] hover:bg-teal-50 flex items-center justify-center transition-colors shadow-sm">
                  <Globe size={18} />
                </a>
                <a href="#social" className="w-10 h-10 rounded-full bg-[#EBF2FC] text-[#005A51] hover:bg-teal-50 flex items-center justify-center transition-colors shadow-sm">
                  <Mail size={18} />
                </a>
                <a href="#social" className="w-10 h-10 rounded-full bg-[#EBF2FC] text-[#005A51] hover:bg-teal-50 flex items-center justify-center transition-colors shadow-sm">
                  <Phone size={18} />
                </a>
              </div>
            </div>
          </div>

          {/* Bottom Footer Line */}
          <div className="mt-12 pt-8 border-t border-slate-100 flex flex-col md:flex-row justify-between items-center gap-4 text-xs font-bold text-slate-400">
            <p className="order-2 md:order-1">
              © 2026 MedAI Health. All rights reserved. Secure HIPAA-Compliant Environment.
            </p>
            <div className="order-1 md:order-2 flex gap-6">
              <a href="#privacy" className="hover:text-[#005A51] transition-colors">Privacy Policy</a>
              <a href="#terms" className="hover:text-[#005A51] transition-colors">Terms of Service</a>
              <a href="#support" className="hover:text-[#005A51] transition-colors">Contact Support</a>
            </div>
          </div>

        </div>
      </footer>

    </div>
  );
}