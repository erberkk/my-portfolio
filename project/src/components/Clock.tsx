import { useEffect, useState } from 'react';
import { profile } from '../data/site';

const fmt = new Intl.DateTimeFormat('en-GB', { timeZone: profile.timezone, hour: '2-digit', minute: '2-digit' });

export default function Clock({ suffix = true }: { suffix?: boolean }) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 15_000);
    return () => clearInterval(id);
  }, []);
  return (
    <time dateTime={now.toISOString()}>
      {fmt.format(now)}{suffix ? ' GMT+3' : ''}
    </time>
  );
}
