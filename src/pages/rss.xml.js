import rss from '@astrojs/rss';
import { SITE_TITLE, SITE_DESCRIPTION } from '../consts';
import { getDb } from '../db';
import { listArticles } from '../lib/repo/articles';

export const prerender = false;

// Últimos 50 artículos publicados en D1.
export async function GET(context) {
	const { articles } = await listArticles(getDb(context.locals), { page: 1, pageSize: 50 });
	return rss({
		title: SITE_TITLE,
		description: SITE_DESCRIPTION,
		site: context.site,
		items: articles.map((article) => ({
			title: article.title,
			description: article.description,
			pubDate: new Date(article.pubDate),
			categories: article.category ? [article.category] : [],
			link: `/news/${article.slug}/`,
		})),
	});
}
