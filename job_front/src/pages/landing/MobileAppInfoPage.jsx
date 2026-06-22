import { useNavigate } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import { motion } from 'framer-motion';
import {
  CheckCircle, Smartphone, Monitor, Briefcase,
  FileText, Search, Send, BarChart2, Bell, BookOpen,
  ArrowRight, Home,
} from 'lucide-react';

const MOBILE_URL = import.meta.env.VITE_MOBILE_APP_URL || 'https://example.com/mobile-app-demo';

/* ─── Animation variants ─────────────────────────────────── */
const container = {
  hidden:  {},
  visible: { transition: { staggerChildren: 0.1, delayChildren: 0.05 } },
};

const fadeUp = {
  hidden:  { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.55, ease: [0.16, 1, 0.3, 1] } },
};

const scaleIn = {
  hidden:  { opacity: 0, scale: 0.88 },
  visible: { opacity: 1, scale: 1, transition: { duration: 0.5, ease: [0.34, 1.56, 0.64, 1] } },
};

/* ─── Platform cards data ─────────────────────────────────── */
const platforms = [
  {
    icon: Monitor,
    label: 'Web Platform',
    audience: 'Companies & Admins',
    accentColor: 'var(--clr-info-a10)',
    accentBg: 'rgba(64,119,209,0.08)',
    accentBorder: 'rgba(64,119,209,0.25)',
    features: [
      'Manage company profiles',
      'Post & manage job openings',
      'Review applicants & CVs',
      'Manage members & permissions',
      'Platform administration',
    ],
  },
  {
    icon: Smartphone,
    label: 'Mobile App',
    audience: 'Job Seekers',
    accentColor: 'var(--primary)',
    accentBg: 'var(--primary-light)',
    accentBorder: 'rgba(5,97,27,0.3)',
    highlight: true,
    features: [
      'Build & manage your profile',
      'Upload and update CVs',
      'Discover job opportunities',
      'Apply for positions',
      'Track your applications',
      'Receive company invitations',
      'View course recommendations',
    ],
  },
];

/* ─── Mobile feature pill ─────────────────────────────────── */
const mobileFeatures = [
  { icon: FileText,  label: 'CV Management'       },
  { icon: Search,    label: 'Job Discovery'        },
  { icon: Send,      label: 'Easy Apply'           },
  { icon: BarChart2, label: 'Application Tracking' },
  { icon: Bell,      label: 'Invitations'          },
  { icon: BookOpen,  label: 'Course Suggestions'   },
];

/* ════════════════════════════════════════════════════════════ */
export function MobileAppInfoPage() {
  const navigate = useNavigate();

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ background: 'var(--bg-page)' }}
    >
      {/* ── Minimal header ─────────────────────────────────── */}
      <header
        className="flex items-center justify-between px-6 py-4 shrink-0"
        style={{
          background: 'var(--bg-card)',
          borderBottom: '1px solid var(--border-default)',
        }}
      >
        <div className="flex items-center gap-2.5">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{ background: 'var(--primary)' }}
          >
            <Briefcase size={15} color="#fff" />
          </div>
          <span className="font-bold text-lg" style={{ color: 'var(--text-primary)' }}>
            JobPortal
          </span>
        </div>

        <motion.button
          onClick={() => navigate('/')}
          className="flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 rounded-lg"
          style={{ color: 'var(--text-muted)', border: '1px solid var(--border-default)' }}
          whileHover={{ background: 'var(--bg-hover)' }}
          whileTap={{ scale: 0.97 }}
        >
          <Home size={14} />
          Back to Home
        </motion.button>
      </header>

      {/* ── Main content ───────────────────────────────────── */}
      <main className="flex-1 flex flex-col items-center px-4 py-14 sm:py-20">
        <motion.div
          className="w-full max-w-4xl space-y-14"
          variants={container}
          initial="hidden"
          animate="visible"
        >

          {/* ════════════════════════════════════════════════ */}
          {/* WELCOME BANNER                                  */}
          {/* ════════════════════════════════════════════════ */}
          <motion.div variants={fadeUp} className="text-center">
            {/* Success icon */}
            <motion.div
              className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6"
              style={{ background: 'var(--status-active-bg)' }}
              initial={{ scale: 0, rotate: -30 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ delay: 0.1, duration: 0.55, ease: [0.34, 1.56, 0.64, 1] }}
            >
              <CheckCircle size={38} style={{ color: 'var(--clr-success-a0)' }} />
            </motion.div>

            <h1
              className="text-3xl sm:text-4xl font-extrabold mb-3 tracking-tight"
              style={{ color: 'var(--text-primary)' }}
            >
              Welcome to JobPortal
            </h1>
            <p className="text-base sm:text-lg" style={{ color: 'var(--text-muted)' }}>
              Your account has been created successfully.
            </p>
          </motion.div>

          {/* ════════════════════════════════════════════════ */}
          {/* PLATFORM EXPLANATION                            */}
          {/* ════════════════════════════════════════════════ */}
          <motion.div variants={fadeUp}>
            <p className="text-center text-sm sm:text-base max-w-2xl mx-auto mb-8 leading-relaxed"
              style={{ color: 'var(--text-secondary)' }}>
              JobPortal is designed with a dual-platform experience. Companies and administrators
              manage recruitment through the web dashboard, while job seekers use the mobile
              application to create profiles, upload CVs, discover opportunities, apply for jobs,
              track applications, and receive recommendations.
            </p>

            {/* Platform cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              {platforms.map((p) => (
                <motion.div
                  key={p.label}
                  className="rounded-2xl p-6"
                  style={{
                    background: p.highlight ? p.accentBg : 'var(--bg-card)',
                    border: `1.5px solid ${p.highlight ? p.accentBorder : 'var(--border-default)'}`,
                    boxShadow: p.highlight
                      ? '0 8px 32px rgba(5,97,27,0.10)'
                      : '0 2px 8px rgba(0,0,0,0.04)',
                  }}
                  whileHover={{
                    y: -4,
                    boxShadow: `0 16px 40px rgba(0,0,0,0.09)`,
                    transition: { type: 'spring', stiffness: 320, damping: 20 },
                  }}
                >
                  {/* Icon + label */}
                  <div className="flex items-center gap-3 mb-4">
                    <div
                      className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
                      style={{ background: p.accentBg, border: `1px solid ${p.accentBorder}` }}
                    >
                      <p.icon size={22} style={{ color: p.accentColor }} />
                    </div>
                    <div>
                      <p className="font-bold text-sm" style={{ color: 'var(--text-primary)' }}>
                        {p.label}
                      </p>
                      <p className="text-xs font-medium" style={{ color: p.accentColor }}>
                        {p.audience}
                      </p>
                    </div>
                    {p.highlight && (
                      <span
                        className="ml-auto text-xs font-semibold px-2 py-0.5 rounded-full"
                        style={{ background: 'var(--primary)', color: '#fff' }}
                      >
                        Your platform
                      </span>
                    )}
                  </div>

                  {/* Feature list */}
                  <ul className="space-y-2">
                    {p.features.map((f) => (
                      <li key={f} className="flex items-center gap-2 text-sm"
                        style={{ color: 'var(--text-secondary)' }}>
                        <div
                          className="w-1.5 h-1.5 rounded-full shrink-0"
                          style={{ background: p.accentColor }}
                        />
                        {f}
                      </li>
                    ))}
                  </ul>
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* ════════════════════════════════════════════════ */}
          {/* QR CODE SECTION                                 */}
          {/* ════════════════════════════════════════════════ */}
          <motion.div variants={scaleIn}>
            <div
              className="rounded-2xl overflow-hidden"
              style={{
                background: 'var(--bg-card)',
                border: '1px solid var(--border-default)',
                boxShadow: '0 4px 24px rgba(0,0,0,0.07)',
              }}
            >
              {/* Card header */}
              <div
                className="px-6 py-4 flex items-center gap-3"
                style={{ borderBottom: '1px solid var(--border-default)' }}
              >
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center"
                  style={{ background: 'var(--primary-light)' }}
                >
                  <Smartphone size={18} style={{ color: 'var(--primary)' }} />
                </div>
                <div>
                  <p className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>
                    Get the Mobile App
                  </p>
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                    Available now — scan to open
                  </p>
                </div>
              </div>

              {/* Card body */}
              <div className="px-6 py-8 flex flex-col sm:flex-row items-center gap-8 sm:gap-12">

                {/* QR code */}
                <motion.div
                  className="shrink-0"
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.35, duration: 0.5, ease: [0.34, 1.56, 0.64, 1] }}
                >
                  <div
                    className="rounded-2xl p-4 inline-block"
                    style={{
                      background: '#fff',
                      boxShadow: '0 4px 24px rgba(0,0,0,0.10)',
                      border: '2px solid var(--border-default)',
                    }}
                  >
                    <QRCodeSVG
                      value={MOBILE_URL}
                      size={164}
                      bgColor="#ffffff"
                      fgColor="#064e3b"
                      level="M"
                      style={{ display: 'block', borderRadius: '8px' }}
                    />
                  </div>
                </motion.div>

                {/* Right side text */}
                <div className="flex-1 text-center sm:text-left space-y-4">
                  <p
                    className="text-sm leading-relaxed"
                    style={{ color: 'var(--text-secondary)' }}
                  >
                    Scan the QR code to continue with the Job Seeker mobile application. Start
                    building your profile, upload your CV, and discover thousands of opportunities.
                  </p>

                  {/* Feature pills */}
                  <div className="flex flex-wrap gap-2 justify-center sm:justify-start">
                    {mobileFeatures.map((f) => (
                      <div
                        key={f.label}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium"
                        style={{
                          background: 'var(--primary-light)',
                          color: 'var(--primary)',
                          border: '1px solid rgba(5,97,27,0.15)',
                        }}
                      >
                        <f.icon size={11} />
                        {f.label}
                      </div>
                    ))}
                  </div>

                  {/* URL hint */}
                  <p className="text-xs break-all" style={{ color: 'var(--text-muted)' }}>
                    {MOBILE_URL}
                  </p>
                </div>
              </div>

              {/* Card footer — actions */}
              <div
                className="px-6 py-4 flex flex-col sm:flex-row items-center gap-3"
                style={{ borderTop: '1px solid var(--border-default)', background: 'var(--bg-page)' }}
              >
                {/* Primary */}
                <motion.a
                  href={MOBILE_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl text-sm font-semibold"
                  style={{
                    background: 'var(--primary)',
                    color: '#fff',
                    textDecoration: 'none',
                  }}
                  whileHover={{ scale: 1.03, boxShadow: '0 6px 20px rgba(5,97,27,0.35)' }}
                  whileTap={{ scale: 0.97 }}
                  transition={{ type: 'spring', stiffness: 380, damping: 20 }}
                >
                  <Smartphone size={16} />
                  Open Mobile App
                  <ArrowRight size={15} />
                </motion.a>

                {/* Secondary */}
                <motion.button
                  onClick={() => navigate('/')}
                  className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl text-sm font-medium"
                  style={{
                    color: 'var(--text-secondary)',
                    border: '1px solid var(--border-default)',
                  }}
                  whileHover={{ background: 'var(--bg-hover)' }}
                  whileTap={{ scale: 0.97 }}
                >
                  <Home size={15} />
                  Back to Home
                </motion.button>
              </div>
            </div>
          </motion.div>

        </motion.div>
      </main>

      {/* ── Footer ─────────────────────────────────────────── */}
      <footer
        className="py-5 text-center text-xs"
        style={{ borderTop: '1px solid var(--border-default)', color: 'var(--text-muted)' }}
      >
        © {new Date().getFullYear()} JobPortal. All rights reserved.
      </footer>
    </div>
  );
}
