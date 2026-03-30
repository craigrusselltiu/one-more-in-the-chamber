import { memo } from 'react';

/**
 * ArtifactBar: left-aligned row of small icons showing collected artifacts.
 * MVP: 16x16 colored squares, trait tag color-coded.
 */
export const ArtifactBar = memo(function ArtifactBar() {
  // TODO: read artifacts from run store
  return (
    <div className="flex gap-0.5 px-2 py-0.5">
      {/* Artifact icons will render here */}
    </div>
  );
});
