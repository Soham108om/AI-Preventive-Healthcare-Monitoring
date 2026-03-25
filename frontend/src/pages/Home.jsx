import { useState, useEffect, useRef } from "react";
import {
  Activity, ShieldCheck, Zap, ArrowRight, HeartPulse,
  Brain, BarChart3, Check, ChevronRight, Star,
  Upload, Cpu, Lightbulb, Users, Clock, TrendingUp,
  Lock, Database, Wifi, Quote, Phone, Calendar
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
function Reveal({ children, delay = 0, style = {} }) {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) { setVisible(true); observer.disconnect(); }
    }, { threshold: 0.1 });
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);
  return (
    <div ref={ref} style={{
      opacity: visible ? 1 : 0,
      transform: visible ? "translateY(0)" : "translateY(24px)",
      transition: `opacity 0.8s cubic-bezier(0.16, 1, 0.3, 1) ${delay}ms, transform 0.8s cubic-bezier(0.16, 1, 0.3, 1) ${delay}ms`,
      ...style
    }}>
      {children}
    </div>
  );
}

/* ─── Main Component ─── */
export default function Home() {
  const [pulse, setPulse] = useState(74);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const iv = setInterval(() => setPulse(72 + Math.round(Math.sin(Date.now() / 1200) * 3)), 1000);
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll);
    return () => { clearInterval(iv); window.removeEventListener("scroll", onScroll); };
  }, []);

  const features = [
    { icon: <Brain size={24} strokeWidth={2} />, color: "#0F766E", bg: "#CCFBF1", title: "AI Diagnostics", desc: "Advanced neural networks providing instant, second-opinion diagnostic suggestions." },
    { icon: <HeartPulse size={24} strokeWidth={2} />, color: "#0369A1", bg: "#E0F2FE", title: "Vitals Telemetry", desc: "Continuous patient monitoring with automated clinical alerts for medical staff." },
    { icon: <Database size={24} strokeWidth={2} />, color: "#6D28D9", bg: "#F3E8FF", title: "Unified Records", desc: "Seamless, secure EHR integration that gives clinicians the full patient history." },
    { icon: <BarChart3 size={24} strokeWidth={2} />, color: "#B45309", bg: "#FEF3C7", title: "Risk Stratification", desc: "Predictive analytics to anticipate patient deterioration before symptoms appear." },
    { icon: <Wifi size={24} strokeWidth={2} />, color: "#1D4ED8", bg: "#DBEAFE", title: "Device Integration", desc: "Connects securely with standard medical IoT hardware and smart wearables." },
    { icon: <Lock size={24} strokeWidth={2} />, color: "#334155", bg: "#F1F5F9", title: "HIPAA Compliant", desc: "Enterprise-grade encryption ensuring patient data privacy and legal compliance." },
  ];

  const steps = [
    { icon: <Upload size={24} strokeWidth={2} />, step: "01", title: "Data Ingestion", desc: "Securely upload patient history or sync live vitals from connected clinical devices." },
    { icon: <Cpu size={24} strokeWidth={2} />, step: "02", title: "AI Analysis", desc: "Our proprietary models cross-reference symptoms with millions of clinical pathways." },
    { icon: <Lightbulb size={24} strokeWidth={2} />, step: "03", title: "Clinical Action", desc: "Doctors receive prioritized, actionable insights to deliver faster, better care." },
  ];

  const benefits = [
    { icon: <Clock size={24} strokeWidth={2} />, metric: "73%", label: "Faster Diagnosis", desc: "Reduce wait times in triage and outpatient settings." },
    { icon: <TrendingUp size={24} strokeWidth={2} />, metric: "4.2x", label: "Better Monitoring", desc: "Proactive care through continuous algorithmic surveillance." },
    { icon: <Users size={24} strokeWidth={2} />, metric: "58%", label: "Staff Efficiency", desc: "Automate manual charting and routine vital checks." },
    { icon: <ShieldCheck size={24} strokeWidth={2} />, metric: "99.9%", label: "Uptime", desc: "Hospital-grade reliability you can trust in an emergency." },
  ];

  return (
    <div style={{ minHeight: "100vh", background: "#F8FAFC", color: "#0F172A", overflowX: "hidden", fontFamily: "'Inter', sans-serif" }}>

      {/* ── Global Styles ── */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap');
        * { box-sizing: border-box; }
        body { margin: 0; padding: 0; }
        html { scroll-behavior: smooth; }

        .text-brand { color: #0F766E; } /* Medical Teal */
        .bg-brand { background: #0F766E; }
        
        .text-gradient {
          background: linear-gradient(135deg, #0F766E 0%, #0369A1 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }

        /* Navbar - Clean, white, professional */
        .navbar {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          height: 76px;
          background: ${scrolled ? "rgba(255,255,255,0.98)" : "rgba(255,255,255,0.8)"};
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          border-bottom: 1px solid ${scrolled ? "rgba(226,232,240,1)" : "transparent"};
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 0 5%;
          z-index: 1000;
          transition: all 0.3s ease;
          box-shadow: ${scrolled ? "0 4px 20px -8px rgba(15,23,42,0.05)" : "none"};
        }
        .nav-links { display: flex; gap: 40px; }
        .nav-links a {
          text-decoration: none;
          color: #475569;
          font-weight: 500;
          font-size: 15px;
          transition: color 0.2s;
        }
        .nav-links a:hover { color: #0F766E; }

        /* Buttons - Flat, modern, solid */
        .btn-primary {
          height: 48px; padding: 0 28px; border-radius: 8px;
          background: #0F766E; color: white; font-weight: 600; font-size: 15px; border: none;
          display: inline-flex; align-items: center; gap: 8px;
          cursor: pointer; text-decoration: none;
          transition: all 0.2s ease;
        }
        .btn-primary:hover { background: #115E59; transform: translateY(-1px); box-shadow: 0 4px 12px rgba(15, 118, 110, 0.2); }
        
        .btn-outline {
          height: 48px; padding: 0 28px; border-radius: 8px;
          background: white; color: #0F766E; font-weight: 600;
          font-size: 15px; border: 1.5px solid #0F766E;
          display: inline-flex; align-items: center; gap: 8px;
          cursor: pointer; text-decoration: none;
          transition: all 0.2s ease;
        }
        .btn-outline:hover { background: #F0FDFA; }

        .btn-ghost {
          height: 40px; padding: 0 16px; border-radius: 8px;
          background: transparent; color: #334155; font-weight: 600; font-size: 15px; border: none;
          display: inline-flex; align-items: center; cursor: pointer; text-decoration: none;
          transition: background 0.2s;
        }
        .btn-ghost:hover { background: #F1F5F9; color: #0F172A; }

        /* Clean feature cards */
        .feature-card {
          background: white;
          border: 1px solid #E2E8F0;
          border-radius: 16px;
          padding: 40px 32px;
          transition: all 0.3s ease;
          box-shadow: 0 4px 6px -1px rgba(0,0,0,0.02), 0 2px 4px -2px rgba(0,0,0,0.02);
        }
        .feature-card:hover { 
          transform: translateY(-4px); 
          box-shadow: 0 12px 24px -8px rgba(15,23,42,0.08); 
          border-color: #CBD5E1; 
        }

        .section-label {
          display: inline-flex; align-items: center; gap: 6px;
          font-size: 13px; font-weight: 700; color: #0F766E;
          text-transform: uppercase; letter-spacing: 0.05em;
          margin-bottom: 16px;
        }

        @media (max-width: 1024px) {
          .hero-grid { grid-template-columns: 1fr !important; text-align: center; }
          .hero-ctas { justify-content: center !important; }
          .hero-image-container { display: none !important; }
          .nav-links { display: none !important; }
          .features-grid { grid-template-columns: 1fr !important; }
          .benefits-grid { grid-template-columns: 1fr 1fr !important; }
          .steps-grid { grid-template-columns: 1fr !important; }
        }
        @media (max-width: 640px) {
          .benefits-grid { grid-template-columns: 1fr !important; }
          .stats-grid { grid-template-columns: 1fr 1fr !important; }
        }
      `}</style>

      {/* ── Background Elements (Soft, clinical) ── */}
      <div style={{ position: "absolute", top: 0, right: 0, width: "50%", height: "800px", background: "radial-gradient(circle, #E0F2FE 0%, transparent 70%)", opacity: 0.6, zIndex: 0 }} />

      {/* ── NAVBAR ── */}
      <nav className="navbar">
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <div style={{ width: 34, height: 34, borderRadius: 8, background: "#0F766E", display: "flex", justifyContent: "center", alignItems: "center" }}>
            <Activity size={20} color="white" strokeWidth={2.5} />
          </div>
          <span style={{ fontSize: 22, fontWeight: 700, color: "#0F172A", letterSpacing: "-0.02em" }}>MedAI</span>
        </div>

        <div className="nav-links">
          <a href="#capabilities">Capabilities</a>
          <a href="#technology">Technology</a>
          <a href="#impact">Clinical Impact</a>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <a href="/login" className="btn-ghost">Patient / Staff Portal</a>
          <a href="/signup" className="btn-primary" style={{ height: "40px" }}>Book Demo</a>
        </div>
      </nav>

      {/* ════════════════════════════════════════
            HERO SECTION
      ════════════════════════════════════════ */}
      <section style={{ minHeight: "100vh", display: "flex", alignItems: "center", position: "relative", zIndex: 10, padding: "0 5%" }}>
        <div style={{ width: "100%", maxWidth: 1280, margin: "0 auto", paddingTop: 80 }}>
          <div className="hero-grid" style={{ display: "grid", gridTemplateColumns: "1.1fr 0.9fr", gap: 64, alignItems: "center" }}>

            {/* Left: Copy */}
            <div>
              <div style={{ display: "inline-flex", alignItems: "center", gap: "8px", background: "#F0FDFA", padding: "6px 14px", borderRadius: "100px", border: "1px solid #CCFBF1", marginBottom: "24px" }}>
                <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#0D9488" }} />
                <span style={{ fontSize: "13px", fontWeight: 600, color: "#0F766E" }}>Next-Generation Clinical Intelligence</span>
              </div>

              <h1 style={{ fontSize: "clamp(40px, 5vw, 68px)", fontWeight: 800, lineHeight: 1.1, letterSpacing: "-0.03em", margin: "0 0 24px 0", color: "#0F172A" }}>
                Elevating patient care with <span className="text-gradient">precision AI.</span>
              </h1>

              <p style={{ fontSize: "clamp(17px, 1.8vw, 20px)", color: "#475569", lineHeight: 1.6, margin: "0 0 40px 0", fontWeight: 400, maxWidth: 540 }}>
                Empower your medical staff with real-time telemetry, predictive analytics, and instant diagnostic support. Built for modern clinics and hospitals.
              </p>

              <div className="hero-ctas" style={{ display: "flex", gap: "16px", flexWrap: "wrap", alignItems: "center", marginBottom: "48px" }}>
                <a href="/signup" className="btn-primary" style={{ height: "54px", padding: "0 32px", fontSize: "16px" }}>
                  Start Platform Free <ArrowRight size={18} />
                </a>
                <a href="#capabilities" className="btn-outline" style={{ height: "54px", padding: "0 32px", fontSize: "16px", border: "none", background: "#F1F5F9", color: "#334155" }}>
                  View Capabilities
                </a>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: "24px", color: "#64748B", fontSize: "14px", fontWeight: 500 }}>
                <span style={{ display: "flex", alignItems: "center", gap: "6px" }}><Check size={18} color="#0D9488" /> HIPAA Compliant</span>
                <span style={{ display: "flex", alignItems: "center", gap: "6px" }}><Check size={18} color="#0D9488" /> EHR Integration</span>
              </div>
            </div>

            {/* Right: Clean Clinical Imagery & UI */}
            <div className="hero-image-container" style={{ position: "relative", height: "600px", width: "100%" }}>
              {/* Doctor/Clinic Image Placeholder */}
              <div style={{ position: "absolute", top: "40px", right: 0, width: "85%", height: "500px", borderRadius: "24px", overflow: "hidden", boxShadow: "0 20px 40px -12px rgba(0,0,0,0.15)" }}>
                <img 
                  src="https://images.unsplash.com/photo-1551076805-e1869033e561?q=80&w=1200&auto=format&fit=crop" 
                  alt="Modern Clinic" 
                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                />
                <div style={{ position: "absolute", inset: 0, background: "linear-gradient(0deg, rgba(15,23,42,0.4) 0%, transparent 40%)" }} />
              </div>

              {/* Clean UI Card Overlay */}
              <div style={{ position: "absolute", bottom: "80px", left: 0, background: "white", borderRadius: "16px", padding: "24px", width: "320px", boxShadow: "0 24px 48px -12px rgba(15,23,42,0.15)", border: "1px solid #E2E8F0" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "20px" }}>
                  <div style={{ width: 44, height: 44, borderRadius: "50%", background: "#F1F5F9", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "16px", fontWeight: 600, color: "#334155" }}>SJ</div>
                  <div>
                    <div style={{ fontSize: "15px", fontWeight: 700, color: "#0F172A" }}>Sarah Jenkins</div>
                    <div style={{ fontSize: "13px", color: "#64748B", fontWeight: 500 }}>Vitals Stream Active</div>
                  </div>
                </div>
                
                <div style={{ display: "flex", gap: "12px" }}>
                  <div style={{ flex: 1, background: "#F8FAFC", padding: "16px", borderRadius: "12px", border: "1px solid #F1F5F9" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "8px", color: "#EF4444" }}>
                      <HeartPulse size={16} /> <span style={{ fontSize: "12px", fontWeight: 600 }}>Heart Rate</span>
                    </div>
                    <div style={{ fontSize: "32px", fontWeight: 700, color: "#0F172A", lineHeight: 1 }}>{pulse}</div>
                  </div>
                  <div style={{ flex: 1, background: "#F0FDFA", padding: "16px", borderRadius: "12px", border: "1px solid #CCFBF1" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "8px", color: "#0D9488" }}>
                      <ShieldCheck size={16} /> <span style={{ fontSize: "12px", fontWeight: 600 }}>AI Status</span>
                    </div>
                    <div style={{ fontSize: "16px", fontWeight: 700, color: "#0F766E", marginTop: "10px" }}>Stable</div>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════
            CAPABILITIES SECTION
      ════════════════════════════════════════ */}
      <section id="capabilities" style={{ padding: "100px 5%", background: "white", position: "relative", zIndex: 10 }}>
        <div style={{ maxWidth: 1280, margin: "0 auto" }}>
          <Reveal>
            <div style={{ textAlign: "center", marginBottom: "64px" }}>
              <div className="section-label">Medical Capabilities</div>
              <h2 style={{ fontSize: "clamp(32px, 4vw, 44px)", fontWeight: 800, color: "#0F172A", margin: "0 0 16px 0", letterSpacing: "-0.02em" }}>
                Comprehensive tools for <span className="text-gradient">modern practice.</span>
              </h2>
              <p style={{ fontSize: "18px", color: "#64748B", maxWidth: 600, margin: "0 auto", lineHeight: 1.6 }}>
                Everything your clinical team needs to monitor, analyze, and diagnose patients with unprecedented speed and accuracy.
              </p>
            </div>
          </Reveal>

          <div className="features-grid" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "24px" }}>
            {features.map((f, i) => (
              <Reveal key={f.title} delay={i * 80}>
                <div className="feature-card">
                  <div style={{ width: 48, height: 48, borderRadius: 12, background: f.bg, color: f.color, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "20px" }}>
                    {f.icon}
                  </div>
                  <h3 style={{ fontSize: "18px", fontWeight: 700, color: "#0F172A", margin: "0 0 12px 0" }}>{f.title}</h3>
                  <p style={{ fontSize: "15px", color: "#64748B", lineHeight: 1.6, margin: 0 }}>{f.desc}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════
            HOW IT WORKS (TECHNOLOGY)
      ════════════════════════════════════════ */}
      <section id="technology" style={{ padding: "100px 5%", background: "#F8FAFC", borderTop: "1px solid #F1F5F9" }}>
        <div style={{ maxWidth: 1280, margin: "0 auto" }}>
          <Reveal>
            <div style={{ textAlign: "center", marginBottom: "80px" }}>
              <div className="section-label">Technology workflow</div>
              <h2 style={{ fontSize: "clamp(32px, 4vw, 44px)", fontWeight: 800, color: "#0F172A", margin: "0 0 16px 0", letterSpacing: "-0.02em" }}>
                Intelligent care in <span className="text-brand">three steps.</span>
              </h2>
            </div>
          </Reveal>

          <div className="steps-grid" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "40px", position: "relative" }}>
            {/* Subtle Connector line */}
            <div style={{ position: "absolute", top: "28px", left: "16.6%", right: "16.6%", height: "1px", background: "#CBD5E1", zIndex: 0 }} />

            {steps.map((s, i) => (
              <Reveal key={s.step} delay={i * 100}>
                <div style={{ position: "relative", zIndex: 1, background: "#F8FAFC" }}>
                  <div style={{ width: 56, height: 56, borderRadius: "50%", background: "white", border: `2px solid ${i === 1 ? "#0F766E" : "#E2E8F0"}`, color: i === 1 ? "#0F766E" : "#64748B", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "24px", margin: "0 auto 24px auto", boxShadow: i === 1 ? "0 8px 16px rgba(15, 118, 110, 0.12)" : "none" }}>
                    {s.icon}
                  </div>
                  <div style={{ textAlign: "center" }}>
                    <span style={{ fontSize: "14px", fontWeight: 700, color: "#0F766E", display: "block", marginBottom: "8px" }}>STEP {s.step}</span>
                    <h3 style={{ fontSize: "20px", fontWeight: 700, color: "#0F172A", margin: "0 0 12px 0" }}>{s.title}</h3>
                    <p style={{ fontSize: "15px", color: "#64748B", lineHeight: 1.6, margin: 0, maxWidth: "280px", marginLeft: "auto", marginRight: "auto" }}>{s.desc}</p>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════
            CLINICAL IMPACT (BENEFITS)
      ════════════════════════════════════════ */}
      <section id="impact" style={{ padding: "100px 5%", background: "white" }}>
        <div style={{ maxWidth: 1280, margin: "0 auto" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "80px", alignItems: "center" }}>
            <Reveal>
              <div>
                <div className="section-label">Proven Impact</div>
                <h2 style={{ fontSize: "clamp(32px, 3.5vw, 44px)", fontWeight: 800, color: "#0F172A", margin: "0 0 20px 0", letterSpacing: "-0.02em", lineHeight: 1.1 }}>
                  Better outcomes for patients. <br/> Less burnout for doctors.
                </h2>
                <p style={{ fontSize: "17px", color: "#64748B", lineHeight: 1.6, margin: "0 0 40px 0" }}>
                  MedAI doesn't replace clinicians; it empowers them. By automating telemetry and highlighting high-risk patients instantly, your team can focus on what matters most: human care.
                </p>
                <div style={{ display: "flex", gap: "16px" }}>
                  <a href="/signup" className="btn-primary">Create Clinic Profile</a>
                </div>
              </div>
            </Reveal>

            <div className="benefits-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px" }}>
              {benefits.map((b, i) => (
                <Reveal key={b.label} delay={i * 80}>
                  <div style={{ padding: "32px 24px", background: "#F8FAFC", borderRadius: "16px", border: "1px solid #F1F5F9" }}>
                    <div style={{ fontSize: "40px", fontWeight: 800, color: "#0F766E", letterSpacing: "-0.03em", lineHeight: 1, marginBottom: "12px" }}>{b.metric}</div>
                    <div style={{ fontSize: "16px", fontWeight: 700, color: "#0F172A", marginBottom: "8px" }}>{b.label}</div>
                    <p style={{ margin: 0, fontSize: "14px", color: "#64748B", lineHeight: 1.5 }}>{b.desc}</p>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════
            FINAL CTA
      ════════════════════════════════════════ */}
      <section style={{ padding: "80px 5% 100px", background: "white" }}>
        <div style={{ maxWidth: 1000, margin: "0 auto" }}>
          <Reveal>
            <div style={{ background: "#0F172A", borderRadius: "24px", padding: "64px 48px", textAlign: "center", color: "white", position: "relative", overflow: "hidden" }}>
              <div style={{ position: "absolute", top: 0, right: 0, width: "300px", height: "300px", background: "radial-gradient(circle, rgba(13,148,136,0.3) 0%, transparent 70%)" }} />
              
              <div style={{ position: "relative", zIndex: 1 }}>
                <h2 style={{ fontSize: "clamp(32px, 4vw, 48px)", fontWeight: 800, margin: "0 0 16px 0", letterSpacing: "-0.02em" }}>
                  Modernize your practice today.
                </h2>
                <p style={{ fontSize: "18px", color: "#94A3B8", margin: "0 auto 40px auto", maxWidth: "600px", lineHeight: 1.6 }}>
                  Join thousands of healthcare providers using MedAI to deliver smarter, faster, and safer patient care.
                </p>
                <div style={{ display: "flex", gap: "16px", justifyContent: "center", flexWrap: "wrap" }}>
                  <a href="/signup" style={{ background: "white", color: "#0F172A", height: "52px", padding: "0 32px", borderRadius: "8px", fontWeight: 700, display: "inline-flex", alignItems: "center", textDecoration: "none", transition: "background 0.2s" }}
                    onMouseOver={e => e.target.style.background = "#F8FAFC"} onMouseOut={e => e.target.style.background = "white"}>
                    Get Started Free
                  </a>
                  <a href="/login" style={{ background: "transparent", color: "white", border: "1px solid rgba(255,255,255,0.3)", height: "52px", padding: "0 32px", borderRadius: "8px", fontWeight: 600, display: "inline-flex", alignItems: "center", textDecoration: "none", transition: "background 0.2s" }}
                    onMouseOver={e => e.target.style.background = "rgba(255,255,255,0.1)"} onMouseOut={e => e.target.style.background = "transparent"}>
                    Log In
                  </a>
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ── Clean Footer ── */}
      <footer style={{ borderTop: "1px solid #E2E8F0", padding: "40px 5%", background: "#F8FAFC" }}>
        <div style={{ maxWidth: 1280, margin: "0 auto", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "24px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <Activity size={20} color="#0F766E" strokeWidth={2.5} />
            <span style={{ fontSize: 18, fontWeight: 700, color: "#0F172A" }}>MedAI</span>
          </div>
          <p style={{ margin: 0, fontSize: "14px", color: "#64748B" }}>
            © 2026 MedAI Technologies. All rights reserved. HIPAA Compliant.
          </p>
          <div style={{ display: "flex", gap: "24px" }}>
            {["Privacy Policy", "Terms of Service", "Contact Support"].map(l => (
              <a key={l} href="#" style={{ fontSize: "14px", color: "#64748B", textDecoration: "none", fontWeight: 500, transition: "color 0.2s" }}
                onMouseOver={e => e.target.style.color = "#0F766E"}
                onMouseOut={e => e.target.style.color = "#64748B"}>{l}</a>
            ))}
          </div>
        </div>
      </footer>

    </div>
  );
}