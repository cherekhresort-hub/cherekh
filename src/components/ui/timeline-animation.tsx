'use client'

import { motion, type Variants } from 'framer-motion'
import { type ComponentPropsWithoutRef, type ElementType } from 'react'

type TimelineContentProps<T extends ElementType> = {
  as?: T
  animationNum?: number
  customVariants?: Variants
} & Omit<ComponentPropsWithoutRef<T>, 'as'>

const defaultVariants: Variants = {
  hidden: { opacity: 0, y: 16, filter: 'blur(8px)' },
  visible: (index: number = 0) => ({
    opacity: 1,
    y: 0,
    filter: 'blur(0px)',
    transition: {
      duration: 0.45,
      delay: index * 0.08,
      ease: [0.22, 1, 0.36, 1],
    },
  }),
}

export function TimelineContent<T extends ElementType = 'div'>({
  as,
  animationNum = 0,
  customVariants,
  children,
  ...props
}: TimelineContentProps<T>) {
  const Component = (as ?? 'div') as ElementType
  const MotionComponent = motion(Component)

  return (
    <MotionComponent
      variants={customVariants ?? defaultVariants}
      custom={animationNum}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0.2 }}
      {...props}
    >
      {children}
    </MotionComponent>
  )
}

