import React, { createContext, useContext, useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

const ToastContext = createContext(null)

export function ToastProvider({ children }) {
    const [toasts, setToasts] = useState([])

    const toast = useCallback((message, type = 'success') => {
        const id = Date.now()
        setToasts((prev) => [...prev, { id, message, type }])
        setTimeout(() => {
            setToasts((prev) => prev.filter((t) => t.id !== id))
        }, 4000)
    }, [])

    return (
        <ToastContext.Provider value={toast}>
            {children}
            <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[200] flex flex-col gap-3 pointer-events-none">
                <AnimatePresence>
                    {toasts.map((t) => (
                        <motion.div
                            key={t.id}
                            initial={{ opacity: 0, y: 20, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: -10, scale: 0.95 }}
                            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                            className={`px-6 py-4 font-mono text-sm font-bold uppercase tracking-widest border backdrop-blur-xl shadow-2xl
                                ${t.type === 'success'
                                    ? 'bg-cyan-500/20 border-cyan-500 text-cyan-400 shadow-[0_0_30px_rgba(0,242,255,0.2)]'
                                    : 'bg-vibrant-red/20 border-vibrant-red text-vibrant-red shadow-[0_0_30px_rgba(255,0,0,0.2)]'
                                }`}
                        >
                            <span className={t.type === 'success' ? 'text-cyan-300' : ''}>{t.message}</span>
                        </motion.div>
                    ))}
                </AnimatePresence>
            </div>
        </ToastContext.Provider>
    )
}

export function useToast() {
    const ctx = useContext(ToastContext)
    if (!ctx) throw new Error('useToast must be used within ToastProvider')
    return ctx
}
