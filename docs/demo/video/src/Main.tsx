import React from 'react';
import { AbsoluteFill, Sequence, staticFile } from 'remotion';
import { Audio } from '@remotion/media';
import timeline from './generated/timeline.json';
import { CardStage } from './Scene';
import { LiveStage, type LiveScene } from './Live';
import { Captions, toCaptions, type Word } from './Captions';

const LEAD_S = 0.3;

const SceneRoot: React.FC<{ scene: (typeof timeline.scenes)[number] }> = ({ scene }) => {
  const captions = React.useMemo(() => toCaptions(scene.words as Word[], LEAD_S), [scene]);
  const live = (scene as unknown as { pieces?: LiveScene['pieces'] }).pieces ? (scene as unknown as LiveScene) : null;
  return (
    <AbsoluteFill style={{ background: '#000' }}>
      {live ? <LiveStage scene={live} /> : <CardStage id={scene.id} />}
      <Captions captions={captions} />
      <Sequence from={scene.leadFrames} layout="none">
        <Audio src={staticFile(scene.audio)} />
      </Sequence>
    </AbsoluteFill>
  );
};

export const Main: React.FC = () => (
  <AbsoluteFill style={{ background: '#000' }}>
    {timeline.scenes.map((s) => (
      <Sequence key={s.id} from={s.from} durationInFrames={s.frames}>
        <SceneRoot scene={s} />
      </Sequence>
    ))}
  </AbsoluteFill>
);
