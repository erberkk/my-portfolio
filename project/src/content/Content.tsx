import { useState, type FormEvent, type ReactNode } from 'react';
import { ArrowRight, ArrowUpRight, Check, Copy, LoaderCircle } from 'lucide-react';
import { experience, impact, profile, projects, stack, type SectionMeta } from '../data/site';
import { copyEmail } from '../lib/toast';
import { trackSpot } from '../lib/scroll';
import { GithubIcon, LinkedinIcon } from '../components/icons';
import Activity from '../components/Activity';
import Clock from '../components/Clock';
import s from './content.module.css';

type P = { compact?: boolean };
const wrap = (compact?: boolean) => (compact ? s.compact : undefined);

export function ImpactContent({ compact }: P) {
  return (
    <div className={`${s.metrics} ${wrap(compact) ?? ''}`}>
      {impact.map((m, i) => (
        <article key={m.label} className={`spot ${s.metric} ${i === 0 && !compact ? s.wide : ''}`} onPointerMove={trackSpot}>
          <div className={s.figure}>
            {m.display ?? <>{m.prefix}{m.value.toLocaleString('en-US')}<small>{m.suffix}</small></>}
          </div>
          <h3 className={s.label}>{m.label}</h3>
          <p className={s.detail}>{m.detail}</p>
          <ul className="chips" aria-label="Stack">{m.stack.map((t) => <li key={t} className="chip">{t}</li>)}</ul>
        </article>
      ))}
    </div>
  );
}

export function WorkContent({ compact }: P) {
  const featured = projects.filter((p) => p.featured);
  const rest = projects.filter((p) => !p.featured);
  return (
    <div className={wrap(compact)}>
      <div className={s.features}>
        {featured.map((p, i) => (
          <article key={p.slug} className={`spot ${s.feature}`} onPointerMove={trackSpot}>
            <span className={s.emblem} aria-hidden="true">{p.kanji}</span>
            <div className={s.featureTop}>
              <span className="mono">{String(i + 1).padStart(2, '0')} · {p.kind}</span>
              <span className="mono">{p.year}</span>
            </div>
            <h3 className={s.featureName}>{p.name}</h3>
            <p className={s.emblemNote}>{p.kanji} — {p.kanjiMeaning}</p>
            <p className={s.tagline}>{p.tagline}</p>
            <p className={s.blurb}>{p.blurb}</p>
            <ul className="chips" aria-label="Stack">{p.stack.map((t) => <li key={t} className="chip">{t}</li>)}</ul>
            <div className={s.featureFoot}>
              {p.status && <span className={s.status}><span className="dot-live" />{p.status}</span>}
              <a href={p.url} target="_blank" rel="noopener" className={s.visit}>{p.linkLabel} <ArrowUpRight size={15} /></a>
            </div>
          </article>
        ))}
      </div>
      <div className={s.moreHead}>
        <h3 className="mono">More projects</h3>
        <a href="https://github.com/erberkk?tab=repositories" target="_blank" rel="noopener">All repositories <ArrowUpRight size={14} /></a>
      </div>
      <ul className={s.list}>
        {rest.map((p) => (
          <li key={p.slug}>
            <a href={p.url} target="_blank" rel="noopener" className={s.row}>
              <span className={s.rowYear}>{p.year}</span>
              <span>
                <span className={s.rowName}>{p.name}</span>
                <span className={s.rowBlurb}>{p.blurb}</span>
              </span>
              <ArrowUpRight size={17} className={s.rowArrow} aria-hidden="true" />
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}

const facts: [string, ReactNode][] = [
  ['Based in', <>Istanbul · <Clock /></>],
  ['Currently', 'Aras Digital, full-stack'],
  ['Building', 'Stackmate and Pixy'],
  ['Languages', 'Turkish (native), English (fluent)'],
  ['Off-screen', 'Volunteering with LÖSEV'],
];

export function AboutContent({ compact }: P) {
  return (
    <div className={wrap(compact)}>
      <p className={s.statement}>
        I like the unglamorous work: the internal tool five thousand people open every morning, the routing job that runs
        before the couriers wake up. I build the <em>boring parts</em>, so the rest of the team can do the interesting ones.
      </p>
      <div className={s.aboutGrid}>
        <div className={s.bio}>
          <p>
            I've been shipping production software since 2024, while finishing a software engineering degree at Beykoz
            University. At work I sit close to operations: I talk to the people who will use the thing, then build it
            end-to-end across Angular, .NET and Python.
          </p>
          <p>
            After hours I build products I want to exist: a co-founder matching app on the App Store, a desktop robot that
            keeps Claude Code moving, and a handful of open-source tools. I also built this shrine.
          </p>
          <dl className={s.facts}>{facts.map(([k, v]) => <div key={k}><dt>{k}</dt><dd>{v}</dd></div>)}</dl>
        </div>
        <dl>
          {stack.map((g) => (
            <div key={g.group} className={s.stackRow}>
              <dt>{g.group}</dt>
              <dd><ul className="chips">{g.items.map((t) => <li key={t} className="chip">{t}</li>)}</ul></dd>
            </div>
          ))}
        </dl>
      </div>
      <Activity user={profile.githubUser} />
    </div>
  );
}

export function ExperienceContent({ compact }: P) {
  return (
    <ol className={`${s.timeline} ${wrap(compact) ?? ''}`}>
      {experience.map((r) => (
        <li key={r.title + r.when} className={`${s.step} ${r.current ? s.current : ''}`}>
          <div className={s.when}>{r.when}</div>
          <h3 className={s.stepTitle}>{r.title}</h3>
          <div className={s.org}>{r.org}</div>
          <p className={s.note}>{r.note}</p>
          {r.points && <ul className={s.points}>{r.points.map((p) => <li key={p}>{p}</li>)}</ul>}
        </li>
      ))}
    </ol>
  );
}

type Status = { kind: 'idle' | 'sending' | 'sent' | 'error'; message?: string };

export function ContactContent({ compact }: P) {
  const [status, setStatus] = useState<Status>({ kind: 'idle' });
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = new FormData(form);
    setStatus({ kind: 'sending' });
    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: String(fd.get('name') ?? '').trim(),
          email: String(fd.get('email') ?? '').trim(),
          message: String(fd.get('message') ?? '').trim(),
          botcheck: !!fd.get('botcheck'),
        }),
      });
      const j = await res.json().catch(() => ({}));
      if (res.ok && j.success) { form.reset(); setStatus({ kind: 'sent' }); }
      else setStatus({ kind: 'error', message: j.message || 'That did not go through.' });
    } catch {
      setStatus({ kind: 'error', message: 'Network error.' });
    }
  }
  return (
    <div className={`${s.contactGrid} ${wrap(compact) ?? ''}`}>
      <div>
        <p className={s.lead}>A question about something I built, an idea worth talking through, or just saying hello: email is the fastest way to reach me.</p>
        <div className={s.emailRow}>
          <a href={`mailto:${profile.email}`} className={s.email}>{profile.email}</a>
          <button className={s.iconBtn} onClick={copyEmail} aria-label="Copy email address"><Copy size={15} /></button>
        </div>
        <ul className={s.links}>
          <li><a href={profile.github} target="_blank" rel="noopener"><GithubIcon size={16} /> GitHub <ArrowUpRight size={14} className={s.out} /></a></li>
          <li><a href={profile.linkedin} target="_blank" rel="noopener"><LinkedinIcon size={16} /> LinkedIn <ArrowUpRight size={14} className={s.out} /></a></li>
          {profile.cv && <li><a href={profile.cv} target="_blank" rel="noopener">Résumé (PDF) <ArrowUpRight size={14} className={s.out} /></a></li>}
        </ul>
      </div>
      <form className={`spot ${s.form}`} onSubmit={submit} onPointerMove={trackSpot}>
        <input type="checkbox" name="botcheck" className={s.honey} tabIndex={-1} autoComplete="off" aria-hidden="true" />
        <div className={s.row2}>
          <label className={s.field}><span>Name</span><input name="name" required maxLength={120} autoComplete="name" placeholder="Ada Lovelace" /></label>
          <label className={s.field}><span>Email</span><input name="email" type="email" required maxLength={200} autoComplete="email" placeholder="you@company.com" /></label>
        </div>
        <label className={s.field}><span>Message</span><textarea name="message" required maxLength={5000} rows={4} placeholder="What are you trying to build, ship, or fix?" /></label>
        <div className={s.formFoot}>
          <p className={s.formStatus} role="status" aria-live="polite" data-kind={status.kind}>
            {status.kind === 'sent' && <><Check size={14} /> Sent. I'll get back to you soon.</>}
            {status.kind === 'error' && <>{status.message} You can also email me directly.</>}
          </p>
          <button type="submit" className="btn btn-primary" disabled={status.kind === 'sending'}>
            {status.kind === 'sending' ? <><LoaderCircle className={s.spin} /> Sending</> : <>Send <ArrowRight className="arrow" /></>}
          </button>
        </div>
      </form>
    </div>
  );
}

export const CONTENT: Record<SectionMeta['id'], (p: P) => ReactNode> = {
  impact: ImpactContent,
  work: WorkContent,
  about: AboutContent,
  experience: ExperienceContent,
  contact: ContactContent,
};
