import { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import { useTheme } from '../context/ThemeContext'

function ThreeAiCore({ size = 260, interactive = true }) {
  const containerRef = useRef(null)
  const [hasWebGL, setHasWebGL] = useState(true)
  const { resolvedTheme } = useTheme()

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    // Check prefers-reduced-motion
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches

    // Check WebGL availability
    let renderer
    try {
      renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: 'low-power' })
    } catch {
      setHasWebGL(false)
      return
    }

    renderer.setSize(size, size)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    container.appendChild(renderer.domElement)

    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 1000)
    camera.position.z = 5.2

    // Color tuning based on resolvedTheme
    const isLight = resolvedTheme === 'light'
    const primaryHex = isLight ? 0x0284c7 : 0x00f0ff
    const innerHex = isLight ? 0x7c3aed : 0x8b5cf6
    const tealHex = isLight ? 0x0d9488 : 0x00e5a3

    // Outer wireframe icosahedron (Cyber Core)
    const icoGeometry = new THREE.IcosahedronGeometry(1.6, 1)
    const icoMaterial = new THREE.MeshBasicMaterial({
      color: primaryHex,
      wireframe: true,
      transparent: true,
      opacity: isLight ? 0.6 : 0.35,
    })
    const icoMesh = new THREE.Mesh(icoGeometry, icoMaterial)
    scene.add(icoMesh)

    // Inner glowing core
    const innerGeometry = new THREE.IcosahedronGeometry(0.9, 2)
    const innerMaterial = new THREE.MeshBasicMaterial({
      color: innerHex,
      wireframe: true,
      transparent: true,
      opacity: isLight ? 0.8 : 0.7,
    })
    const innerMesh = new THREE.Mesh(innerGeometry, innerMaterial)
    scene.add(innerMesh)

    // Orbital Particle Ring
    const particleCount = 180
    const particleGeometry = new THREE.BufferGeometry()
    const positions = new Float32Array(particleCount * 3)
    const colors = new Float32Array(particleCount * 3)

    const color1 = new THREE.Color(primaryHex)
    const color2 = new THREE.Color(tealHex)
    const color3 = new THREE.Color(innerHex)

    for (let i = 0; i < particleCount; i++) {
      const angle = (i / particleCount) * Math.PI * 2
      const radius = 2.1 + (Math.random() - 0.5) * 0.4
      const x = Math.cos(angle) * radius
      const y = (Math.random() - 0.5) * 0.5
      const z = Math.sin(angle) * radius

      positions[i * 3] = x
      positions[i * 3 + 1] = y
      positions[i * 3 + 2] = z

      const chosenColor = i % 3 === 0 ? color1 : i % 3 === 1 ? color2 : color3
      colors[i * 3] = chosenColor.r
      colors[i * 3 + 1] = chosenColor.g
      colors[i * 3 + 2] = chosenColor.b
    }

    particleGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    particleGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3))

    const particleMaterial = new THREE.PointsMaterial({
      size: isLight ? 0.065 : 0.05,
      vertexColors: true,
      transparent: true,
      opacity: isLight ? 0.95 : 0.85,
    })

    const particleSystem = new THREE.Points(particleGeometry, particleMaterial)
    scene.add(particleSystem)

    // Mouse movement interaction
    let mouseX = 0
    let mouseY = 0
    let targetX = 0
    let targetY = 0

    const handleMouseMove = (event) => {
      if (!interactive) return
      const rect = container.getBoundingClientRect()
      const x = event.clientX - rect.left - rect.width / 2
      const y = event.clientY - rect.top - rect.height / 2
      targetX = (x / rect.width) * 0.8
      targetY = (y / rect.height) * 0.8
    }

    window.addEventListener('mousemove', handleMouseMove)

    // Animation loop
    let animationFrameId
    let isVisible = true

    const observer = new IntersectionObserver(([entry]) => {
      isVisible = entry.isIntersecting
    })
    observer.observe(container)

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate)
      if (!isVisible || prefersReducedMotion) return

      mouseX += (targetX - mouseX) * 0.05
      mouseY += (targetY - mouseY) * 0.05

      icoMesh.rotation.x += 0.003
      icoMesh.rotation.y += 0.005
      icoMesh.rotation.y += mouseX * 0.02
      icoMesh.rotation.x += mouseY * 0.02

      innerMesh.rotation.x -= 0.006
      innerMesh.rotation.y -= 0.008

      particleSystem.rotation.y += 0.004
      particleSystem.rotation.z = Math.sin(Date.now() * 0.001) * 0.2

      renderer.render(scene, camera)
    }

    animate()

    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      observer.disconnect()
      cancelAnimationFrame(animationFrameId)
      if (renderer.domElement && container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement)
      }
      renderer.dispose()
      icoGeometry.dispose()
      icoMaterial.dispose()
      innerGeometry.dispose()
      innerMaterial.dispose()
      particleGeometry.dispose()
      particleMaterial.dispose()
    }
  }, [size, interactive, resolvedTheme])

  if (!hasWebGL) {
    return (
      <div
        className="fallback-3d-orb"
        style={{
          width: size,
          height: size,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(0,240,255,0.4) 0%, rgba(139,92,246,0.2) 60%, transparent 80%)',
          boxShadow: '0 0 35px rgba(0,240,255,0.35)',
          display: 'grid',
          placeItems: 'center',
          border: '1px solid rgba(0,240,255,0.3)',
          animation: 'pulseGlow 4s ease-in-out infinite',
        }}
      >
        <div
          style={{
            width: size * 0.5,
            height: size * 0.5,
            borderRadius: '50%',
            border: '2px dashed var(--cyan)',
            animation: 'spin 12s linear infinite',
          }}
        />
      </div>
    )
  }

  return (
    <div
      ref={containerRef}
      style={{
        width: size,
        height: size,
        display: 'grid',
        placeItems: 'center',
        position: 'relative',
        filter: resolvedTheme === 'light'
          ? 'drop-shadow(0 0 16px rgba(2, 132, 199, 0.2))'
          : 'drop-shadow(0 0 20px rgba(0, 240, 255, 0.25))',
      }}
    />
  )
}

export default ThreeAiCore
