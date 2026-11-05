import React from 'react';
import { Still } from 'remotion';
import { Scene } from './Scene';
import data from './generated/data.json';

// Storyboard: one Still per scene, 1920x1080. The real composition (with footage, audio and
// word-timed captions) is added after the storyboard is approved.
export const Root: React.FC = () => (
  <>
    {data.scenes.map((s) => (
      <Still key={s.id} id={s.id} component={Scene} width={1920} height={1080} defaultProps={{ id: s.id }} />
    ))}
  </>
);
