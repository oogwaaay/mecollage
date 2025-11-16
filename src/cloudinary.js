// Cloudinary unsigned upload helper
const CLOUD_NAME = 'dztbpf6ke';
const UPLOAD_PRESET = 'public_works_unsigned';

export async function uploadImageBlob(blob, { folder = 'works', fileName = `collage-${Date.now()}.jpg`, tags = ['mecollage'] } = {}) {
	const url = `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`;
	const form = new FormData();
	form.append('file', blob, fileName);
	form.append('upload_preset', UPLOAD_PRESET);
	if (folder) form.append('folder', folder);
	if (tags && tags.length) form.append('tags', tags.join(','));
	// Recommended: set context if needed, or transformation defaults on account/preset
	const resp = await fetch(url, { method: 'POST', body: form });
	if (!resp.ok) {
		const text = await resp.text().catch(() => '');
		throw new Error(`Cloudinary upload failed: ${resp.status} ${text}`);
	}
	return await resp.json(); // { secure_url, public_id, width, height, format, ... }
}

export function buildCloudinaryPagePublicId(publicId) {
	// Normalize public id for route usage
	return encodeURIComponent(publicId);
}

export function getCloudinaryImageUrl(publicId, options = {}) {
	// Simple pass-through URL (we already receive secure_url in response),
	// but provide helper for potential transformations later.
	const base = `https://res.cloudinary.com/${CLOUD_NAME}/image/upload/`;
	const { transformation = '' } = options;
	return `${base}${transformation}${publicId}`;
}


