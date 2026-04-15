import React from 'react'
import { ArrowRight, Check } from 'lucide-react'
import { AnimatePresence, motion } from 'framer-motion'
import { clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

function cn(...inputs) { return twMerge(clsx(inputs)) }

export default function InteractiveHoverButton({
  text = 'Button',
  loadingText = 'Please wait...',
  successText = 'Complete!',
  isLoading = false,
  isSuccess = false,
  classes,
  ...props
}) {
  const status = isSuccess ? 'success' : (isLoading ? 'loading' : 'idle');
  const isIdle = status === 'idle';

  return (
    <motion.button
      className={cn(
        'group relative flex w-full items-center justify-center overflow-hidden rounded-lg border border-teal-200 bg-white py-2.5 font-semibold text-teal-600 shadow-sm transition-all hover:border-transparent focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2',
        status === 'loading' && 'opacity-80 pointer-events-none',
        classes
      )}
      disabled={isLoading}
      layout
      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
      {...props}
    >
      <AnimatePresence mode='popLayout' initial={false}>
        <motion.div
          key={status}
          className='flex w-full items-center justify-center gap-2'
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
        >
          {/* Expandable Dot (Fill Background) */}
          <div
            className={cn(
              'absolute left-1/2 top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full transition-all duration-500 scale-0 group-hover:scale-[60] bg-gradient-to-r from-teal-500 to-sky-500',
              !isIdle && 'scale-[60]' // Keep expanded when loading/success
            )}
          />

          {/* Idle Text */}
          <span
            className={cn(
              'relative z-10 inline-block transition-all duration-500 group-hover:translate-x-20 group-hover:opacity-0',
              !isIdle && 'translate-x-20 opacity-0'
            )}
          >
            {text}
          </span>

          {/* Hover / Active Text layer */}
          <div
            className={cn(
              'absolute left-0 top-0 z-10 flex h-full w-full -translate-x-16 items-center justify-center gap-2 opacity-0 transition-all duration-500 text-white group-hover:translate-x-0 group-hover:opacity-100',
              !isIdle && 'translate-x-0 opacity-100' // Show when loading/success
            )}
          >
            {status === 'idle' ? (
              <>
                <span>{text}</span>
                <ArrowRight className='h-4 w-4' />
              </>
            ) : status === 'loading' ? (
              <>
                <div className='h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white' />
                <span>{loadingText}</span>
              </>
            ) : (
              // success
              <>
                <Check className='h-4 w-4' />
                <span>{successText}</span>
              </>
            )}
          </div>
        </motion.div>
      </AnimatePresence>
    </motion.button>
  )
}
