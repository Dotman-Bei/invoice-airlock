import React from 'react';
import { Composition, Still } from 'remotion';
import { Scene } from './Scene';
import { Main } from './Main';
import data from './generated/data.json';
import timeline from './generated/timeline.json';

// "Main" is the final cut. The Stills are the approved storyboard (empty footage slots).
export const Root: React.FC = () => (
  <>
    <Composition id="Main" component={Main} width={1920} height={1080} fps={timeline.fps} durationInFrames={timeline.total} />
    {data.scenes.map((s) => (
      <Still key={s.id} id={s.id} component={Scene} width={1920} height={1080} defaultProps={{ id: s.id }} />
    ))}
  </>
);
