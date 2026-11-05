import React from 'react';
import { Freeze, Sequence, staticFile, useCurrentFrame } from 'remotion';
import { Video } from '@remotion/media';
import { C, Chip, RAIL_H, STAGE_H } from './Scene';

type Role = 'clerk' | 'controller' | 'ledger';
type Layout = 'all' | 'clerk' | 'controller' | 'ledger';

// Native CSS size each pane was captured at (true 2x frames). The ledger is captured at 540 px so its table
// does not clip, and shown scaled into its 360 px slot.
const NATIVE: Record<Role, { w: number; h: number }> = {
  clerk: { w: 780, h: 796 },
  controller: { w: 780, h: 796 },
  ledger: { w: 540, h: 1194 },
};
const SLOT_W: Record<Layout, Record<Role, number>> = {
  all: { clerk: 780, controller: 780, ledger: 360 },
  clerk: { clerk: 1200, controller: 360, ledger: 360 },
  controller: { clerk: 360, controller: 1200, ledger: 360 },
  ledger: { clerk: 460, controller: 460, ledger: 1000 },
};
const SLOT_H = STAGE_H - 2 * RAIL_H; // 796
// In focus layouts a Mattermost pane is cropped to its message area (no sidebar): x from 268 CSS px, 507 px wide.
// A focused pane also drops its top so the newest messages, which sit just above the composer, fill the slot.
const MSG_X0 = 268;
const MSG_W = 507;
const FOCUS_BOTTOM = 670; // CSS px: where the composer starts, so the crop ends just above it
const ROLES: Role[] = ['clerk', 'controller', 'ledger'];

type Piece = { kind: 'live' | 'hold'; from: number; frames: number; trimBefore?: number; trimAfter?: number; holdFrame?: number; drift?: boolean };
export type LiveScene = {
  frames: number;
  pieces: Piece[];
  layouts: { fromFrame: number; layout: Layout }[];
  statements: { text: string; fromFrame: number; toFrame: number }[];
  chips: { text: string; fromFrame: number; toFrame: number }[];
  spots?: { role: Role; fromFrame: number; toFrame: number }[];
};

const PaneSlot: React.FC<{ role: Role; layout: Layout; piece: Piece; dim: boolean; zoom: number }> = ({ role, layout, piece, dim, zoom }) => {
  const native = NATIVE[role];
  const slotW = SLOT_W[layout][role];
  const focus = layout === role;
  const cropped = role !== 'ledger' && layout !== 'all'; // focused pane or message-area thumbnail
  const scale = cropped ? slotW / MSG_W : slotW / native.w;
  const x0 = cropped ? MSG_X0 * scale : 0;
  const y0 = focus && role !== 'ledger' ? FOCUS_BOTTOM * scale - SLOT_H : 0; // the ledger's table starts at the top
  const src = staticFile(`captures/${role}.mp4`);
  const style: React.CSSProperties = { width: native.w * scale, height: native.h * scale, display: 'block' };
  const video =
    piece.kind === 'live' ? (
      <Video src={src} trimBefore={piece.trimBefore} trimAfter={piece.trimAfter} muted objectFit="fill" style={style} />
    ) : (
      <Freeze frame={0}>
        <Video src={src} trimBefore={piece.holdFrame} trimAfter={(piece.holdFrame ?? 0) + 30} muted objectFit="fill" style={style} />
      </Freeze>
    );
  return (
    <div style={{ width: slotW, height: SLOT_H, overflow: 'hidden', position: 'relative', background: '#0a0a0a', opacity: dim ? 0.4 : 1 }}>
      <div
        style={{
          position: 'absolute', left: 0, top: 0, width: native.w * scale, height: native.h * scale,
          transform: `translate(${-x0}px, ${-y0}px) scale(${focus ? zoom : 1})`,
          transformOrigin: `${x0 + slotW / 2}px ${y0 + SLOT_H}px`,
        }}
      >
        {video}
      </div>
    </div>
  );
};

export const LiveStage: React.FC<{ scene: LiveScene }> = ({ scene }) => {
  const frame = useCurrentFrame();
  let layout: Layout = scene.layouts[0].layout;
  for (const l of scene.layouts) if (frame >= l.fromFrame) layout = l.layout;
  const spot = scene.spots?.find((s) => frame >= s.fromFrame && frame < s.toFrame);
  const widths = SLOT_W[layout];
  return (
    <div style={{ position: 'absolute', top: 0, left: 0, width: 1920, height: STAGE_H, background: C.ink, overflow: 'hidden' }}>
      {/* label rail: outside the panes, so it never covers chat content */}
      <div style={{ position: 'absolute', top: 0, left: 0, height: RAIL_H, display: 'flex', alignItems: 'center' }}>
        <div style={{ width: widths.clerk, paddingLeft: 12 }}><Chip bg={C.yellow} ink={C.black}>CLERK · ap-intake</Chip></div>
        <div style={{ width: widths.controller, paddingLeft: 12 }}><Chip bg={C.ultra} ink="#fff">CONTROLLER · ap-release</Chip></div>
        <div style={{ width: widths.ledger, paddingLeft: 12 }}><Chip bg={C.green} ink={C.ink}>MOCK BANK LEDGER</Chip></div>
      </div>
      <div style={{ position: 'absolute', top: RAIL_H, left: 0, display: 'flex', height: SLOT_H }}>
        {ROLES.map((role) => (
          <div key={role} style={{ width: widths[role], height: SLOT_H }}>
            {scene.pieces.map((p, i) => {
              const progress = p.frames > 0 ? Math.min(1, Math.max(0, (frame - p.from) / p.frames)) : 0;
              return (
                <Sequence key={i} from={p.from} durationInFrames={p.frames} layout="none">
                  <PaneSlot role={role} layout={layout} piece={p} dim={!!spot && spot.role !== role} zoom={p.drift ? 1 + 0.045 * progress : 1} />
                </Sequence>
              );
            })}
          </div>
        ))}
      </div>
      {/* statement rail */}
      <div style={{ position: 'absolute', bottom: 0, left: 0, width: 1920, height: RAIL_H, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 16 }}>
        {scene.statements.filter((s) => frame >= s.fromFrame && frame < s.toFrame).map((s) => <Chip key={s.text} bg="#fff" ink={C.black}>{s.text}</Chip>)}
        {scene.chips.filter((s) => frame >= s.fromFrame && frame < s.toFrame).map((s) => <Chip key={s.text} bg={C.pink} ink={C.black}>{s.text}</Chip>)}
      </div>
    </div>
  );
};
