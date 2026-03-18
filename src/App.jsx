import React, { Suspense, useRef, useState, useMemo, useEffect } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { Float, PerspectiveCamera, ContactShadows, useGLTF, Environment, useProgress } from '@react-three/drei'
import { motion, AnimatePresence } from 'framer-motion'
import * as THREE from 'three'

// --- 1. LOADING SCREEN COMPONENT ---
function LoadingScreen({ onSkip }) {
    const { progress } = useProgress();
    return (
        <motion.div
            key="loader-container"
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.8 }}
            className="fixed inset-0 z-[100] bg-[#02060a] flex flex-col items-center justify-center font-mono"
        >
            <div className="w-64 space-y-4">
                <div className="flex justify-between items-end">
                    <div>
                        <p className="text-[10px] text-cyan-500 font-black tracking-[0.3em] animate-pulse">[ INITIALIZING_CAD_MODELS ]</p>
                        <p className="text-white text-xs font-bold uppercase tracking-tighter">Uplink: MITAERO_SYSTEMS</p>
                    </div>
                    <p className="text-cyan-400 text-xs font-black italic">{Math.round(progress)}%</p>
                </div>
                <div className="h-[2px] w-full bg-white/5 relative overflow-hidden">
                    <motion.div
                        className="h-full bg-cyan-500 shadow-[0_0_15px_#00f2ff]"
                        initial={{ width: 0 }}
                        animate={{ width: `${progress}%` }}
                    />
                </div>
                <div className="flex justify-between text-[7px] text-gray-700 font-bold uppercase tracking-[0.2em]">
                    <span>SECURE_CONNECTION</span>
                    <span>BUFFERING_GEOMETRY</span>
                </div>
            </div>

            {/* SKIP BUTTON */}
            <button
                onClick={onSkip}
                className="absolute bottom-10 right-10 text-[10px] text-gray-600 hover:text-cyan-400 transition-colors uppercase tracking-[0.4em] border border-white/5 px-4 py-2 hover:border-cyan-500/50"
            >
                [ SKIP_BOOT_SEQUENCE ]
            </button>
        </motion.div>
    );
}

// --- 2. 3D AIRCRAFT COMPONENT ---
function CADAssembly() {
    const group = useRef();
    const { mouse } = useThree();
    // Safety: ensure this path matches your public folder exactly!
    const { scene } = useGLTF('/aircraft.glb', true);

    useFrame((state) => {
        if (group.current) {
            group.current.rotation.y = THREE.MathUtils.lerp(group.current.rotation.y, (mouse.x * Math.PI) / 8, 0.05);
            group.current.rotation.x = THREE.MathUtils.lerp(group.current.rotation.x, (mouse.y * -Math.PI) / 10, 0.05);
            group.current.position.y = Math.sin(state.clock.getElapsedTime() / 2) * 0.12;
        }
    });

    return (
        <group ref={group} scale={2.8} position={[3, -0.5, 0]}>
            <primitive object={scene} />
        </group>
    );
}

// --- 3. MAIN APP ---
export default function App() {
    const [showReg, setShowReg] = useState(false);
    const [regCount, setRegCount] = useState(0);
    const [isLoading, setIsLoading] = useState(true);
    const { progress } = useProgress();

    // UPDATED 5-SECOND TIMER LOGIC
    useEffect(() => {
        const timer = setTimeout(() => {
            // Force landing page after 5s even if progress isn't 100% (safety fallback)
            setIsLoading(false);
        }, 5000);

        return () => clearTimeout(timer);
    }, []);

    useEffect(() => {
        fetch('http://localhost:3001/api/stats')
            .then(res => res.json())
            .then(data => setRegCount(data.totalTeams))
            .catch(() => console.log("Backend Offline"));
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        const formData = {
            teamName: e.target.teamName.value,
            email: e.target.email.value,
            phone: e.target.phone.value,
            timestamp: new Date().toISOString()
        };
        try {
            const response = await fetch('http://localhost:3001/api/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });
            const result = await response.json();
            alert(`SQUAD_UPLINK_SUCCESS: ${result.message}`);
            setShowReg(false);
        } catch (err) { alert("UPLINK_ERROR: Check server.js"); }
    };

    return (
        <div className="h-screen w-full bg-[#02060a] text-[#C0C0C0] font-mono overflow-hidden relative">

            <AnimatePresence>
                {isLoading && (
                    <LoadingScreen
                        key="loader"
                        onSkip={() => setIsLoading(false)}
                    />
                )}
            </AnimatePresence>

            {/* 3D BACKGROUND LAYER */}
            <div className="absolute inset-0 z-0 opacity-60">
                <Canvas shadows dpr={[1, 2]}>
                    <PerspectiveCamera makeDefault position={[0, 0, 10]} fov={45} />
                    <ambientLight intensity={1.2} />
                    <pointLight position={[10, 10, 10]} color="#00f2ff" intensity={5} />
                    {/* Fallback box shows if aircraft.glb is missing */}
                    <Suspense fallback={<mesh><boxGeometry /><meshBasicMaterial wireframe color="cyan" /></mesh>}>
                        <CADAssembly />
                        <Environment preset="night" />
                        <ContactShadows position={[0, -4, 0]} opacity={0.3} scale={20} blur={3} far={10} />
                    </Suspense>
                </Canvas>
            </div>

            {/* NAVIGATION */}
            <nav className="absolute top-0 w-full p-6 flex justify-between items-center z-50 bg-black/40 backdrop-blur-md border-b border-cyan-900/30">
                <div className="flex items-center gap-6 pointer-events-auto">
                    <img src="gamesta_aero-removebg.png" className="w-12 h-12 object-contain drop-shadow-[0_0_10px_#00f2ff]" alt="Logo" />
                    <div>
                        <p className="text-[10px] font-black tracking-widest text-white uppercase italic">MITAOE AERO CLUB</p>
                        <p className="text-[8px] text-cyan-400 tracking-[0.3em] font-bold uppercase italic">Technical Sponsor: ANSYS</p>
                    </div>
                </div>
                <div className="flex items-center gap-8 pointer-events-auto">
                    <div className="text-right hidden sm:block border-r border-white/10 pr-6">
                        <p className="text-[8px] text-gray-500 font-bold tracking-widest uppercase italic">// SQUAD_STRENGTH</p>
                        <p className="text-xl font-black text-white leading-none tracking-tighter italic">{regCount.toString().padStart(2, '0')}</p>
                    </div>
                    <button onClick={() => setShowReg(true)} className="bg-cyan-500 hover:bg-white hover:text-black text-black px-10 py-2.5 font-black skew-x-[-12deg] transition-all uppercase text-sm">
                        <span className="skew-x-[12deg] inline-block tracking-tighter italic">REGISTER</span>
                    </button>
                </div>
            </nav>

            {/* HERO CONTENT */}
            <main className="absolute inset-0 flex flex-col justify-center px-12 md:px-32 z-10 pointer-events-none">
                <div className="space-y-6 pointer-events-auto max-w-5xl">
                    <div className="flex items-center gap-3">
                        <div className="w-4 h-4 bg-cyan-500 transform rotate-45" />
                        <span className="text-[10px] font-black tracking-[0.5em] uppercase text-white">PRIZE POOL: WORTH ₹10,000</span>
                    </div>
                    <div className="relative border-l-4 border-cyan-500 pl-10 py-2">
                        <span className="bg-cyan-500 text-black text-[10px] font-black px-3 py-1 uppercase absolute -top-4 left-10 tracking-[0.2em]">National Level CAD Showdown</span>
                        <h1 className="text-7xl md:text-[8.5rem] font-black text-white tracking-tighter uppercase leading-[0.8] italic">AEROCAD<br /><span className="text-transparent stroke-text-cyan">SHOWDOWN</span></h1>
                    </div>
                    <div className="flex gap-12 items-end">
                        <div className="max-w-xs space-y-4 font-bold">
                            <p className="text-[9px] text-gray-400 leading-relaxed uppercase tracking-widest">4 Designers. 1 Day. Simultaneous Modeling & Technical Assembly. MIT Academy of Engineering, Pune.</p>
                            <button className="border border-white/20 px-8 py-3 bg-white/5 backdrop-blur-md hover:bg-cyan-500 hover:text-black transition-all font-black uppercase text-[10px] tracking-[0.2em]">View Bracket</button>
                        </div>
                        <div className="hidden lg:flex gap-3">
                            {['Blueprint Sprint', 'Assembly Nexus', 'Grand Finale'].map((name, i) => (
                                <div key={i} className="bg-white/5 p-3 border border-white/10 w-32 tech-card-cyan hover:bg-cyan-500/10 transition-colors">
                                    <p className="text-[8px] text-cyan-400 font-bold mb-1 italic tracking-widest underline underline-offset-4">PHASE_0{i + 1}</p>
                                    <p className="text-[9px] text-white font-black uppercase leading-tight italic">{name}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
                <div className="absolute bottom-12 left-12 md:left-32 flex gap-12 text-[9px] font-black tracking-[0.3em] uppercase text-gray-500 items-center">
                    <div className="flex items-center gap-2 text-cyan-400 italic">
                        <div className="w-2 h-2 bg-cyan-400 rounded-full animate-pulse shadow-[0_0_8px_#00f2ff]" />REGISTRATION LIVE
                    </div>
                    <span>|</span><div>50 SLOTS</div><span>|</span><div className="text-white italic underline decoration-cyan-500">Venue: MITAOE, Pune</div>
                </div>
            </main>

            {/* REGISTRATION MODAL */}
            <AnimatePresence>
                {showReg && (
                    <motion.div initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} className="absolute right-0 top-0 h-full w-full md:w-[450px] bg-black/98 border-l-2 border-cyan-500 z-50 p-12 backdrop-blur-2xl shadow-[-50px_0_100px_rgba(0,0,0,0.9)]">
                        <div className="h-full flex flex-col justify-center">
                            <h2 className="text-3xl font-black mb-12 text-white italic underline decoration-cyan-500 uppercase">Registration_Hub</h2>
                            <form onSubmit={handleSubmit} className="space-y-8">
                                <div><label className="block text-[10px] text-cyan-500 mb-2 font-black uppercase tracking-[0.2em]">Team Designation</label><input name="teamName" required className="w-full bg-white/5 border-b border-white/10 p-4 text-white outline-none focus:border-cyan-500 transition-all text-sm tracking-widest" placeholder="TEAM_IDENTIFIER" /></div>
                                <div className="grid grid-cols-2 gap-6">
                                    <div><label className="block text-[10px] text-gray-500 mb-2 font-bold uppercase tracking-widest">Captain Email</label><input name="email" required type="email" className="w-full bg-white/5 border-b border-white/10 p-3 text-white text-xs outline-none focus:border-cyan-500" placeholder="UPLINK@EMAIL.COM" /></div>
                                    <div><label className="block text-[10px] text-gray-500 mb-2 font-bold uppercase tracking-widest">Contact No.</label><input name="phone" required className="w-full bg-white/5 border-b border-white/10 p-3 text-white text-xs outline-none focus:border-cyan-500" placeholder="+91 XXXXXXXX" /></div>
                                </div>
                                <div className="pt-8">
                                    <button type="submit" className="w-full bg-cyan-500 py-5 text-black font-black uppercase tracking-[0.3em] hover:bg-white transition-all shadow-[0_10px_30px_rgba(0,242,255,0.2)] active:scale-95">Confirm_Deployment</button>
                                    <button type="button" onClick={() => setShowReg(false)} className="w-full text-[10px] text-cyan-900 uppercase mt-8 hover:text-cyan-400 tracking-[0.4em] transition-colors">// ABORT_PROCESS</button>
                                </div>
                            </form>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
            <div className="absolute inset-0 pointer-events-none z-40 opacity-10 scanline-effect" />
        </div>
    );
}