import { useEffect, useMemo, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import { ArrowUpRight, AtSign, Copy, CornerDownLeft, FileText, Hash, Search, Swords } from 'lucide-react';
import { nav, profile, projects } from '../data/site';
import { scrollToId } from '../lib/scroll';
import { startGame } from '../ui/Hud';
import { copyEmail } from '../lib/toast';
import { GithubIcon, LinkedinIcon } from './icons';
import s from './CommandMenu.module.css';

type Item = { id: string; group: string; label: string; hint?: string; icon: ReactNode; run: () => void };

export default function CommandMenu({ open, onClose }: { open: boolean; onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const list = useRef<HTMLUListElement>(null);
  const [query, setQuery] = useState('');
  const [index, setIndex] = useState(0);

  const items = useMemo<Item[]>(() => {
    const out: Item[] = [
      ...nav.map((n) => ({ id: `go-${n.id}`, group: 'Go to', label: n.label, icon: <Hash size={15} />, run: () => scrollToId(n.id) })),
      { id: 'copy', group: 'Actions', label: 'Copy email address', hint: profile.email, icon: <Copy size={15} />, run: copyEmail },
      { id: 'play', group: 'Actions', label: 'Walk the shrine (play)', hint: 'WASD · click to cut', icon: <Swords size={15} />, run: () => { window.scrollTo({ top: 0 }); startGame(true); } },
      { id: 'mail', group: 'Links', label: 'Send an email', hint: 'mailto', icon: <AtSign size={15} />, run: () => { location.href = `mailto:${profile.email}`; } },
      { id: 'gh', group: 'Links', label: 'GitHub', hint: 'github.com/erberkk', icon: <GithubIcon size={15} />, run: () => window.open(profile.github, '_blank', 'noopener') },
      { id: 'li', group: 'Links', label: 'LinkedIn', hint: 'in/erberk-akbulut', icon: <LinkedinIcon size={15} />, run: () => window.open(profile.linkedin, '_blank', 'noopener') },
      ...projects.map((p) => ({
        id: `p-${p.slug}`, group: 'Projects', label: p.name, hint: p.kind, icon: <ArrowUpRight size={15} />,
        run: () => window.open(p.url, '_blank', 'noopener'),
      })),
    ];
    if (profile.cv) {
      const cv = profile.cv;
      out.splice(nav.length, 0, { id: 'cv', group: 'Actions', label: 'Open résumé (PDF)', icon: <FileText size={15} />, run: () => window.open(cv, '_blank', 'noopener') });
    }
    return out;
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter((i) => `${i.label} ${i.hint ?? ''} ${i.group}`.toLowerCase().includes(q));
  }, [items, query]);

  useEffect(() => {
    const d = dialog.current;
    if (!d) return;
    if (open && !d.open) {
      d.showModal();
      setQuery('');
      setIndex(0);
      requestAnimationFrame(() => input.current?.focus());
    } else if (!open && d.open) {
      d.close();
    }
  }, [open]);

  useEffect(() => setIndex(0), [query]);

  useEffect(() => {
    list.current?.querySelector<HTMLElement>(`[data-i="${index}"]`)?.scrollIntoView({ block: 'nearest' });
  }, [index]);

  const run = (item?: Item) => {
    if (!item) return;
    onClose();
    // Let the dialog close before scrolling so the page is interactive again.
    requestAnimationFrame(() => item.run());
  };

  const onKey = (e: KeyboardEvent) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setIndex((i) => Math.min(filtered.length - 1, i + 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setIndex((i) => Math.max(0, i - 1)); }
    else if (e.key === 'Enter') { e.preventDefault(); run(filtered[index]); }
  };

  let lastGroup = '';
  return (
    <dialog
      ref={dialog}
      className={s.dialog}
      onClose={onClose}
      onClick={(e) => { if (e.target === dialog.current) onClose(); }}
      aria-label="Command menu"
      data-lenis-prevent
    >
      <div className={s.panel} onKeyDown={onKey}>
        <label className={s.search}>
          <Search size={16} aria-hidden="true" />
          <input
            ref={input}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Jump to a section, project, or action…"
            aria-label="Search commands"
            role="combobox"
            aria-expanded="true"
            aria-controls="cmd-list"
            aria-activedescendant={filtered[index] ? `cmd-${filtered[index].id}` : undefined}
            autoComplete="off"
            spellCheck={false}
          />
          <span className="kbd">esc</span>
        </label>
        <ul ref={list} id="cmd-list" role="listbox" className={s.list}>
          {filtered.length === 0 && <li className={s.empty}>Nothing matches “{query}”.</li>}
          {filtered.map((item, i) => {
            const header = item.group !== lastGroup ? item.group : null;
            lastGroup = item.group;
            return (
              <li key={item.id} role="presentation">
                {header && <div className={s.group} role="presentation">{header}</div>}
                <div
                  id={`cmd-${item.id}`}
                  role="option"
                  aria-selected={i === index}
                  data-i={i}
                  className={s.item}
                  onMouseMove={() => setIndex(i)}
                  onClick={() => run(item)}
                >
                  <span className={s.itemIcon}>{item.icon}</span>
                  <span className={s.itemLabel}>{item.label}</span>
                  {item.hint && <span className={s.itemHint}>{item.hint}</span>}
                  <CornerDownLeft size={13} className={s.enter} aria-hidden="true" />
                </div>
              </li>
            );
          })}
        </ul>
        <div className={s.foot}>
          <span><span className="kbd">↑</span><span className="kbd">↓</span> navigate</span>
          <span><span className="kbd">↵</span> open</span>
        </div>
      </div>
    </dialog>
  );
}
