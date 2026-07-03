import { useEffect, useRef } from 'react'
import * as THREE from 'three'

const MORPH_MS = 20000
const FOV = 100

// Samples at `scale`x the container resolution so there are enough distinct pixel
// positions along letter edges/curves for a dense particle fill, then scales the
// resulting coordinates back down to container units.
function samplePoints(text, font, width, height, step, scale) {
  const canvasWidth = width * scale
  const canvasHeight = height * scale
  const canvas = document.createElement('canvas')
  canvas.width = canvasWidth
  canvas.height = canvasHeight
  const ctx = canvas.getContext('2d')
  ctx.fillStyle = '#fff'
  ctx.font = font
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(text, canvasWidth / 2, canvasHeight / 2)

  const { data } = ctx.getImageData(0, 0, canvasWidth, canvasHeight)
  const points = []
  for (let y = 0; y < canvasHeight; y += step) {
    for (let x = 0; x < canvasWidth; x += step) {
      const alpha = data[(y * canvasWidth + x) * 4 + 3]
      if (alpha > 128) points.push({ x: (x - canvasWidth / 2) / scale, y: -(y - canvasHeight / 2) / scale })
    }
  }
  return points
}

// Turns the flat text silhouette into a solid extruded block of particles
// (same x/y footprint, spread across a z range) so it reads as a 3D object when rotated.
function buildTargets(points, count, depthExtrude) {
  const arr = new Float32Array(count * 3)
  for (let i = 0; i < count; i++) {
    const p = points.length ? points[Math.floor(Math.random() * points.length)] : { x: 0, y: 0 }
    arr[i * 3] = p.x + (Math.random() - 0.5) * 1.5
    arr[i * 3 + 1] = p.y + (Math.random() - 0.5) * 1.5
    arr[i * 3 + 2] = (Math.random() - 0.5) * depthExtrude
  }
  return arr
}

// A sparse field of dim points scattered wide and deep behind the text,
// for ambient 3D depth. Regenerated on resize, otherwise static (only the
// group rotates), so it's cheap compared to the text sampling.
function buildAmbientPositions(count, width, height, nearZ, farZ) {
  const arr = new Float32Array(count * 3)
  for (let i = 0; i < count; i++) {
    arr[i * 3] = (Math.random() - 0.5) * width * 2.4
    arr[i * 3 + 1] = (Math.random() - 0.5) * height * 2.4
    arr[i * 3 + 2] = nearZ - Math.random() * (nearZ - farZ)
  }
  return arr
}

const easeInOutQuad = (t) => (t < 0.5 ? 2 * t * t : 1 - ((-2 * t + 2) ** 2) / 2)

const cameraDistanceFor = (height) => {
  const pad = 1.3
  return (height * pad) / 2 / Math.tan((FOV * Math.PI) / 360)
}

const HeroParticleText = ({ phrases }) => {
  const mountRef = useRef(null)

  useEffect(() => {
    const mount = mountRef.current
    if (!mount || !phrases?.length) return

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches

    let width = mount.clientWidth
    let height = mount.clientHeight
    if (!width || !height) return

    const isMobile = width < 640
    const particleCount = isMobile ? 2800 : 7200
    const step = isMobile ? 2 : 1
    const sampleScale = isMobile ? 1.5 : 2
    const depthExtrude = isMobile ? 50 : 90

    const scene = new THREE.Scene()
    const bgVar = getComputedStyle(document.documentElement).getPropertyValue('--color-bg-muted').trim()
    if (bgVar) scene.fog = new THREE.Fog(new THREE.Color(bgVar), 1, cameraDistanceFor(height) * 1.9)

    const camera = new THREE.PerspectiveCamera(FOV, width / height, 1, 3000)
    camera.position.z = cameraDistanceFor(height)

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.setSize(width, height)
    mount.appendChild(renderer.domElement)

    const positions = new Float32Array(particleCount * 3)
    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))

    const material = new THREE.PointsMaterial({
      size: isMobile ? 3.0 : 4.0,
      color: new THREE.Color(phrases[0].color),
      transparent: true,
      depthWrite: false,
      sizeAttenuation: true,
    })
    const group = new THREE.Group()
    group.add(new THREE.Points(geometry, material))
    scene.add(group)

    // Ambient background field: dim, wide, deep, drifts independently of the text.
    const ambientCount = isMobile ? 260 : 620
    const ambientNearZ = -depthExtrude * 1.4
    const ambientFarZ = -(cameraDistanceFor(height) * 1.6)
    const ambientVar = getComputedStyle(document.documentElement).getPropertyValue('--color-text-muted').trim()
    const ambientPositions = buildAmbientPositions(ambientCount, width, height, ambientNearZ, ambientFarZ)
    const ambientGeometry = new THREE.BufferGeometry()
    ambientGeometry.setAttribute('position', new THREE.BufferAttribute(ambientPositions, 3))
    const ambientMaterial = new THREE.PointsMaterial({
      size: isMobile ? 1.6 : 2.2,
      color: new THREE.Color(ambientVar || '#94a3b8'),
      transparent: true,
      opacity: 0.55,
      depthWrite: false,
      sizeAttenuation: true,
    })
    const ambientGroup = new THREE.Group()
    ambientGroup.add(new THREE.Points(ambientGeometry, ambientMaterial))
    scene.add(ambientGroup)

    const fontFor = () => {
      const size = isMobile ? 300 : 600
      return `700 ${size}px Montserrat, "SUIT Variable", "Noto Sans KR", sans-serif`
    }

    const buildTargetsForPhrase = (phrase) =>
      buildTargets(samplePoints(phrase.text, fontFor(), width, height, step, sampleScale), particleCount, depthExtrude)

    let targets = phrases.map(buildTargetsForPhrase)
    positions.set(targets[0])
    geometry.attributes.position.needsUpdate = true

    let phraseIndex = 0
    let stage = 'hold'
    let stageStart = performance.now()
    const startTime = stageStart
    let fromArr = targets[0]
    let toArr = targets[0]
    const fromColor = new THREE.Color(phrases[0].color)
    const toColor = new THREE.Color(phrases[0].color)

    let running = true
    const onVisibility = () => { running = document.visibilityState === 'visible' }
    document.addEventListener('visibilitychange', onVisibility)

    // Pointer parallax: nudges the auto-rotation toward the cursor, eases back on leave.
    const pointerTarget = { x: 0, y: 0 }
    const pointerOffset = { x: 0, y: 0 }
    const onPointerMove = (e) => {
      const rect = mount.getBoundingClientRect()
      pointerTarget.x = ((e.clientX - rect.left) / rect.width) * 2 - 1
      pointerTarget.y = ((e.clientY - rect.top) / rect.height) * 2 - 1
    }
    const onPointerLeave = () => { pointerTarget.x = 0; pointerTarget.y = 0 }
    mount.addEventListener('pointermove', onPointerMove)
    mount.addEventListener('pointerleave', onPointerLeave)

    const advance = () => {
      if (stage !== 'hold' || phrases.length < 2) return
      const nextIndex = (phraseIndex + 1) % phrases.length
      fromArr = targets[phraseIndex]
      toArr = targets[nextIndex]
      fromColor.set(phrases[phraseIndex].color)
      toColor.set(phrases[nextIndex].color)
      phraseIndex = nextIndex
      stage = 'morph'
      stageStart = performance.now()
    }
    const onClick = () => advance()
    const onKeyDown = (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault()
        advance()
      }
    }
    mount.addEventListener('click', onClick)
    mount.addEventListener('keydown', onKeyDown)

    let rafId
    const tick = (now) => {
      rafId = requestAnimationFrame(tick)
      if (!running) return

      const elapsed = now - stageStart

      if (stage === 'morph') {
        const t = Math.min(elapsed / MORPH_MS, 1)
        const eased = easeInOutQuad(t)
        for (let i = 0; i < positions.length; i++) {
          positions[i] = fromArr[i] + (toArr[i] - fromArr[i]) * eased
        }
        geometry.attributes.position.needsUpdate = true
        material.color.copy(fromColor).lerp(toColor, eased)
        if (t >= 1) {
          stage = 'hold'
          stageStart = now
        }
      }

      if (!reduceMotion) {
        const age = now - startTime
        pointerOffset.x += (pointerTarget.x - pointerOffset.x) * 0.05
        pointerOffset.y += (pointerTarget.y - pointerOffset.y) * 0.05
        group.rotation.y = Math.sin(age * 0.00025) * 0.55 + pointerOffset.x * 0.35
        group.rotation.x = Math.sin(age * 0.00017) * 0.18 - pointerOffset.y * 0.2
        ambientGroup.rotation.y = age * 0.00004
        ambientGroup.rotation.x = Math.sin(age * 0.00009) * 0.1
      }

      renderer.render(scene, camera)
    }
    rafId = requestAnimationFrame(tick)

    const handleResize = () => {
      width = mount.clientWidth
      height = mount.clientHeight
      if (!width || !height) return
      camera.aspect = width / height
      camera.position.z = cameraDistanceFor(height)
      camera.updateProjectionMatrix()
      renderer.setSize(width, height)
      targets = phrases.map(buildTargetsForPhrase)
      ambientPositions.set(
        buildAmbientPositions(ambientCount, width, height, -depthExtrude * 1.4, -(cameraDistanceFor(height) * 1.6)),
      )
      ambientGeometry.attributes.position.needsUpdate = true
    }
    const resizeObserver = new ResizeObserver(handleResize)
    resizeObserver.observe(mount)

    return () => {
      cancelAnimationFrame(rafId)
      resizeObserver.disconnect()
      document.removeEventListener('visibilitychange', onVisibility)
      mount.removeEventListener('pointermove', onPointerMove)
      mount.removeEventListener('pointerleave', onPointerLeave)
      mount.removeEventListener('click', onClick)
      mount.removeEventListener('keydown', onKeyDown)
      geometry.dispose()
      material.dispose()
      ambientGeometry.dispose()
      ambientMaterial.dispose()
      renderer.dispose()
      mount.removeChild(renderer.domElement)
    }
  }, [phrases])

  return <div className="hero-particle-canvas" ref={mountRef} aria-hidden="true" />
}

export default HeroParticleText
