import React, { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'

export default function WindParticles({ count = 80 }) {
    const mesh = useRef()
    const [positions, velocities] = useMemo(() => {
        const pos = new Float32Array(count * 3)
        const vel = []
        for (let i = 0; i < count; i++) {
            pos[i * 3] = (Math.random() - 0.5) * 30
            pos[i * 3 + 1] = (Math.random() - 0.5) * 12
            pos[i * 3 + 2] = (Math.random() - 0.5) * 20
            vel.push({ x: (Math.random() - 0.5) * 0.02, y: (Math.random() - 0.5) * 0.01, z: -0.05 - Math.random() * 0.03 })
        }
        return [pos, vel]
    }, [count])

    useFrame(() => {
        if (!mesh.current) return
        const arr = mesh.current.geometry.attributes.position.array
        for (let i = 0; i < count; i++) {
            arr[i * 3] += velocities[i].x
            arr[i * 3 + 1] += velocities[i].y
            arr[i * 3 + 2] += velocities[i].z
            if (arr[i * 3 + 2] < -15) arr[i * 3 + 2] = 15
            if (arr[i * 3] > 15) arr[i * 3] = -15
            if (arr[i * 3] < -15) arr[i * 3] = 15
        }
        mesh.current.geometry.attributes.position.needsUpdate = true
    })

    return (
        <points ref={mesh}>
            <bufferGeometry>
                <bufferAttribute attach="attributes-position" count={count} array={positions} itemSize={3} />
            </bufferGeometry>
            <pointsMaterial size={0.03} color="#00f2ff" transparent opacity={0.4} sizeAttenuation />
        </points>
    )
}
