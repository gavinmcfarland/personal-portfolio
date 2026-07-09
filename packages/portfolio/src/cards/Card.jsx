import { memo } from 'react';
import { useCanvas } from '@gavinmcfarland/canvas';
import { profile } from '../data/profile';

const Arrow = () => (
  <svg viewBox="0 0 24 24" fill="none" strokeLinecap="round" strokeLinejoin="round">
    <path d="M7 17L17 7M17 7H8M17 7v9" />
  </svg>
);

/* Suppress a link navigation when the card was dragged rather than clicked. */
const guard = (e) => {
  const n = e.currentTarget.closest('.node');
  if (n && n.dataset.moved === '1') e.preventDefault();
};

function Rows({ rows }) {
  return rows.map((r, i) => (
    <div className="row" key={i}>
      <span className="yr">{r.yr}</span>
      <div>
        <div className="rt">{r.rt}</div>
        {r.rp && <div className="rp">{r.rp}</div>}
      </div>
    </div>
  ));
}

function CardBody({ node }) {
  switch (node.card) {
    case 'hero':
      return (
        <>
          <div className="kicker">{profile.kicker}</div>
          <h1>{profile.headline.map((l, i) => (<span key={i}>{l}{i < profile.headline.length - 1 && <br />}</span>))}</h1>
          <p className="role">{profile.role}</p>
          <div className="meta">
            {profile.meta.map((m) => (
              <div key={m.label}><dt>{m.label}</dt><dd>{m.value}</dd></div>
            ))}
          </div>
        </>
      );
    case 'about':
      return (
        <>
          <div className="kicker">About</div>
          <p>{profile.about}</p>
        </>
      );
    case 'project': {
      const p = node.project;
      return (
        <>
          <div className="kicker">{node.kicker}</div>
          <h2>{p.title}</h2>
          <p>{p.summary}</p>
          {p.tech?.length > 0 && (
            <div className="tags">{p.tech.map((t) => <span key={t}>{t}</span>)}</div>
          )}
          {p.link && (
            <a className="open" href={p.link} target="_blank" rel="noopener noreferrer" onClick={guard}>
              Visit <Arrow />
            </a>
          )}
        </>
      );
    }
    case 'list':
      return (
        <>
          <div className="kicker">{node.kicker}</div>
          <h2>{node.heading}</h2>
          <Rows rows={node.rows} />
        </>
      );
    case 'connect':
      return (
        <>
          <div className="kicker">Connect</div>
          <h2>Say hello</h2>
          <p style={{ marginBottom: '1rem' }}>{profile.connectBlurb}</p>
          <a className="em" href={`mailto:${profile.email}`} onClick={guard}>{profile.email}</a>
          <div className="social">
            {profile.socials.map((s) => (
              <a key={s.label} href={s.href} target="_blank" rel="noopener noreferrer" onClick={guard}>
                {s.label} ↗
              </a>
            ))}
          </div>
        </>
      );
    default:
      return null;
  }
}

const CARD_CLASS = {
  hero: 'card hero',
  about: 'card',
  project: 'card',
  list: 'card list',
  connect: 'card connect',
};

function Card({ node }) {
  const { nodeEls } = useCanvas();
  const cls = `node ${CARD_CLASS[node.card] || 'card'}`;
  return (
    <div
      ref={(el) => { if (el) nodeEls.set(node.id, el); else nodeEls.delete(node.id); }}
      className={cls}
      data-id={node.id}
      data-type="card"
      data-x={node.x}
      data-y={node.y}
      data-z={node.z}
      data-anchor={node.anchor ? '1' : ''}
      style={{ transform: `translate(${node.x}px,${node.y}px)`, zIndex: node.z }}
    >
      <CardBody node={node} />
    </div>
  );
}

export default memo(Card);
