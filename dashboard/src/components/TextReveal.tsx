import React, { useEffect, useRef, useState } from 'react';

interface TextRevealProps {
	children: string;
	className?: string;
	delay?: number;
}

export default function TextReveal({ children, className = '', delay = 0 }: TextRevealProps) {
	const containerRef = useRef<HTMLDivElement>(null);
	const [inView, setInView] = useState(false);

	useEffect(() => {
		const observer = new IntersectionObserver(
			([entry]) => {
				if (entry.isIntersecting) {
					setInView(true);
					observer.disconnect();
				}
			},
			{ threshold: 0.1, rootMargin: '0px 0px -50px 0px' }
		);

		if (containerRef.current) {
			observer.observe(containerRef.current);
		}

		return () => observer.disconnect();
	}, []);

	// Split text into words for staggered animation
	const words = children.split(' ');

	return (
		<span 
			ref={containerRef} 
			className={`text-reveal-container ${inView ? 'is-revealed' : ''} ${className}`}
			style={{ '--stagger-delay': `${delay}s` } as React.CSSProperties}
		>
			{words.map((word, i) => (
				<span key={i} className="text-reveal-word-wrap">
					<span 
						className="text-reveal-word" 
						style={{ transitionDelay: `calc(var(--stagger-delay) + ${i * 0.05}s)` }}
					>
						{word}
					</span>
					{i < words.length - 1 && '\u00A0'}
				</span>
			))}
		</span>
	);
}
