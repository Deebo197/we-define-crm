import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { url } = await req.json();
    if (!url) return Response.json({ error: 'URL required' }, { status: 400 });

    // LinkedIn blocks direct server-side fetches (999). Try the Wayback Machine
    // which archives LinkedIn pages with og:image meta tags intact.
    const cleanUrl = url.replace(/^https?:\/\//, '').replace(/\/$/, '');

    // Step 1: Check if the Wayback Machine has a snapshot
    const availabilityUrl = `https://archive.org/wayback/available?url=${encodeURIComponent(cleanUrl)}`;
    const availRes = await fetch(availabilityUrl, {
      headers: { 'Accept': 'application/json', 'User-Agent': 'Mozilla/5.0' },
    });
    const availData = await availRes.json();

    let html = null;
    let source = null;

    if (availData?.archived_snapshots?.closest?.available) {
      const snapshotUrl = availData.archived_snapshots.closest.url;
      source = 'wayback';

      const snapshotRes = await fetch(snapshotUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml',
        },
        redirect: 'follow',
      });

      if (snapshotRes.ok) {
        html = await snapshotRes.text();
      }
    }

    // Step 2: Try direct fetch as fallback
    if (!html) {
      source = 'direct';
      try {
        const directRes = await fetch(url, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml',
            'Accept-Language': 'en-US,en;q=0.9',
            'Sec-Fetch-Dest': 'document',
            'Sec-Fetch-Mode': 'navigate',
            'Sec-Fetch-Site': 'none',
            'Sec-Fetch-User': '?1',
            'Upgrade-Insecure-Requests': '1',
          },
          redirect: 'follow',
        });
        if (directRes.ok) {
          html = await directRes.text();
        }
      } catch (e) {
        // Direct fetch failed — continue with whatever we have
      }
    }

    if (!html) {
      return Response.json({ photo_url: null, error: 'Could not fetch page from any source' });
    }

    // Extract og:image from meta tags (handles either attribute order)
    let photoUrl = null;
    const metaTags = html.matchAll(/<meta\s+([^>]+)>/gi);
    for (const match of metaTags) {
      const attrs = match[1];
      if (/og:image["'\s]/i.test(attrs) || /og:image:url/i.test(attrs)) {
        const contentMatch = attrs.match(/content=["']([^"']+)["']/i);
        if (contentMatch) {
          photoUrl = contentMatch[1];
          break;
        }
      }
    }

    // Also try to extract title and description for verification
    let pageTitle = null;
    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    if (titleMatch) pageTitle = titleMatch[1].trim();

    let description = null;
    const descMatch = html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']+)["']/i)
      || html.match(/<meta[^>]*content=["']([^"']+)["'][^>]*name=["']description["']/i);
    if (descMatch) description = descMatch[1].trim();

    // Decode HTML entities in the URL and upgrade to HTTPS
    if (photoUrl) {
      photoUrl = photoUrl.replace(/&amp;/g, '&').replace(/^http:\/\//, 'https://');
    }

    return Response.json({ photo_url: photoUrl, page_title: pageTitle, description, source });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});