async (page) => {
  const BATCH = __BATCH__;
  const out = [];
  for (const it of BATCH) {
    const r = { name: it.name };
    try {
      await page.goto('https://www.facebook.com/ads/library/?id=' + it.lib, { timeout: 30000 });
      await page.waitForTimeout(4000);
      let pid = await page.evaluate(() => { const a = [...document.querySelectorAll('a')].map(a => a.href).find(h => /view_all_page_id=\d+/.test(h)); return a ? a.match(/view_all_page_id=(\d+)/)[1] : ''; });
      if (!pid) pid = await page.evaluate(() => { const m = document.documentElement.innerHTML.match(/"page_id":"(\d+)"/); return m ? m[1] : ''; });
      r.pid = pid;
      await page.goto(`https://www.facebook.com/ads/library/?active_status=active&ad_type=all&country=BR&media_type=all&search_type=page&view_all_page_id=${pid}`, { timeout: 30000 });
      await page.waitForTimeout(4500);
      let prev=-1, stable=0, it2=0;
      while (stable < 3 && it2 < 12) {
        await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
        await page.waitForTimeout(1800);
        const c = await page.evaluate(() => (document.body.innerText.match(/Identificação da biblioteca/g) || []).length);
        stable = c === prev ? stable + 1 : 0; prev = c; it2++;
      }
      const info = await page.evaluate(() => {
        const months = { jan:0,fev:1,mar:2,abr:3,mai:4,jun:5,jul:6,ago:7,set:8,out:9,nov:10,dez:11 };
        const body = document.body.innerText;
        const total = (body.match(/~?[\d.,]+ resultados?/) || [''])[0];
        const starts = [...body.matchAll(/Veiculação iniciada em (\d+ de \w+ de \d+)/g)].map(m=>m[1]);
        let min=null,minS='';
        for (const s of starts){const m=s.match(/(\d+) de (\w+) de (\d+)/);const d=new Date(+m[3],months[m[2]],+m[1]);if(!min||d<min){min=d;minS=s;}}
        const hrefs = [...document.querySelectorAll('a')].map(a=>a.href).filter(h=>h.includes('l.facebook.com/l.php'));
        const dests={};
        for (const h of hrefs){const m=h.match(/[?&]u=([^&]*)/);if(m){const u=decodeURIComponent(m[1]).split('?')[0];dests[u]=(dests[u]||0)+1;}}
        const name = (body.match(/\n([^\n]+)\nPatrocinado/)||[])[1] || (body.match(/\n([^\n]+)\nAnúncios\nSobre/)||[])[1] || '';
        return { total, loaded: starts.length, oldest: minS, pageName: name, dests: Object.entries(dests).sort((a,b)=>b[1]-a[1]).slice(0,3) };
      });
      Object.assign(r, info);
    } catch (e) { r.err = String(e).slice(0,150); }
    out.push(r);
  }
  return out;
}
