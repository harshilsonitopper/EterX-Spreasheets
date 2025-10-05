import React from 'react';
// FIX: Corrected import path to include file extension.
import { GroundingChunk } from '../types.ts';

interface CitationsProps {
  citations: GroundingChunk[];
}

const Citations: React.FC<CitationsProps> = ({ citations }) => {
  if (!citations || citations.length === 0) {
    return null;
  }

  return (
    <div className="mt-4">
      <h4 className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-2">
        Sources
      </h4>
      <ol className="list-decimal list-inside space-y-1">
        {citations.map((citation, index) => (
          <li key={index} className="text-xs text-text-secondary truncate">
            <a
              href={citation.web.uri}
              target="_blank"
              rel="noopener noreferrer"
              className="text-accent-primary hover:underline"
              title={citation.web.title}
            >
              {citation.web.title || new URL(citation.web.uri).hostname}
            </a>
          </li>
        ))}
      </ol>
    </div>
  );
};

export default Citations;
