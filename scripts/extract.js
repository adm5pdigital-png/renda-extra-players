async (page) => {
  const q = decodeURIComponent((page.url().match(/[?&]q=([^&]*)/) || [])[1] || '').replace(/\+/g, ' ');
  const count = () => page.evaluate(() => (document.body.innerText.match(/Identificação da biblioteca/g) || []).length);
  await page.waitForTimeout(3000);
  let prev = -1, stable = 0;
  for (let i = 0; i < 25 && stable < 3; i++) {
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    const more = page.getByRole('button', { name: 'Ver mais' });
    if (await more.count()) { try { await more.first().click({ timeout: 2000 }); } catch (e) {} }
    await page.waitForTimeout(2200);
    const c = await count();
    if (c === prev) stable++; else stable = 0;
    prev = c;
  }
  return await page.evaluate((q) => {
    const total = (document.body.innerText.match(/~?[\d.,]+ resultados?/) || [''])[0];
    const nodes = [...document.querySelectorAll('span,div')].filter(e => e.childElementCount === 0 && /^Identificação da biblioteca:/.test(e.textContent));
    const byPage = {};
    const months = { jan: 0, fev: 1, mar: 2, abr: 3, mai: 4, jun: 5, jul: 6, ago: 7, set: 8, out: 9, nov: 10, dez: 11 };
    const toDate = s => { const m = s && s.match(/(\d+) de (\w+) de (\d+)/); return m ? new Date(+m[3], months[m[2]], +m[1]) : null; };
    for (const n of nodes) {
      let c = n;
      while (c.parentElement && (c.parentElement.innerText.match(/Identificação da biblioteca/g) || []).length === 1) c = c.parentElement;
      const t = c.innerText;
      const as = [...c.querySelectorAll('a')];
      const pa = as.find(a => /facebook\.com\/(?!l\.php|ads)/.test(a.href) && a.innerText.trim());
      const out = as.find(a => a.href.includes('l.facebook.com/l.php'));
      let dest = '';
      if (out) { const m = out.href.match(/[?&]u=([^&]*)/); if (m) dest = decodeURIComponent(m[1]); }
      if (!dest) { const m = t.match(/\n([A-Z0-9.-]+\.[A-Z]{2,}(?:\.[A-Z]{2})?)\/?\n/); if (m) dest = m[1].toLowerCase(); }
      const nm = t.match(/(\d+) anúncios usam/);
      const start = (t.match(/Veiculação iniciada em ([^\n]+)/) || [])[1];
      const key = pa ? pa.href : 'desconhecido';
      const p = byPage[key] ||= { page: pa ? pa.innerText.trim() : '?', url: key, ads: 0, cards: 0, first: null, firstStr: '', firstId: '', dests: [], sample: '' };
      p.ads += nm ? +nm[1] : 1; p.cards++;
      const d = toDate(start);
      if (d && (!p.first || d < p.first)) { p.first = d; p.firstStr = start; p.firstId = (t.match(/biblioteca: (\d+)/) || [])[1]; }
      const host = dest.replace(/^https?:\/\//, '').split('?')[0].slice(0, 70);
      if (host && !p.dests.includes(host) && p.dests.length < 3) p.dests.push(host);
      if (!p.sample) p.sample = (t.split('Patrocinado')[1] || '').trim().slice(0, 110).replace(/\n+/g, ' | ');
    }
    const list = Object.values(byPage).sort((a, b) => b.ads - a.ads).slice(0, 40).map(p => ({ page: p.page, url: p.url.replace('https://www.facebook.com/',''), ads: p.ads, first: p.firstStr.slice(0,14), id: p.firstId, dests: p.dests.slice(0,2), s: p.sample.slice(0,70) }));
    return { q, total, cardsLoaded: nodes.length, pages: list };
  }, q);
}
