"use client";
import { useEffect, useRef, useState } from "react";

export default function CustomCursor() {
	const dotRef = useRef<HTMLDivElement>(null);
	const [isHovering, setIsHovering] = useState(false);
	const [isVisible, setIsVisible] = useState(false);
	const [isTouch, setIsTouch] = useState(false);
	const mousePos = useRef({ x: -100, y: -100 });
	const currentPos = useRef({ x: -100, y: -100, scale: 1 });
	const rafId = useRef<number>(0);
	const isHoveringRef = useRef(false);

	// Lerp smoothing factor
	const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

	// Check if this is a touch device on mound
	useEffect(() => {
		const isT = window.matchMedia("(pointer: coarse)").matches;
		setTimeout(() => setIsTouch(isT), 0);
	}, []);

	// Keep hover ref in sync
	useEffect(() => {
		isHoveringRef.current = isHovering;
	}, [isHovering]);

	useEffect(() => {
		if (isTouch) return;

		// Hide native cursor
		const style = document.createElement("style");
		style.id = "hide-native-cursor";
		style.textContent = "*, *::before, *::after { cursor: none !important; }";
		document.head.appendChild(style);

		const updateMouse = (e: MouseEvent) => {
			if (!isVisible) setIsVisible(true);
			mousePos.current = { x: e.clientX, y: e.clientY };
			// Direct 1:1 position update — no LERP delay
			if (dotRef.current) {
				dotRef.current.style.transform = `translate(${e.clientX - 10}px, ${e.clientY - 10}px) scale(${currentPos.current.scale})`;
			}
		};

		const handleMouseOver = (e: MouseEvent) => {
			const target = e.target as HTMLElement;
			if (!target) return;
			const cs = window.getComputedStyle(target);
			setIsHovering(
				cs.cursor === "pointer" ||
				cs.cursor === "crosshair" ||
				!!target.closest("button") ||
				!!target.closest("a")
			);
		};

		// RAF loop — only for smooth hover scale animation
		const tick = () => {
			const targetScale = isHoveringRef.current ? 1.3 : 1;
			currentPos.current.scale = lerp(currentPos.current.scale, targetScale, 0.15);

			if (dotRef.current) {
				dotRef.current.style.transform = `translate(${mousePos.current.x - 10}px, ${mousePos.current.y - 10}px) scale(${currentPos.current.scale})`;
			}
			rafId.current = requestAnimationFrame(tick);
		};

		window.addEventListener("mousemove", updateMouse, { passive: true });
		window.addEventListener("mouseover", handleMouseOver, { passive: true });
		rafId.current = requestAnimationFrame(tick);

		return () => {
			window.removeEventListener("mousemove", updateMouse);
			window.removeEventListener("mouseover", handleMouseOver);
			cancelAnimationFrame(rafId.current);
			const el = document.getElementById("hide-native-cursor");
			if (el) el.remove();
		};
	}, [isVisible, isTouch]);

	if (isTouch || !isVisible) return null;

	return (
		<div
			ref={dotRef}
			style={{
				position: "fixed",
				top: 0,
				left: 0,
				width: 20,
				height: 20,
				borderRadius: "50%",
				// Lightweight glow — NO backdrop-filter (kills GPU on WebGL scenes)
				background: isHovering
					? "radial-gradient(circle, rgba(0,255,65,0.15) 0%, rgba(0,255,65,0.02) 60%, transparent 100%)"
					: "radial-gradient(circle, rgba(255,255,255,0.25) 0%, rgba(255,255,255,0.05) 60%, transparent 100%)",
				border: isHovering ? "1px solid rgba(0, 255, 65, 0.5)" : "1px solid rgba(255,255,255,0.35)",
				pointerEvents: "none",
				zIndex: 99999,
				boxShadow: isHovering
					? "0 0 12px rgba(0,255,65,0.3), inset 0 0 4px rgba(0,255,65,0.15)"
					: "0 0 6px rgba(255,255,255,0.1)",
				transition: "background 0.3s ease, border 0.3s ease, box-shadow 0.3s ease",
				willChange: "transform",
			}}
		/>
	);
}
