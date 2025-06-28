// ConversationalAIContainer.tsx
import React, { forwardRef } from 'react';
import ConversationalAI from './ConversationalAI';

const ConversationalAIContainer = React.memo((props) => {
  return <ConversationalAI {...props} />;
});

export default ConversationalAIContainer;
