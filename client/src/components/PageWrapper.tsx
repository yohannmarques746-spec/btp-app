import Sidebar from '@/components/Sidebar'
import { useLocation } from 'wouter'
import { AnimatePresence, motion } from 'framer-motion'
import { MobileHeader } from './MobileHeader'

interface PageWrapperProps {
  children: React.ReactNode
  mobileTitle?: string
}

const contentVariants = {
  initial: {
    opacity: 0,
    y: 20,
    scale: 0.98
  },
  animate: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      duration: 0.4,
      ease: [0.22, 1, 0.36, 1]
    }
  },
  exit: {
    opacity: 0,
    y: -20,
    scale: 0.98,
    transition: {
      duration: 0.3,
      ease: [0.22, 1, 0.36, 1]
    }
  }
};

export function PageWrapper({ children, mobileTitle }: PageWrapperProps) {
  const [location] = useLocation();

  return (
    <div className="flex min-h-screen relative overflow-x-hidden md:overflow-hidden">
      {/* Sidebar - now fixed, no animation */}
      <Sidebar />

      {/* Main Content - animated */}
      <AnimatePresence mode="wait">
        <motion.div
          key={location}
          initial="initial"
          animate="animate"
          exit="exit"
          variants={contentVariants}
          className="flex-1 flex flex-col relative z-10 ml-0 md:ml-64 md:rounded-l-3xl min-h-screen md:overflow-hidden"
        >
          <MobileHeader title={mobileTitle} />
          <div className="px-3 py-3 pb-[env(safe-area-inset-bottom)] md:px-6 md:py-6">
            {children}
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  )
}

