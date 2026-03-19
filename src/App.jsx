import React, { createContext, useContext, Suspense, useRef, useState, useEffect, useCallback } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { PerspectiveCamera, ContactShadows, useGLTF, Environment, useProgress, Float } from '@react-three/drei'
import { EffectComposer, Bloom } from '@react-three/postprocessing'
import { motion, AnimatePresence } from 'framer-motion'
import { useToast } from './Toast.jsx'
import HUDOverlay from './HUDOverlay.jsx'
import WindParticles from './Particles.jsx'

// Inline lerp to avoid deprecated THREE.MathUtils
const lerp = (a, b, t) => a + (b - a) * t

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001'

const ReduceMotionContext = createContext(false)
const MouseContext = createContext({ x: 0, y: 0 })
const PhaseContext = createContext({ active: null, blueprintMode: false })

// --- 1. LOADING SCREEN COMPONENT ---
const PRELOAD_LOGS = ['CHECKING_TURBINES...', 'CALIBRATING_SENSORS...', 'LOADING_FUSELAGE...', 'VERIFYING_WINGS...', 'INIT_AVIONICS...', 'BUFFERING_GEOMETRY...']
function LoadingScreen({ onSkip, reduceMotion }) {
    const { progress } = useProgress()
    const [logIndex, setLogIndex] = useState(0)
    useEffect(() => {
        const idx = Math.min(Math.floor((progress / 100) * PRELOAD_LOGS.length), PRELOAD_LOGS.length - 1)
        setLogIndex(idx)
    }, [progress])
    return (
        <motion.div
            key="loader-container"
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: reduceMotion ? 0.2 : 0.8 }}
            className="fixed inset-0 z-[100] bg-[#02060a] flex flex-col items-center justify-center font-mono"
        >
            <div className="w-64 space-y-4">
                <div className="flex justify-between items-end">
                    <div>
                        <p className={`text-[10px] text-cyan-500 font-black tracking-[0.3em] ${reduceMotion ? '' : 'animate-pulse'}`}>[ INITIALIZING_CAD_MODELS ]</p>
                        <p className="text-white text-xs font-bold uppercase tracking-tighter">Uplink: MITAERO_SYSTEMS</p>
                    </div>
                    <p className="text-cyan-400 text-xs font-black italic">{Math.round(progress)}%</p>
                </div>
                <div className="h-[2px] w-full bg-white/5 relative overflow-hidden">
                    {reduceMotion ? (
                        <div className="h-full bg-cyan-500 shadow-[0_0_15px_#00f2ff]" style={{ width: `${progress}%` }} />
                    ) : (
                        <motion.div
                            className="h-full bg-cyan-500 shadow-[0_0_15px_#00f2ff]"
                            initial={{ width: 0 }}
                            animate={{ width: `${progress}%` }}
                        />
                    )}
                </div>
                <div className="h-12 overflow-hidden text-[7px] text-gray-500 font-bold uppercase tracking-[0.2em]">
                    {PRELOAD_LOGS.slice(0, logIndex + 1).map((log, i) => (
                        <div key={i} className={i === logIndex ? 'text-cyan-500' : ''}>{log} {i === logIndex ? 'OK' : '✓'}</div>
                    ))}
                </div>
            </div>
            <button onClick={onSkip} className="absolute bottom-10 right-10 text-[10px] text-gray-600 hover:text-cyan-400 transition-colors uppercase tracking-[0.4em] border border-white/5 px-4 py-2 hover:border-cyan-500/50">
                [ SKIP_BOOT_SEQUENCE ]
            </button>
        </motion.div>
    )
}

// --- 2a. STYLIZED LOADING FALLBACK (Scanning wireframe) ---
function ScanningWireframe() {
    const meshRef = useRef()
    const elapsedRef = useRef(0)
    useFrame((_, delta) => {
        if (meshRef.current) {
            elapsedRef.current += delta
            meshRef.current.rotation.y = elapsedRef.current * 0.25
        }
    })
    return (
        <group position={[3, -0.5, 0]} scale={2.8}>
            <mesh ref={meshRef}>
                <boxGeometry args={[1.2, 0.6, 2]} />
                <meshBasicMaterial wireframe color="#00f2ff" transparent opacity={0.6} />
            </mesh>
        </group>
    )
}

// --- 2. VIRTUAL GRID (glowing cyan wireframe, pulses) ---
function VirtualGrid() {
    const ref = useRef()
    const reduceMotion = useContext(ReduceMotionContext)
    useEffect(() => {
        if (ref.current) {
            ref.current.material.opacity = 0.2
            ref.current.material.transparent = true
        }
    }, [])
    const tRef = useRef(0)
    useFrame((_, delta) => {
        if (ref.current?.material && !reduceMotion) {
            tRef.current += delta
            ref.current.material.opacity = 0.15 + Math.sin(tRef.current * 0.5) * 0.08
        }
    })
    return (
        <group position={[3, -1.2, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <gridHelper ref={ref} args={[24, 24, '#00f2ff', '#00f2ff44']} />
        </group>
    )
}

// --- 2. 3D AIRCRAFT COMPONENT ---
function CADAssembly() {
    const group = useRef()
    const { mouse } = useThree()
    const reduceMotion = useContext(ReduceMotionContext)
    const { blueprintMode } = useContext(PhaseContext)
    const { scene } = useGLTF('/aircraft.glb', true)

    useFrame((_, delta) => {
        if (!group.current || reduceMotion) return
        const smoothing = 1 - Math.exp(-1.5 * delta)
        const targetY = (mouse.x * Math.PI) / 4
        const targetX = (mouse.y * -Math.PI) / 5
        group.current.rotation.y = lerp(group.current.rotation.y, targetY, smoothing)
        group.current.rotation.x = lerp(group.current.rotation.x, targetX, smoothing)
    })

    useEffect(() => {
        scene.traverse((child) => {
            if (child.isMesh && child.material) {
                const mats = Array.isArray(child.material) ? child.material : [child.material]
                mats.forEach((mat) => { mat.wireframe = blueprintMode })
            }
        })
    }, [blueprintMode, scene])

    return (
        <Float speed={1.5} rotationIntensity={0} floatIntensity={0.4}>
            <group ref={group} scale={2.8} position={[3, -0.5, 0]}>
                <primitive object={scene} />
            </group>
        </Float>
    )
}

// Afterburner glow - pulse behind aircraft
function AfterburnerLight() {
    const ref = useRef()
    useFrame((state) => {
        if (ref.current) {
            const pulse = 0.8 + Math.sin(state.clock.elapsedTime * 3) * 0.4
            ref.current.intensity = pulse * 4
        }
    })
    return <pointLight ref={ref} position={[1.5, -0.5, -1.5]} color="#FF9500" intensity={4} distance={8} decay={2} />
}

function SceneContent() {
    const reduceMotion = useContext(ReduceMotionContext)
    return (
        <>
            <Suspense fallback={<ScanningWireframe />}>
                <VirtualGrid />
                <CADAssembly />
                <AfterburnerLight />
                {!reduceMotion && <WindParticles count={60} />}
                <Environment preset="night" />
                <ContactShadows position={[0, -4, 0]} opacity={0.3} scale={20} blur={3} far={10} />
            </Suspense>
            <EffectComposer>
                <Bloom luminanceThreshold={0.2} luminanceSmoothing={0.9} intensity={0.8} mipmapBlur />
            </EffectComposer>
        </>
    )
}

// --- 2b. NAV BAR ---
function NavBar({ onRegisterClick, regCount, reduceMotion }) {
    const [mobileOpen, setMobileOpen] = useState(false)
    const [bracketHover, setBracketHover] = useState(false)
    return (
        <>
            <nav className="absolute top-0 w-full p-4 md:p-6 flex justify-between items-center z-50 bg-black/30 backdrop-blur-xl border-b border-white/20 glass-noise rounded-b-lg">
                <div className="flex items-center gap-3 md:gap-6 pointer-events-auto">
                    <img src="gamesta_aero-removebg.png" className="w-10 h-10 md:w-12 md:h-12 object-contain drop-shadow-[0_0_10px_#00f2ff]" alt="Logo" />
                    <div className="min-w-0">
                        <p className="text-[9px] md:text-[10px] font-black tracking-widest text-white uppercase italic truncate">MITAOE AERO CLUB</p>
                        <p className="text-[7px] md:text-[8px] text-cyan-400 tracking-[0.2em] md:tracking-[0.3em] font-bold uppercase italic hidden xs:block">Technical Sponsor: ANSYS</p>
                    </div>
                </div>
                <div className="flex items-center gap-4 md:gap-8 pointer-events-auto">
                    <div className="text-right hidden sm:block border-r border-white/10 pr-4 md:pr-6">
                        <p className="text-[7px] md:text-[8px] text-industrial-silver font-bold tracking-widest uppercase italic">// SQUAD_STRENGTH</p>
                        <p className="text-lg md:text-xl font-black text-white leading-none tracking-tighter italic">{regCount.toString().padStart(2, '0')}</p>
                    </div>
                    <button
                        onClick={() => { setMobileOpen(false); onRegisterClick() }}
                        className={`relative bg-cyan-500 hover:bg-white hover:text-black text-black px-6 md:px-10 py-2 md:py-2.5 font-black skew-x-[-12deg] transition-all uppercase text-xs md:text-sm overflow-hidden group register-scan-line ${!reduceMotion ? 'chromatic-hover' : ''}`}
                    >
                        {!reduceMotion && <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />}
                        <span className="skew-x-[12deg] inline-block tracking-tighter italic relative z-10">REGISTER</span>
                    </button>
                    <button
                        onClick={() => setMobileOpen(!mobileOpen)}
                        className="md:hidden p-2 text-industrial-silver hover:text-cyan-400 transition-colors"
                        aria-label="Toggle menu"
                    >
                        {mobileOpen ? <span className="text-xl">✕</span> : <span className="text-xl">☰</span>}
                    </button>
                </div>
            </nav>
            {mobileOpen && (
                <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="absolute top-[72px] left-0 right-0 z-40 md:hidden bg-black/60 backdrop-blur-xl border-b border-white/20 p-6 space-y-4 glass-noise"
                >
                    <div className="border-l-2 border-cyan-500 pl-4">
                        <p className="text-[8px] text-industrial-silver font-bold uppercase">// SQUAD_STRENGTH</p>
                        <p className="text-2xl font-black text-white">{regCount.toString().padStart(2, '0')}</p>
                    </div>
                    <button onClick={() => { setMobileOpen(false); onRegisterClick() }} className="block w-full text-left py-2 text-cyan-400 font-bold uppercase">Register</button>
                </motion.div>
            )}
        </>
    )
}

// --- 3. MAIN APP ---
export default function App() {
    const [showReg, setShowReg] = useState(false)
    const [regCount, setRegCount] = useState(0)
    const [isLoading, setIsLoading] = useState(true)
    const [reduceMotion, setReduceMotion] = useState(false)
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [formErrors, setFormErrors] = useState({ teamName: '', email: '', phone: '' })
    const [formTouched, setFormTouched] = useState({ teamName: false, email: false, phone: false })
    const [bracketHover, setBracketHover] = useState(false)
    const [mousePos, setMousePos] = useState({ x: 0, y: 0 })
    const [phaseState, setPhaseState] = useState({ active: null, blueprintMode: false })
    const [shockwave, setShockwave] = useState(false)
    const [parallaxOffset, setParallaxOffset] = useState({ x: 0, y: 0 })
    const toast = useToast()

    useEffect(() => {
        const onMouseMove = (e) => {
            const x = (e.clientX / window.innerWidth - 0.5) * 2
            const y = (e.clientY / window.innerHeight - 0.5) * 2
            setMousePos({ x, y })
            if (!reduceMotion) setParallaxOffset({ x: x * 8, y: y * 8 })
        }
        window.addEventListener('mousemove', onMouseMove)
        return () => window.removeEventListener('mousemove', onMouseMove)
    }, [reduceMotion])

    useEffect(() => {
        const timer = setTimeout(() => setIsLoading(false), 5000)
        return () => clearTimeout(timer)
    }, [])

    useEffect(() => {
        const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
        setReduceMotion(mq.matches)
        const fn = () => setReduceMotion(mq.matches)
        mq.addEventListener('change', fn)
        return () => mq.removeEventListener('change', fn)
    }, [])

    useEffect(() => {
        fetch(`${API_URL}/api/stats`)
            .then(res => res.json())
            .then(data => setRegCount(data.totalTeams || 0))
            .catch(() => console.log('Backend Offline'))
    }, [])

    const validateField = useCallback((name, value) => {
        switch (name) {
            case 'teamName': return value.trim().length < 2 ? 'Min 2 characters' : ''
            case 'email': return !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) ? 'Invalid email' : ''
            case 'phone': {
                const digits = value.replace(/\D/g, '')
                return (digits.length !== 10) ? 'Must be 10 digits' : ''
            }
            default: return ''
        }
    }, [])

    const handleSubmit = async (e) => {
        e.preventDefault()
        const teamName = e.target.teamName.value
        const email = e.target.email.value
        const phone = e.target.phone.value.replace(/\D/g, '')
        const errors = {
            teamName: validateField('teamName', teamName),
            email: validateField('email', email),
            phone: validateField('phone', phone),
        }
        setFormErrors(errors)
        setFormTouched({ teamName: true, email: true, phone: true })
        if (Object.values(errors).some(Boolean)) return

        setIsSubmitting(true)
        try {
            const response = await fetch(`${API_URL}/api/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    teamName,
                    email: e.target.email.value,
                    phone: e.target.phone.value,
                    timestamp: new Date().toISOString(),
                }),
            })
            const result = await response.json()
            toast(`SQUAD_UPLINK_SUCCESS: ${result.message || 'Registered!'}`, 'success')
            setShowReg(false)
        } catch (err) {
            toast('UPLINK_ERROR: Check server connection', 'error')
        } finally {
            setIsSubmitting(false)
        }
    }

    return (
        <ReduceMotionContext.Provider value={reduceMotion}>
        <PhaseContext.Provider value={phaseState}>
        <MouseContext.Provider value={mousePos}>
        <div className="h-screen w-full text-[#C0C0C0] font-mono overflow-hidden relative vignette cockpit-bg">

            {shockwave && <div className="absolute inset-0 z-[90] shockwave-effect pointer-events-none" aria-hidden />}

            <AnimatePresence>
                {isLoading && (
                    <LoadingScreen
                        key="loader"
                        onSkip={() => setIsLoading(false)}
                        reduceMotion={reduceMotion}
                    />
                )}
            </AnimatePresence>

            {/* 3D BACKGROUND LAYER - parallax */}
            <div className="absolute inset-0 z-0 opacity-60 transition-transform duration-150" style={{ transform: `translate(${parallaxOffset.x}px, ${parallaxOffset.y}px) scale(1.02)` }}>
                <Canvas shadows dpr={[1, 2]}>
                    <PerspectiveCamera makeDefault position={[0, 0, 10]} fov={45} />
                    <ambientLight intensity={1.2} />
                    <pointLight position={[10, 10, 10]} color="#00f2ff" intensity={5} />
                    <SceneContent />
                </Canvas>
            </div>

            {/* HUD OVERLAY */}
            <HUDOverlay reduceMotion={reduceMotion} mouseX={mousePos.x} mouseY={mousePos.y} />

            {/* NAVIGATION */}
            <NavBar onRegisterClick={() => { setShockwave(true); setTimeout(() => setShockwave(false), 400); setShowReg(true) }} regCount={regCount} reduceMotion={reduceMotion} />

            {/* HERO CONTENT */}
            <main className="absolute inset-0 flex flex-col justify-center px-6 sm:px-12 md:px-32 z-10 pointer-events-none">
                <div className="space-y-6 pointer-events-auto max-w-5xl">
                    <div className="flex items-center gap-3">
                        <div className="w-4 h-4 bg-cyan-500 transform rotate-45" />
                        <span className="text-[10px] font-black tracking-[0.5em] uppercase text-white">PRIZE POOL: WORTH ₹10,000</span>
                    </div>
                    <div className="relative border-l-4 border-cyan-500 pl-6 sm:pl-10 py-2">
                        <span className="bg-cyan-500 text-black text-[10px] font-black px-3 py-1 uppercase absolute -top-4 left-6 sm:left-10 tracking-[0.2em]">National Level CAD Showdown</span>
                        <div className="relative inline-block">
                            <div className="absolute inset-0 bg-black/50 -z-10" aria-hidden="true" />
                            <h1 className="font-industrial text-[10vw] sm:text-[8vw] md:text-[6.5rem] lg:text-[8.5rem] font-black text-white tracking-tighter uppercase leading-[0.85] max-w-full title-glitch hero-shimmer">AEROCAD<br /><span className="text-transparent hero-stroke">SHOWDOWN</span></h1>
                        </div>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-8 sm:gap-12 items-start sm:items-end">
                        <div className="max-w-xs space-y-4 font-bold">
                            <p className="text-[9px] text-industrial-silver leading-relaxed uppercase tracking-widest">4 Designers. 1 Day. Simultaneous Modeling & Technical Assembly. MIT Academy of Engineering, Pune.</p>
                            <div
                                className="relative inline-block group/bracket"
                                onMouseEnter={() => setBracketHover(true)}
                                onMouseLeave={() => setBracketHover(false)}
                                role="button"
                                aria-label="View Bracket - Coming soon"
                                tabIndex={0}
                            >
                                <div className="relative border border-white/20 px-8 py-3 bg-white/5 backdrop-blur-md group-hover/bracket:bg-cyan-500/10 transition-all font-black uppercase text-[10px] tracking-[0.2em] overflow-hidden cursor-not-allowed">
                                    {bracketHover && !reduceMotion && <span className="absolute inset-0 bg-cyan-500/10 animate-pulse" />}
                                    <span className="relative z-10">View Bracket</span>
                                    <span className="absolute -top-1 -right-1 text-[8px] text-mach-gold font-black italic data-locked-pulse">DATA_LOCKED</span>
                                </div>
                                <span className="absolute -bottom-6 left-0 text-[8px] text-industrial-silver italic">COMING SOON</span>
                            </div>
                        </div>
                        <div className="hidden lg:flex gap-3">
                            {[
                                { name: 'Blueprint Sprint', id: 0, blueprint: true },
                                { name: 'Assembly Nexus', id: 1, blueprint: false },
                                { name: 'Grand Finale', id: 2, blueprint: false },
                            ].map(({ name, id, blueprint }) => (
                                <div
                                    key={id}
                                    className="bg-white/5 p-3 border border-white/10 w-32 tech-card-cyan hover:bg-cyan-500/10 transition-all duration-300 cursor-pointer panel-rivets"
                                    onMouseEnter={() => setPhaseState({ active: id, blueprintMode: blueprint })}
                                    onMouseLeave={() => setPhaseState({ active: null, blueprintMode: false })}
                                >
                                    <p className="text-[8px] text-cyan-400 font-bold mb-1 italic tracking-widest underline underline-offset-4">PHASE_0{id + 1}</p>
                                    <p className="text-[9px] text-white font-black uppercase leading-tight italic">{name}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
                <div className="absolute bottom-12 left-6 sm:left-12 md:left-32 flex flex-wrap gap-4 sm:gap-12 text-[9px] font-black tracking-[0.3em] uppercase text-industrial-silver items-center">
                    <div className="flex items-center gap-2 text-aviation-orange italic">
                        <div className="w-2 h-2 bg-aviation-orange rounded-full animate-pulse shadow-[0_0_8px_#FF9500]" />REGISTRATION LIVE
                    </div>
                    <span>|</span><div>50 SLOTS</div><span>|</span><div className="text-white italic underline decoration-cyan-500">Venue: MITAOE, Pune</div>
                </div>
            </main>

            {/* REGISTRATION MODAL */}
            <AnimatePresence>
                {showReg && (
                    <motion.div initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} className="absolute right-0 top-0 h-full w-full md:w-[450px] z-50 p-12 backdrop-blur-3xl bg-black/40 border-l-2 border-cyan-500 shadow-[-50px_0_100px_rgba(0,0,0,0.9)] panel-glass panel-rivets">
                        <div className="h-full flex flex-col justify-center relative">
                            <h2 className="text-3xl font-black mb-12 text-white italic underline decoration-cyan-500 uppercase">Registration_Hub</h2>
                            <form onSubmit={handleSubmit} className="space-y-8">
                                <div className="relative">
                                    <span className="absolute left-0 top-1 w-1.5 h-1.5 rounded-full bg-emerald-500 led-green" />
                                    <label className="block text-[10px] text-cyan-500 mb-2 font-black uppercase tracking-[0.2em] pl-4">Team Designation</label>
                                    <input
                                        name="teamName"
                                        required
                                        onBlur={(e) => { setFormTouched(t => ({ ...t, teamName: true })); setFormErrors(err => ({ ...err, teamName: validateField('teamName', e.target.value) })) }}
                                        onChange={(e) => formTouched.teamName && setFormErrors(err => ({ ...err, teamName: validateField('teamName', e.target.value) })) }
                                        className={`w-full bg-white/5 border-b p-4 text-white outline-none transition-all text-sm tracking-widest ${formErrors.teamName ? 'border-vibrant-red shadow-[0_0_15px_rgba(255,0,0,0.3)]' : 'border-white/10 focus:border-cyan-500 focus:shadow-[0_0_15px_rgba(0,242,255,0.3)]'}`}
                                        placeholder="TEAM_IDENTIFIER"
                                    />
                                    {formErrors.teamName && <p className="text-[9px] text-vibrant-red mt-1 font-bold">{formErrors.teamName}</p>}
                                </div>
                                <div className="grid grid-cols-2 gap-6">
                                    <div className="relative">
                                        <span className="absolute left-0 top-1 w-1.5 h-1.5 rounded-full bg-amber-500 led-amber" />
                                        <label className="block text-[10px] text-industrial-silver mb-2 font-bold uppercase tracking-widest pl-4">Captain Email</label>
                                        <input
                                            name="email"
                                            required
                                            type="email"
                                            onBlur={(e) => { setFormTouched(t => ({ ...t, email: true })); setFormErrors(err => ({ ...err, email: validateField('email', e.target.value) })) }}
                                            onChange={(e) => formTouched.email && setFormErrors(err => ({ ...err, email: validateField('email', e.target.value) })) }
                                            className={`w-full bg-white/5 border-b p-3 text-white text-xs outline-none transition-all ${formErrors.email ? 'border-vibrant-red shadow-[0_0_15px_rgba(255,0,0,0.3)]' : 'border-white/10 focus:border-cyan-500 focus:shadow-[0_0_15px_rgba(0,242,255,0.3)]'}`}
                                            placeholder="UPLINK@EMAIL.COM"
                                        />
                                        {formErrors.email && <p className="text-[9px] text-vibrant-red mt-1 font-bold">{formErrors.email}</p>}
                                    </div>
                                    <div className="relative">
                                        <span className="absolute left-0 top-1 w-1.5 h-1.5 rounded-full bg-amber-500 led-amber" />
                                        <label className="block text-[10px] text-industrial-silver mb-2 font-bold uppercase tracking-widest pl-4">Contact No.</label>
                                        <input
                                            name="phone"
                                            required
                                            onBlur={(e) => { setFormTouched(t => ({ ...t, phone: true })); setFormErrors(err => ({ ...err, phone: validateField('phone', e.target.value) })) }}
                                            onChange={(e) => formTouched.phone && setFormErrors(err => ({ ...err, phone: validateField('phone', e.target.value) })) }
                                            className={`w-full bg-white/5 border-b p-3 text-white text-xs outline-none transition-all ${formErrors.phone ? 'border-vibrant-red shadow-[0_0_15px_rgba(255,0,0,0.3)]' : 'border-white/10 focus:border-cyan-500 focus:shadow-[0_0_15px_rgba(0,242,255,0.3)]'}`}
                                            placeholder="10 digits"
                                        />
                                        {formErrors.phone && <p className="text-[9px] text-vibrant-red mt-1 font-bold">{formErrors.phone}</p>}
                                    </div>
                                </div>
                                <div className="pt-8">
                                    <button type="submit" disabled={isSubmitting} className="w-full bg-cyan-500 py-5 text-black font-black uppercase tracking-[0.3em] hover:bg-white transition-all shadow-[0_10px_30px_rgba(0,242,255,0.2)] active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed">
                                        {isSubmitting ? 'Processing...' : 'Confirm_Deployment'}
                                    </button>
                                    <button type="button" onClick={() => setShowReg(false)} className="w-full text-[10px] text-vibrant-red uppercase mt-8 hover:text-vibrant-red/80 tracking-[0.4em] transition-colors font-bold">// ABORT_PROCESS</button>
                                </div>
                            </form>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
            <div className={`absolute inset-0 pointer-events-none z-40 opacity-10 ${reduceMotion ? '' : 'scanline-effect'}`} />
        </div>
        </MouseContext.Provider>
        </PhaseContext.Provider>
        </ReduceMotionContext.Provider>
    )
}