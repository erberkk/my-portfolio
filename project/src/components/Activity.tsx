import { useEffect, useMemo, useState } from 'react';
import { ArrowUpRight } from 'lucide-react';
import { GithubIcon } from './icons';
import s from './Activity.module.css';

type Day = { date: string; count: number; level: 0 | 1 | 2 | 3 | 4 };
type Data = { days: Day[]; total: number };

const CACHE_KEY = 'gh-activity-v2';
const TTL = 6 * 60 * 60 * 1000;

async function load(user: string): Promise<Data> {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (raw) {
      const c = JSON.parse(raw);
      if (c.user === user && Date.now() - c.ts < TTL) return c.data;
    }
  } catch { /* storage unavailable */ }

  // One request for the trailing twelve months.
  const res = await fetch(`https://github-contributions-api.jogruber.de/v4/${user}?y=last`);
  if (!res.ok) throw new Error(`contributions ${res.status}`);
  const json = await res.json();
  const data: Data = { days: json.contributions ?? [], total: json.total?.lastYear ?? 0 };
  try { localStorage.setItem(CACHE_KEY, JSON.stringify({ user, ts: Date.now(), data })); } catch { /* ignore */ }
  return data;
}

function streaks(days: Day[]) {
  let longest = 0, run = 0;
  for (const d of days) {
    run = d.count > 0 ? run + 1 : 0;
    longest = Math.max(longest, run);
  }
  // Today not having a commit yet shouldn't break the current streak.
  let current = 0;
  for (let i = days.length - 1; i >= 0; i--) {
    if (days[i].count > 0) current++;
    else if (i === days.length - 1) continue;
    else break;
  }
  return { longest, current };
}

export default function Activity({ user }: { user: string }) {
  const [data, setData] = useState<Data | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let alive = true;
    load(user).then((d) => alive && setData(d)).catch(() => alive && setFailed(true));
    return () => { alive = false; };
  }, [user]);

  // Pad the front so the first column starts on Sunday, like GitHub's graph.
  const cells = useMemo(() => {
    if (!data?.days.length) return Array.from({ length: 53 * 7 }, () => null);
    const first = new Date(data.days[0].date + 'T00:00:00');
    return [...Array.from({ length: first.getDay() }, () => null), ...data.days];
  }, [data]);

  const st = useMemo(() => (data ? streaks(data.days) : null), [data]);
  const fmt = (d: string) => new Date(d + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

  return (
    <div className={`spot ${s.card}`}>
      <div className={s.head}>
        <div className={s.title}>
          <GithubIcon size={18} />
          <span>Commit activity</span>
          <span className="mono">· last 12 months</span>
        </div>
        <a href={`https://github.com/${user}`} target="_blank" rel="noopener" className={s.link}>
          github.com/{user} <ArrowUpRight size={14} />
        </a>
      </div>

      <div className={s.scroller}>
        <div className={`${s.grid} ${data ? s.ready : ''}`} role="img" aria-label={data ? `${data.total} contributions in the last year` : 'Loading contribution graph'}>
          {cells.map((d, i) =>
            d ? <span key={i} data-l={d.level} title={`${d.count} contribution${d.count === 1 ? '' : 's'} · ${fmt(d.date)}`} />
              : <span key={i} data-empty />,
          )}
        </div>
      </div>

      <div className={s.foot}>
        <dl className={s.stats}>
          <div><dt>Contributions</dt><dd>{data ? data.total.toLocaleString('en-US') : failed ? 'n/a' : '—'}</dd></div>
          <div><dt>Current streak</dt><dd>{st ? `${st.current} d` : '—'}</dd></div>
          <div><dt>Longest streak</dt><dd>{st ? `${st.longest} d` : '—'}</dd></div>
        </dl>
        <div className={s.legend} aria-hidden="true">
          less {[0, 1, 2, 3, 4].map((l) => <span key={l} data-l={l} />)} more
        </div>
      </div>
    </div>
  );
}
