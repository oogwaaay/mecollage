// Share utilities: build share URLs with UTM, Web Share integration, copy link
import { i18n } from './i18n.js';
import { seoManager } from './seo-manager.js';

function appendUTM(urlString, params) {
	const url = new URL(urlString, window.location.origin);
	const search = url.searchParams;
	Object.entries(params).forEach(([k, v]) => {
		if (v != null && v !== '') search.set(k, v);
	});
	url.search = search.toString();
	return url.toString();
}

export function getCanonicalForCurrent(pageOverride) {
	try {
		const page = pageOverride || (window.router?.currentPage || 'home');
		const config = seoManager.getSEOConfig(page);
		return config.canonical || window.location.href;
	} catch {
		return window.location.href;
	}
}

export function buildShareTargets({ url, title, text, campaign = 'share', medium = 'social' } = {}) {
	const shareUrl = url || getCanonicalForCurrent();
	const finalTitle = title || document.title || 'MeCollage';
	const finalText = text || finalTitle;

	const withUtm = (base, source, extra = {}) =>
		appendUTM(base, {
			utm_source: source,
			utm_medium: medium,
			utm_campaign: campaign,
			...extra
		});

	const encoded = encodeURIComponent;
	const u = encoded(shareUrl);
	const t = encoded(finalTitle);
	const tx = encoded(finalText);

	return [
		{ id: 'copy', labelKey: 'share.copyLink', href: '#', isAction: true },
		{ id: 'system', labelKey: 'share.systemShare', href: '#', isAction: true },
		{ id: 'twitter', labelKey: 'share.twitter', href: withUtm(`https://twitter.com/intent/tweet?text=${t}&url=${u}`, 'twitter') },
		{ id: 'facebook', labelKey: 'share.facebook', href: withUtm(`https://www.facebook.com/sharer/sharer.php?u=${u}`, 'facebook') },
		{ id: 'reddit', labelKey: 'share.reddit', href: withUtm(`https://www.reddit.com/submit?url=${u}&title=${t}`, 'reddit') },
		{ id: 'pinterest', labelKey: 'share.pinterest', href: withUtm(`https://pinterest.com/pin/create/button/?url=${u}&description=${tx}`, 'pinterest') },
		{ id: 'whatsapp', labelKey: 'share.whatsapp', href: withUtm(`https://api.whatsapp.com/send?text=${tx}%20${u}`, 'whatsapp') },
		{ id: 'telegram', labelKey: 'share.telegram', href: withUtm(`https://t.me/share/url?url=${u}&text=${tx}`, 'telegram') },
		{ id: 'linkedin', labelKey: 'share.linkedin', href: withUtm(`https://www.linkedin.com/sharing/share-offsite/?url=${u}`, 'linkedin') }
	];
}

export function renderShareLinks(container, options = {}) {
	if (!container) return;
	const targets = buildShareTargets(options);
	const label = i18n.t('blog.shareArticle');
	container.innerHTML = `
		<span class="blog-share-label">${label}</span>
		<div class="blog-share-links">
			${targets
				.map((t) => {
					return `<a href="${t.href}" class="blog-share-link share-${t.id}" data-share="${t.id}" rel="noopener" target="${t.isAction ? '_self' : '_blank'}">${i18n.t(t.labelKey)}</a>`;
				})
				.join('')}
		</div>
	`;
	attachShareHandlers(container, options);
}

export function attachShareHandlers(root, { url, title, text, campaign, medium } = {}) {
	if (!root) return;
	const shareUrl = url || getCanonicalForCurrent();
	const finalTitle = title || document.title || 'MeCollage';
	const finalText = text || finalTitle;

	root.addEventListener('click', async (e) => {
		const link = e.target.closest('a[data-share]');
		if (!link) return;
		const id = link.dataset.share;
		if (id === 'copy') {
			e.preventDefault();
			try {
				await navigator.clipboard.writeText(appendUTM(shareUrl, { utm_source: 'copy', utm_medium: medium || 'social', utm_campaign: campaign || 'share' }));
				showToast(i18n.t('share.copied'));
			} catch (err) {
				console.warn('Clipboard failed, fallback to prompt', err);
				window.prompt(i18n.t('share.copyPrompt'), shareUrl);
			}
		} else if (id === 'system') {
			e.preventDefault();
			if (navigator.share) {
				try {
					await navigator.share({ title: finalTitle, text: finalText, url: appendUTM(shareUrl, { utm_source: 'system', utm_medium: medium || 'social', utm_campaign: campaign || 'share' }) });
				} catch {
					// user canceled; no-op
				}
			} else {
				showToast(i18n.t('share.notSupported'));
			}
		}
	});
}

function showToast(message) {
	let toast = document.getElementById('globalToast');
	if (!toast) {
		toast = document.createElement('div');
		toast.id = 'globalToast';
		toast.className = 'toast';
		document.body.appendChild(toast);
	}
	toast.textContent = message;
	toast.classList.add('is-visible');
	window.clearTimeout(showToast._timer);
	showToast._timer = window.setTimeout(() => {
		toast.classList.remove('is-visible');
	}, 1800);
}

export const share = {
	appendUTM,
	getCanonicalForCurrent,
	buildShareTargets,
	renderShareLinks,
	attachShareHandlers
};


