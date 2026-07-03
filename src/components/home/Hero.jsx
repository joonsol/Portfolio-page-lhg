import { useState } from 'react'
import { motion } from 'framer-motion'
import "./styles/Hero.scss"
import HeroParticleText from './HeroParticleText'

const HERO_PHRASES = [
  { text: 'Full-Stack', color: '#8766FF' },
  { text: 'Backend', color: '#4F46E5' },
  { text: 'LimHyunGun.', color: '#61AAE5' },
  { text: 'Developer', color: '#4F46E5' },
]

// Reveals the flip-card, career stats, headline text, and buttons one after another.
const containerVariants = {
  hidden: {},
  show: {
    transition: { staggerChildren: 0.18, delayChildren: 0.2 },
  },
}

const itemVariants = {
  hidden: { opacity: 0, y: 28 },
  show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] } },
}

const Hero = () => {
  const [flipped, setFlipped] = useState(false)
  const toggleFlip = () => setFlipped((f) => !f)
  const onFlipKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      toggleFlip()
    }
  }

  return (

      <div className="hero-root">
        <div className="bg-text">
        <span className="sr-only">
          {HERO_PHRASES.map((p) => p.text).join(' ')}
        </span>
        <HeroParticleText phrases={HERO_PHRASES} />
        </div>
    <motion.div
      className='inner hero-inner'
      variants={containerVariants}
      initial="hidden"
      animate="show"
    >

      <div className='intro-me'>
        <motion.div className="img-wrap" variants={itemVariants}>
          <div
            className={`flip-card${flipped ? ' is-flipped' : ''}`}
            role="button"
            tabIndex={0}
            aria-label="프로필 카드 뒤집기"
            onClick={toggleFlip}
            onKeyDown={onFlipKeyDown}
          >
            <div className="flip-face flip-front">
              <img src="./hero-myphoto.jpg" alt="photo" />
            </div>
            <div className="flip-face flip-back">
              <span>Full Stack Developer</span>
            </div>
          </div>
        </motion.div>
        <motion.ul className='myspack' variants={itemVariants}>
          <li className='spack work'>
            <span className='spack-num'>3+</span>
            <span className='spack-name'>경력</span>
          </li>
          <li className='spack skills'>
            <span className='spack-num'>3+</span>
            <span className='spack-name'>기술</span>
          </li>
          <li className='spack projects'>
            <span className='spack-num'>6+</span>
            <span className='spack-name'>프로젝트</span>
          </li>
          <li className='spack Negotiation'>
            <span className='spack-num'>1+</span>
            <span className='spack-name'>협업 수</span>
          </li>
        </motion.ul>
      <div className='intro-title'>
          <motion.span className='main-sub_1' variants={itemVariants}>
            현대적이고 성능 좋은 애플리케이션을 <br />
            만들기 위해 사용하는 기술
          </motion.span>


        <motion.div className="intro-btn" variants={itemVariants}>
          <button className='myworkBtn'>내 작업 보기</button>
          <button className='mycallBtn'>연락하기</button>
        </motion.div>
      </div>
      </div>
      </motion.div>
      </div>
  )
}

export default Hero