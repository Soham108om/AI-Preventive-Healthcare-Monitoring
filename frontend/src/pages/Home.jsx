import { useState, useEffect, useRef } from "react";
import { Activity, ShieldCheck, Zap, ArrowRight, Cloud, HeartPulse, Plus, Shield, Stethoscope, ChevronRight, Check } from "lucide-react";

/* ─── DNA Helix Canvas (Refined Background) ─── */
function DNAHelix({ style }) {
  const canvasRef = useRef(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    let raf, t = 0;
    const resize = () => {
      canvas.width = canvas.offsetWidth * window.devicePixelRatio;
      canvas.height = canvas.offsetHeight * window.devicePixelRatio;
      ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    };
    resize();
    window.addEventListener("resize", resize);
    const NODES = 75, SPEED = 0.003;
    function draw() {
      const W = canvas.offsetWidth, H = canvas.offsetHeight;
      ctx.clearRect(0, 0, W, H);
      const cx = W * 0.5, AMP = W * 0.18, step = H / (NODES - 1);
      const s1 = [], s2 = [];
      for (let i = 0; i < NODES; i++) {
        const angle = (i / NODES) * Math.PI * 6 + t, y = i * step;
        s1.push({ x: cx + Math.cos(angle) * AMP, y, z: Math.sin(angle) });
        s2.push({ x: cx + Math.cos(angle + Math.PI) * AMP, y, z: Math.sin(angle + Math.PI) });
      }
      const drawBackbone = (pts, col) => {
        ctx.beginPath();
        for (let i = 0; i < pts.length - 1; i++) {
          const p = pts[i], d = (p.z + 1) / 2;
          ctx.lineTo(p.x, p.y);
          ctx.strokeStyle = col + Math.round((0.1 + d * 0.25) * 255).toString(16).padStart(2, "0");
          ctx.lineWidth = 1 + d * 2.5;
        }
        ctx.stroke();
      };

      drawBackbone(s1, "#0EA5E9");
      drawBackbone(s2, "#3B82F6");
      t += SPEED; raf = requestAnimationFrame(draw);
    }
    draw();
    return () => { cancelAnimationFrame(raf); window.removeEventListener("resize", resize); };
  }, []);
  return <canvas ref={canvasRef} style={{ width: "100%", height: "100%", display: "block", ...style }} />;
}

export default function Home() {
  const [pulse, setPulse] = useState(74);

  useEffect(() => {
    const iv = setInterval(() => setPulse(72 + Math.round(Math.sin(Date.now() / 1200) * 3)), 1000);
    return () => clearInterval(iv);
  }, []);

  return (
    <div style={{ minHeight: "100vh", background: "#FAFCFF", color: "#0F172A", overflowX: "hidden", fontFamily: "'Inter', sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap');
        
        * { box-sizing: border-box; }
        body { margin: 0; padding: 0; }

        .text-gradient {
          background: linear-gradient(135deg, #2563EB 0%, #06B6D4 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }

        .bg-grid {
          position: absolute;
          inset: 0;
          background-size: 40px 40px;
          background-image: linear-gradient(to right, rgba(0, 0, 0, 0.03) 1px, transparent 1px),
                            linear-gradient(to bottom, rgba(0, 0, 0, 0.03) 1px, transparent 1px);
          mask-image: linear-gradient(to bottom, black 40%, transparent 100%);
          -webkit-mask-image: linear-gradient(to bottom, black 40%, transparent 100%);
          pointer-events: none;
          z-index: 0;
        }

        .navbar {
          position: fixed;
          top: 24px;
          left: 50%;
          transform: translateX(-50%);
          width: 90%;
          max-width: 1200px;
          height: 72px;
          background: rgba(255, 255, 255, 0.7);
          backdrop-filter: blur(24px);
          -webkit-backdrop-filter: blur(24px);
          border: 1px solid rgba(255, 255, 255, 0.5);
          box-shadow: 0 4px 24px -8px rgba(15, 23, 42, 0.05), inset 0 0 0 1px rgba(255,255,255,0.2);
          border-radius: 100px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 0 16px 0 32px;
          z-index: 1000;
        }

        .nav-links a {
          text-decoration: none;
          color: #475569;
          font-weight: 500;
          font-size: 15px;
          transition: color 0.2s;
        }
        .nav-links a:hover { color: #0F172A; }

        .btn-primary {
          height: 48px;
          padding: 0 28px;
          border-radius: 100px;
          background: #0F172A;
          color: white;
          font-weight: 600;
          font-size: 15px;
          border: none;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          cursor: pointer;
          transition: all 0.3s ease;
          box-shadow: 0 4px 12px rgba(15, 23, 42, 0.15);
          text-decoration: none;
        }
        .btn-primary:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 16px rgba(15, 23, 42, 0.25);
          background: #1E293B;
        }

        .btn-secondary {
          height: 48px;
          padding: 0 28px;
          border-radius: 100px;
          background: white;
          color: #0F172A;
          font-weight: 600;
          font-size: 15px;
          border: 1px solid #E2E8F0;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          cursor: pointer;
          transition: all 0.3s ease;
          text-decoration: none;
        }
        .btn-secondary:hover {
          border-color: #CBD5E1;
          background: #F8FAFC;
        }

        .feature-box {
          background: white;
          border: 1px solid #F1F5F9;
          border-radius: 24px;
          padding: 32px;
          transition: all 0.3s ease;
          box-shadow: 0 4px 20px -10px rgba(0,0,0,0.03);
        }
        .feature-box:hover {
          transform: translateY(-4px);
          box-shadow: 0 12px 30px -10px rgba(0,0,0,0.08);
          border-color: #E2E8F0;
        }

        .glass-panel {
          background: rgba(255, 255, 255, 0.6);
          backdrop-filter: blur(40px);
          -webkit-backdrop-filter: blur(40px);
          border: 1px solid rgba(255,255,255,0.8);
          box-shadow: 0 24px 48px -12px rgba(15, 23, 42, 0.08), inset 0 1px 1px rgba(255,255,255,0.6);
        }
        
        @keyframes pulse-dot {
          0% { box-shadow: 0 0 0 0 rgba(34, 197, 94, 0.4); }
          70% { box-shadow: 0 0 0 10px rgba(34, 197, 94, 0); }
          100% { box-shadow: 0 0 0 0 rgba(34, 197, 94, 0); }
        }
        .status-dot {
          width: 8px;
          height: 8px;
          background-color: #22C55E;
          border-radius: 50%;
          animation: pulse-dot 2s infinite;
        }

        .hero-section {
          padding-top: 180px;
          padding-bottom: 120px;
          max-width: 1280px;
          margin: 0 auto;
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 40px;
          align-items: center;
          position: relative;
          z-index: 10;
        }

        @media (max-width: 1024px) {
          .hero-section { grid-template-columns: 1fr; text-align: center; padding-top: 140px; }
          .hero-buttons { justify-content: center; }
          .dashboard-container { margin: 0 auto; margin-top: 40px; }
          .nav-links { display: none; }
        }
      `}</style>


      <div className="bg-grid"></div>
      <div style={{ position: "absolute", top: "-15%", right: "0", width: "800px", height: "800px", background: "radial-gradient(circle, rgba(56, 189, 248, 0.12) 0%, rgba(255,255,255,0) 60%)", pointerEvents: "none", zIndex: 0 }} />
      <div style={{ position: "absolute", bottom: "10%", left: "-10%", width: "600px", height: "600px", background: "radial-gradient(circle, rgba(59, 130, 246, 0.1) 0%, rgba(255,255,255,0) 60%)", pointerEvents: "none", zIndex: 0 }} />

      <div style={{ position: "absolute", right: 0, top: 0, width: "50%", height: "100vh", zIndex: 1, pointerEvents: "none" }}>
        <DNAHelix style={{ opacity: 0.15, filter: "blur(1px)" }} />
      </div>

      {/* ── Fixed Navbar ── */}
      <nav className="navbar">
        <div style={{ display: "flex", alignItems: "center", gap: "12px", cursor: "pointer" }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: "linear-gradient(135deg, #2563EB 0%, #0EA5E9 100%)", display: "flex", justifyContent: "center", alignItems: "center", boxShadow: "0 4px 12px rgba(37,99,235,0.3)" }}>
            <Activity size={20} color="white" strokeWidth={2.5} />
          </div>
          <span style={{ fontSize: 22, fontWeight: 800, color: "#0F172A", letterSpacing: "-0.02em" }}>MedAI</span>
        </div>

        {/* Restored Original Navigation Links */}
        <div className="nav-links" style={{ display: "flex", gap: "40px" }}>
          <a href="/services">Medical Services</a>
          <a href="/technology">Our Technology</a>
          <a href="/hospitals">Partner Hospitals</a>
        </div>

        {/* Restored Original Authentication Routes */}
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <a href="/login" style={{ textDecoration: "none", color: "#0F172A", fontWeight: 600, fontSize: 15, padding: "8px 16px" }}>Log In</a>
          <a href="/signup" className="btn-primary" style={{ height: "40px", padding: "0 20px", fontSize: "14px", boxShadow: "none" }}>
            Sign Up
          </a>
        </div>
      </nav>

      <main className="hero-section" style={{ padding: "180px 24px 120px 24px" }}>

        {/* Left Content */}
        <div style={{ maxWidth: "600px" }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: "8px", padding: "6px 16px", borderRadius: "100px", background: "rgba(255,255,255,0.6)", border: "1px solid rgba(226, 232, 240, 0.8)", marginBottom: "32px", backdropFilter: "blur(12px)" }}>
            <span className="status-dot"></span>
            <span style={{ fontSize: "13px", fontWeight: 600, color: "#475569", letterSpacing: "0.02em" }}>System Status: Operational</span>
          </div>

          <h1 style={{ fontSize: "clamp(52px, 6vw, 84px)", fontWeight: 800, lineHeight: 1.05, letterSpacing: "-0.04em", margin: "0 0 24px 0", color: "#0F172A" }}>
            The intelligent layer for <span className="text-gradient">modern care.</span>
          </h1>

          <p style={{ fontSize: "20px", color: "#64748B", lineHeight: 1.6, margin: "0 0 44px 0", fontWeight: 400 }}>
            MedAI provides a seamless ecosystem for real-time health monitoring and predictive triage, ensuring patients receive care exactly when they need it.
          </p>

          <div className="hero-buttons" style={{ display: "flex", gap: "16px", flexWrap: "wrap", alignItems: "center" }}>
            <a href="/signup" className="btn-primary" style={{ height: "56px", padding: "0 32px", fontSize: "16px" }}>
              Get Started <ArrowRight size={18} />
            </a>
            <a href="/services" className="btn-secondary" style={{ height: "56px", padding: "0 32px", fontSize: "16px" }}>
              Explore Platform
            </a>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "16px", marginTop: "48px" }}>
            <div style={{ display: "flex" }}>
              {[1, 2, 3, 4].map((i) => (
                <div key={i} style={{ width: 36, height: 36, borderRadius: "50%", border: "2px solid white", marginLeft: i === 1 ? 0 : -12, overflow: "hidden", zIndex: 10 - i }}>
                  <img src={`https://i.pravatar.cc/100?img=${i + 20}`} alt="user" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                </div>
              ))}
            </div>
            <p style={{ margin: 0, fontSize: "14px", color: "#64748B", fontWeight: 500 }}>
              Trusted by 10,000+ medical professionals
            </p>
          </div>
        </div>

        {/* Right Dashboard Visual */}
        <div className="dashboard-container" style={{ position: "relative", width: "100%", maxWidth: "560px", justifySelf: "end" }}>

          <div className="glass-panel" style={{ borderRadius: "32px", padding: "32px", display: "flex", flexDirection: "column", gap: "24px", position: "relative", zIndex: 2 }}>

            <div style={{ background: "white", padding: "20px", borderRadius: "20px", display: "flex", alignItems: "center", gap: "16px", boxShadow: "0 4px 12px rgba(0,0,0,0.02)" }}>
              <img src="https://i.pravatar.cc/150?u=sarah" style={{ width: "64px", height: "64px", borderRadius: "18px", objectFit: "cover", backgroundColor: "#F1F5F9" }} alt="Sarah Jenkins" />
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
                  <h3 style={{ margin: 0, fontSize: "20px", fontWeight: 700, color: "#0F172A", letterSpacing: "-0.01em" }}>Sarah Jenkins</h3>
                  <div style={{ background: "#EFF6FF", color: "#2563EB", fontSize: "12px", fontWeight: 700, padding: "4px 8px", borderRadius: "6px" }}>ID: 8842</div>
                </div>
                <p style={{ margin: 0, fontSize: "14px", color: "#64748B", fontWeight: 500 }}>Cardiology Outpatient</p>
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>

              <div style={{ background: "white", borderRadius: "24px", padding: "24px", display: "flex", flexDirection: "column", gap: "24px", border: "1px solid #F1F5F9", boxShadow: "0 4px 12px rgba(0,0,0,0.02)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div style={{ width: 40, height: 40, borderRadius: 12, background: "#FEF2F2", color: "#EF4444", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <HeartPulse size={20} strokeWidth={2.5} />
                  </div>
                  <span style={{ fontSize: "13px", fontWeight: 600, color: "#94A3B8" }}>Real-time</span>
                </div>
                <div>
                  <p style={{ margin: "0 0 4px 0", fontSize: "14px", color: "#64748B", fontWeight: 600 }}>Heart Rate</p>
                  <div style={{ display: "flex", alignItems: "baseline", gap: "4px" }}>
                    <span style={{ fontSize: "56px", fontWeight: 700, color: "#0F172A", lineHeight: 1, letterSpacing: "-0.03em" }}>{pulse}</span>
                    <span style={{ fontSize: "16px", fontWeight: 600, color: "#94A3B8" }}>bpm</span>
                  </div>
                </div>
              </div>

              <div style={{ background: "linear-gradient(135deg, #0F172A 0%, #1E293B 100%)", borderRadius: "24px", padding: "24px", display: "flex", flexDirection: "column", gap: "24px", color: "white", boxShadow: "0 12px 24px -8px rgba(15,23,42,0.4)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div style={{ width: 40, height: 40, borderRadius: 12, background: "rgba(255,255,255,0.1)", color: "#38BDF8", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <ShieldCheck size={20} strokeWidth={2.5} />
                  </div>
                  <span style={{ fontSize: "13px", fontWeight: 600, color: "rgba(255,255,255,0.6)" }}>Excellent</span>
                </div>
                <div>
                  <p style={{ margin: "0 0 4px 0", fontSize: "14px", color: "rgba(255,255,255,0.7)", fontWeight: 600 }}>Vital Score</p>
                  <div style={{ display: "flex", alignItems: "baseline", gap: "4px" }}>
                    <span style={{ fontSize: "56px", fontWeight: 700, color: "white", lineHeight: 1, letterSpacing: "-0.03em" }}>98</span>
                    <span style={{ fontSize: "16px", fontWeight: 600, color: "rgba(255,255,255,0.6)" }}>%</span>
                  </div>
                </div>
              </div>

            </div>

            <div style={{ background: "#F8FAFC", borderRadius: "20px", padding: "24px", display: "flex", gap: "16px", border: "1px solid #F1F5F9" }}>
              <div style={{ width: "40px", height: "40px", flexShrink: 0, borderRadius: "12px", background: "#DBEAFE", color: "#2563EB", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Zap size={20} strokeWidth={2.5} />
              </div>
              <div>
                <h4 style={{ margin: "0 0 6px 0", fontSize: "15px", fontWeight: 700, color: "#0F172A" }}>AI Clinical Insight</h4>
                <p style={{ margin: 0, fontSize: "14px", color: "#64748B", lineHeight: 1.5, fontWeight: 500 }}>
                  Patient vitals are stable and within excellent clinical ranges. Predictive analysis suggests continued stability for the next 12 hours.
                </p>
              </div>
            </div>

          </div>

          <div style={{ position: "absolute", top: "40px", right: "-30px", background: "white", borderRadius: "16px", padding: "12px 20px", display: "flex", alignItems: "center", gap: "10px", boxShadow: "0 10px 30px -10px rgba(0,0,0,0.1)", zIndex: 10, border: "1px solid #F1F5F9" }}>
            <Check size={18} color="#22C55E" />
            <span style={{ fontSize: "13px", fontWeight: 600, color: "#0F172A" }}>Records Synced</span>
          </div>

        </div>

      </main>

      {/* ── Features Section ── */}
      <section style={{ maxWidth: "1280px", margin: "0 auto", padding: "40px 24px 120px 24px", position: "relative", zIndex: 10 }}>

        <div style={{ marginBottom: "60px" }}>
          <h2 style={{ fontSize: "36px", fontWeight: 800, color: "#0F172A", margin: "0 0 16px 0", letterSpacing: "-0.02em" }}>Built for modern healthcare.</h2>
          <p style={{ fontSize: "18px", color: "#64748B", maxWidth: "600px", margin: 0 }}>Discover the infrastructure that powers real-time medical insights and seamless patient monitoring.</p>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "32px" }}>
          {[
            { icon: <Zap size={24} strokeWidth={2} />, color: "#F59E0B", bg: "#FEF3C7", title: "Edge Processing", desc: "Proprietary protocols for immediate data synchronization across all clinical platforms." },
            { icon: <Cloud size={24} strokeWidth={2} />, color: "#3B82F6", bg: "#DBEAFE", title: "Cloud Integration", desc: "Hybrid-cloud infrastructure designed for secure, large-scale medical data management." },
            { icon: <Shield size={24} strokeWidth={2} />, color: "#10B981", bg: "#D1FAE5", title: "Patient Privacy", desc: "Rigorous HIPAA-compliant encryption standards protect patient information at every step." }
          ].map(item => (
            <div key={item.title} className="feature-box">
              <div style={{ width: 56, height: 56, borderRadius: 16, background: item.bg, color: item.color, display: "flex", justifyContent: "center", alignItems: "center", marginBottom: "24px" }}>
                {item.icon}
              </div>
              <h4 style={{ fontSize: "20px", fontWeight: 700, marginBottom: "12px", color: "#0F172A" }}>{item.title}</h4>
              <p style={{ color: "#64748B", lineHeight: 1.6, fontSize: "15px", margin: 0 }}>{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

    </div>
  );
}