import { useEffect, useState } from 'react';

export default function NoiseOverlay() {
	const [dataUrl, setDataUrl] = useState<string>('');

	useEffect(() => {
		const canvas = document.createElement('canvas');
		canvas.width = 128;
		canvas.height = 128;
		const ctx = canvas.getContext('2d');
		if (!ctx) return;

		const imgData = ctx.createImageData(128, 128);
		const buf = new Uint32Array(imgData.data.buffer);

		// Generate uniform monochrome noise
		for (let i = 0; i < buf.length; i++) {
			const val = Math.floor(Math.random() * 256);
			// little endian: ABGR
			buf[i] = (255 << 24) | (val << 16) | (val << 8) | val;
		}
		ctx.putImageData(imgData, 0, 0);
		setDataUrl(canvas.toDataURL('image/png'));
	}, []);

	if (!dataUrl) return null;

	return (
		<div
			style={{
				position: 'fixed',
				inset: 0,
				zIndex: 9999,
				pointerEvents: 'none',
				backgroundImage: `url(${dataUrl})`,
				backgroundRepeat: 'repeat',
				opacity: 0.02, // Adds approx 0-5 brightness values of white noise
				mixBlendMode: 'screen',
			}}
		/>
	);
}
