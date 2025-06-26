// ConversationalAIContainer.tsx
import React, { forwardRef } from 'react';
import ConversationalAI from './ConversationalAI';

const ConversationalAIContainer = forwardRef((props, ref) => {
  return <ConversationalAI {...props} ref={ref} />;
});

export default ConversationalAIContainer;
