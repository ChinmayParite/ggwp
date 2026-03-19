import React, { useRef, useState, useEffect } from 'react'

// Corner bracket SVG - angular technical viewfinder style
const CornerBracket = ({ position = 'tl' }) => {
    const d = {
        tl: 'M 0 20 L 0 0 L 20 0 M 0 40 L 0 20 M 40 0 L 20 0',
        tr: 'M 80 0 L 100 0 L 100 20 M 80 0 L 100 0 M 100 40 L 100 20 M 60 0 L 80 0',
        bl: 'M 0 80 L 0 100 L 20 100 M 0 60 L 0 80 M 40 100 L 20 100',
        br: 'M 80 100 L 100 100 L 100 80 M 80 100 L 100 100 M 100 60 L 100 80 M 60 100 L 80 100',
    }
    const posClass = position === 'tl' ? 'top-4 left-4' : position === 'tr' ? 'top-4 right-4' : position === 'bl' ? 'bottom-4 left-4' : 'bottom-4 right-4'
    return (
        <svg viewBox="0 0 100 100" className={`absolute w-12 h-12 md:w-16 md:h-16 ${posClass} text-cyan-500/70`}>
            <path d={d[position]} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="square" />
        </svg>
    )
}

// Auto-incrementing telemetry gauge
function TelemetryGauge({ label, value, suffix = '', decimals = 4 }) {
    const fmt = (v) => (typeof v === 'number' ? v.toFixed(decimals) : String(v))
    return (
        <div className="text-[8px] md:text-[9px] font-mono text-cyan-400/80 tracking-wider">
            <div className="text-industrial-silver/60 uppercase">{label}</div>
            <div className="font-black text-cyan-400 tabular-nums">{fmt(value)}{suffix}</div>
        </div>
    )
}

// Scrolling system logs
function ScrollingLogs({ reduceMotion }) {
    const logs = [
        'CALIBRATING_SENSORS... OK',
        'UPLINK_STABLE',
        'GEOMETRY_OPTIMIZED',
        'CAD_ASSEMBLY_LOADED',
        'ENVIRONMENT_MAPPED',
        'RENDER_PIPELINE_READY',
    ]
    return (
        <div className="absolute bottom-24 right-4 md:right-8 w-48 h-16 overflow-hidden border-l border-cyan-500/30 pl-3 font-mono">
            <div className={`text-[7px] text-cyan-500/60 space-y-1 ${reduceMotion ? '' : 'animate-scroll-logs'}`}>
                {[...logs, ...logs].map((log, i) => (
                    <div key={i} className="whitespace-nowrap">{log}</div>
                ))}
            </div>
        </div>
    )
}

export default function HUDOverlay({ reduceMotion, mouseX = 0, mouseY = 0 }) {
    const pitch = mouseY * 20
    const roll = mouseX * 15
    const [telemetry, setTelemetry] = useState({
        lat: 18.5167 + Math.random() * 0.01,
        lng: 73.8563 + Math.random() * 0.01,
        alt: 120 + Math.random() * 10,
        pitch: -2.3,
        roll: 0.1,
        yaw: 45.2,
    })
    useEffect(() => {
        const t = setInterval(() => {
            setTelemetry((prev) => ({
                lat: prev.lat + (Math.random() - 0.5) * 0.0001,
                lng: prev.lng + (Math.random() - 0.5) * 0.0001,
                alt: prev.alt + (Math.random() - 0.5) * 0.5,
                pitch: prev.pitch + (Math.random() - 0.5) * 0.1,
                roll: prev.roll + (Math.random() - 0.5) * 0.1,
                yaw: prev.yaw + (Math.random() - 0.5) * 0.2,
            }))
        }, 200)
        return () => clearInterval(t)
    }, [])

    return (
        <div className="absolute inset-0 pointer-events-none z-35 font-mono">
            {/* Corner brackets */}
            <CornerBracket position="tl" />
            <CornerBracket position="tr" />
            <CornerBracket position="bl" />
            <CornerBracket position="br" />

            {/* Telemetry gauges */}
            <div className="absolute top-28 left-6 md:left-8 space-y-2">
                <TelemetryGauge label="LAT" value={telemetry.lat} decimals={4} />
                <TelemetryGauge label="LNG" value={telemetry.lng} decimals={4} />
                <TelemetryGauge label="ALT" value={telemetry.alt} suffix="m" decimals={1} />
            </div>
            <div className="absolute top-28 right-20 md:right-24 space-y-2 text-right">
                <TelemetryGauge label="PITCH" value={pitch} suffix="°" decimals={1} />
                <TelemetryGauge label="ROLL" value={roll} suffix="°" decimals={1} />
                <TelemetryGauge label="YAW" value={telemetry.yaw} suffix="°" decimals={1} />
            </div>

            {/* Scrolling logs */}
            <ScrollingLogs reduceMotion={reduceMotion} />
        </div>
    )
}
