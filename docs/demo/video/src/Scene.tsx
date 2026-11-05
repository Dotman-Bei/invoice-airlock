import React from 'react';
import { loadFont } from '@remotion/google-fonts/HankenGrotesk';
import data from './generated/data.json';

export const { fontFamily } = loadFont('normal', { weights: ['400', '500'], subsets: ['latin'] });

// Palette from docs/FRONTEND.md: yellow = the room outside, black = the door, ultramarine = the room that pays.
export const C = {
  ultra: '#1423b8',
  black: '#000000',
  yellow: '#f7dd47',
  pink: '#e9479f',
  green: '#1fc27a',
  paper: '#ffffff',
  ink: '#0a0a0a',
};

export const STAGE_H = 900; // stage above the caption band, which is 180 px: 900 + 180 = 1080
export const RAIL_H = 52; // label rail at the top and the statement rail at the bottom of the three-up stage

export const display = (size: number): React.CSSProperties => ({
  fontFamily,
  fontWeight: 500,
  fontSize: size,
  letterSpacing: '-0.05em',
  lineHeight: 0.95,
  margin: 0,
});
export const body = (size: number): React.CSSProperties => ({ fontFamily, fontWeight: 400, fontSize: size, lineHeight: 1.2, margin: 0 });

// Storyboard captions: the real narration text, first words only, one word highlighted as the
// word-timed highlight will look. The real build draws these from the Kokoro word timings.
const CaptionBand: React.FC<{ text: string }> = ({ text }) => {
  const words = text.split(/\s+/);
  const shown = words.slice(0, 11);
  return (
    <div
      style={{
        position: 'absolute', left: 0, right: 0, bottom: 0, height: 1080 - STAGE_H,
        background: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 120px',
      }}
    >
      <div style={{ ...body(44), fontWeight: 500, color: '#fff', textAlign: 'center' }}>
        {shown.map((w, i) => (
          <span key={i} style={{ color: i === 3 ? C.yellow : '#fff' }}>{w} </span>
        ))}
        {words.length > shown.length ? '…' : ''}
      </div>
    </div>
  );
};

export const Stage: React.FC<{ bg: string; children: React.ReactNode }> = ({ bg, children }) => (
  <div style={{ position: 'absolute', top: 0, left: 0, width: 1920, height: STAGE_H, background: bg, overflow: 'hidden' }}>{children}</div>
);

export const Chip: React.FC<{ bg: string; ink: string; children: React.ReactNode }> = ({ bg, ink, children }) => (
  <span style={{ ...body(24), fontWeight: 500, background: bg, color: ink, padding: '6px 16px', letterSpacing: '0.02em', whiteSpace: 'nowrap' }}>{children}</span>
);

// ---------- cards ----------
export const Title: React.FC = () => (
  <Stage bg={C.ultra}>
    <div style={{ position: 'absolute', left: 120, top: 250 }}>
      <h1 style={{ ...display(220), color: '#fff' }}>Invoice<br />Airlock</h1>
      <p style={{ ...body(44), color: '#fff', marginTop: 40, maxWidth: 1200 }}>
        An accounts-payable desk on Switch that stays safe when its own agent is hijacked.
      </p>
    </div>
  </Stage>
);

export const Problem: React.FC = () => (
  <Stage bg={C.black}>
    <div style={{ position: 'absolute', left: 120, top: 200, width: 1500 }}>
      <h1 style={{ ...display(112), color: C.yellow }}>AI agents read invoices next to the step that moves money.</h1>
      <p style={{ ...display(72), color: '#fff', marginTop: 56 }}>Assume the agent has already lost.</p>
    </div>
  </Stage>
);

export const Close: React.FC = () => (
  <Stage bg={C.green}>
    <div style={{ position: 'absolute', left: 120, top: 170, width: 1600 }}>
      <h1 style={{ ...display(128), color: C.ink }}>The agent was hijacked.</h1>
      <h1 style={{ ...display(128), color: C.ink, marginTop: 20 }}>The money went only<br />where a person sent it.</h1>
    </div>
    <div style={{ position: 'absolute', left: 120, bottom: 90, display: 'flex', gap: 24 }}>
      {['Rooms', 'Owners', 'Addressing', 'Sender identity'].map((t) => (
        <span key={t} style={{ ...body(40), fontWeight: 500, background: C.ink, color: '#fff', padding: '14px 28px' }}>{t}</span>
      ))}
    </div>
  </Stage>
);

export const Outro: React.FC = () => (
  <Stage bg={C.black}>
    <div style={{ position: 'absolute', left: 120, top: 230 }}>
      <h1 style={{ ...display(150), color: '#fff' }}>Invoice Airlock</h1>
      <p style={{ ...body(52), color: C.yellow, marginTop: 44 }}>github.com/Dotman-Bei/invoice-airlock</p>
      <p style={{ ...body(40), color: '#fff', marginTop: 36 }}>Flip the Switch Hackathon</p>
      <p style={{ ...body(40), color: '#fff', marginTop: 8 }}>Track 01 · Best Business Workflow</p>
    </div>
    <div style={{ position: 'absolute', right: 140, top: 190, background: '#fff', padding: 24 }}>
      <img src={data.qr} width={440} height={440} style={{ display: 'block' }} />
    </div>
  </Stage>
);

// ---------- three-up ----------
type Focus = 'all' | 'clerk' | 'controller';
const WIDTHS: Record<Focus, [number, number, number]> = {
  all: [780, 780, 360],
  clerk: [1200, 360, 360],
  controller: [360, 1200, 360],
};

const Slot: React.FC<{ w: number; tint: string; line1: string; line2: string }> = ({ w, tint, line1, line2 }) => (
  <div
    style={{
      width: w, height: STAGE_H - 2 * RAIL_H, boxSizing: 'border-box', border: `3px dashed ${tint}`, background: `${tint}1f`,
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12, color: '#fff',
    }}
  >
    <span style={{ ...body(26), letterSpacing: '0.12em' }}>FOOTAGE SLOT</span>
    <span style={{ ...body(34), fontWeight: 500 }}>{line1}</span>
    <span style={{ ...body(24), opacity: 0.75 }}>{line2}</span>
  </div>
);

const ThreeUp: React.FC<{ focus: Focus; statement?: string; note?: string }> = ({ focus, statement, note }) => {
  const [a, b, c] = WIDTHS[focus];
  const h = STAGE_H - 2 * RAIL_H;
  return (
    <Stage bg={C.ink}>
      <div style={{ position: 'absolute', top: 0, left: 0, height: RAIL_H, display: 'flex', alignItems: 'center' }}>
        <div style={{ width: a, paddingLeft: 12 }}><Chip bg={C.yellow} ink={C.black}>CLERK · ap-intake</Chip></div>
        <div style={{ width: b, paddingLeft: 12 }}><Chip bg={C.ultra} ink="#fff">CONTROLLER · ap-release</Chip></div>
        <div style={{ width: c, paddingLeft: 12 }}><Chip bg={C.green} ink={C.ink}>MOCK BANK LEDGER</Chip></div>
      </div>
      <div style={{ position: 'absolute', top: RAIL_H, left: 0, display: 'flex', height: h }}>
        <Slot w={a} tint={C.yellow} line1="Clerk pane" line2={focus === 'clerk' ? 'punch-in: crop of the real pane' : `${a} × ${h}`} />
        <Slot w={b} tint="#5b6cff" line1="Controller pane" line2={focus === 'controller' ? 'punch-in: crop of the real pane' : `${b} × ${h}`} />
        <Slot w={c} tint={C.green} line1="Ledger" line2={`${c} × ${h}`} />
      </div>
      <div style={{ position: 'absolute', bottom: 0, left: 0, width: 1920, height: RAIL_H, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 16 }}>
        {statement && <Chip bg="#fff" ink={C.black}>{statement}</Chip>}
        {note && <Chip bg={C.pink} ink={C.black}>{note}</Chip>}
      </div>
    </Stage>
  );
};

// ---------- proof cards ----------
type Report = (typeof data)['proof'];
export const ProofCard: React.FC<{ report: Report; file: string; footer: string; singleOwner?: boolean }> = ({ report, file, footer, singleOwner }) => {
  const date = report.started ? report.started.slice(0, 10) : '';
  return (
    <Stage bg={C.paper}>
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 56, background: C.black, display: 'flex', alignItems: 'center', padding: '0 40px', gap: 24 }}>
        <span style={{ ...body(28), fontWeight: 500, color: C.yellow, letterSpacing: '0.06em' }}>RECORDED RUN · {date} · NOT LIVE</span>
        <span style={{ ...body(24), color: '#fff', opacity: 0.8 }}>{file}</span>
      </div>
      <div style={{ position: 'absolute', top: 72, left: 40, right: 40 }}>
        <p style={{ ...body(38), fontWeight: 500, color: C.ink }}>{report.verdict}</p>
        <div style={{ marginTop: 12 }}>
          {report.rows.map((r) => {
            const breached = r.result === 'BREACHED';
            const seven = singleOwner && r.check === 'attack-7';
            return (
              <div key={r.check} style={{ display: 'flex', alignItems: 'center', height: 40, borderBottom: '1px solid #d9d9d9' }}>
                <span style={{ ...body(24), fontWeight: 500, width: 250, color: C.ink }}>{r.check}</span>
                <span style={{ ...body(24), width: 880, color: '#333', whiteSpace: 'nowrap', overflow: 'hidden' }}>{r.tried}</span>
                <span style={{ ...body(22), fontWeight: 500, background: breached ? C.pink : C.green, color: C.black, padding: '3px 14px', whiteSpace: 'nowrap' }}>
                  {breached ? (seven ? 'BREACHED · 1 OF 3 RUNS' : 'BREACHED') : 'Contained'}
                </span>
              </div>
            );
          })}
        </div>
        <p style={{ ...body(28), fontWeight: 500, color: C.ink, marginTop: 14 }}>{footer}</p>
      </div>
    </Stage>
  );
};

// The stage of a card scene (no caption band), shared by the stills and the final composition.
export const CardStage: React.FC<{ id: string }> = ({ id }) => {
  switch (id) {
    case 'S1': return <Title />;
    case 'S2': return <Problem />;
    case 'S8':
      return <ProofCard report={data.proof} file="docs/proof/proof-report.md" footer={`Owners: ${data.proof.owners} · Exit code ${data.proof.exit}`} />;
    case 'S9':
      return (
        <ProofCard
          report={data.single}
          singleOwner
          file="docs/proof/single-owner-report.md"
          footer={`Owners: ${data.single.owners} · Exit code ${data.single.exit} · Attack 7 breached in 1 of 3 runs, contained in 2 · No money moved in the hostile run`}
        />
      );
    case 'S10': return <Close />;
    case 'S11': return <Outro />;
    default: throw new Error(`${id} is not a card scene`);
  }
};

export const Scene: React.FC<{ id: string }> = ({ id }) => {
  const scene = data.scenes.find((s) => s.id === id);
  if (!scene) throw new Error(`unknown scene ${id}`);
  let stage: React.ReactNode;
  switch (id) {
    case 'S1': stage = <Title />; break;
    case 'S2': stage = <Problem />; break;
    case 'S3': stage = <ThreeUp focus="all" statement="One person, two accounts · Mock bank, illustrative amounts" />; break;
    case 'S4': stage = <ThreeUp focus="all" statement="Hijack scripted on purpose" />; break;
    case 'S5': stage = <ThreeUp focus="clerk" />; break;
    case 'S6': stage = <ThreeUp focus="controller" statement="Removal delayed on purpose" note="Focus swaps to the clerk pane for the removal notice" />; break;
    case 'S7': stage = <ThreeUp focus="all" note="+14 s  (marks where a wait is trimmed)" />; break;
    case 'S8':
      stage = <ProofCard report={data.proof} file="docs/proof/proof-report.md" footer={`Owners: ${data.proof.owners} · Exit code ${data.proof.exit}`} />;
      break;
    case 'S9':
      stage = (
        <ProofCard
          report={data.single}
          singleOwner
          file="docs/proof/single-owner-report.md"
          footer={`Owners: ${data.single.owners} · Exit code ${data.single.exit} · Attack 7 breached in 1 of 3 runs, contained in 2 · No money moved in the hostile run`}
        />
      );
      break;
    case 'S10': stage = <Close />; break;
    case 'S11': stage = <Outro />; break;
    default: throw new Error(`no layout for ${id}`);
  }
  return (
    <div style={{ position: 'relative', width: 1920, height: 1080, background: C.black, overflow: 'hidden' }}>
      {stage}
      <CaptionBand text={scene.text} />
    </div>
  );
};
