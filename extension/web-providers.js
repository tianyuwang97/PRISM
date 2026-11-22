'use strict';
// DOM-only experimental adapters. Unknown layouts fail visibly instead of submitting twice.
const PrismWebProviders={
  'https://www.dola.com':{
    name:'Dola',
    editors:'textarea[data-testid="chat_input_input"],[data-testid="chat_input"] [contenteditable="true"],textarea',
    composer:'[data-testid="chat_input"] textarea,[data-testid="chat_input"] [contenteditable="true"]',
    answers:'[data-testid="receive_message"][data-message-role="assistant"]',
    body:'[data-testid="message_content"]',
    keySelector:'[data-message-id]',
    turn:'[data-testid="receive_message"]',
    actions:'button,[role="button"],[data-testid^="message_action_"]',
    send:'[data-testid="chat_input_send_button"]',
    stop:'[data-testid="chat_input_local_break_button"]'
  },
  'https://gemini.google.com':{
    name:'Gemini',
    editors:'rich-textarea [contenteditable]:not([contenteditable="false"]),rich-textarea textarea,.ql-editor[contenteditable]:not([contenteditable="false"]),[contenteditable][role="textbox"]:not([contenteditable="false"])',
    composer:'rich-textarea [contenteditable]:not([contenteditable="false"]),rich-textarea textarea',
    answers:'model-response',
    body:'.markdown, message-content',
    turn:'model-response',
    send:'button.send-button,button[aria-label="Send message"],button[aria-label="发送消息"]',
    stop:'button.stop-button,button[aria-label="Stop response"],button[aria-label="停止回答"]'
  },
  'https://claude.ai':{
    name:'Claude',
    editors:'div[contenteditable="true"].ProseMirror,[contenteditable="true"][role="textbox"],textarea[placeholder*="Claude"]',
    answers:'[data-message-author-role="assistant"],[data-testid="assistant-message"],.font-claude-response,.font-claude-response-body',
    body:'.standard-markdown,.markdown',
    turn:'[data-testid="assistant-message"],[data-is-streaming]',
    send:'button[aria-label="Send message"],button[aria-label="Send Message"],button[aria-label="发送消息"]',
    stop:'button[aria-label="Stop response"],button[aria-label="Stop Response"],button[aria-label="停止回答"]'
  },
  'https://grok.com':{
    name:'Grok',
    settleMs:6000,
    completionMs:2500,
    editors:'textarea[placeholder],[contenteditable="true"][role="textbox"],.tiptap[contenteditable="true"]',
    answers:'[data-message-author-role="assistant"],[data-role="assistant"],.response-content-markdown',
    body:'.response-content-markdown,.markdown',
    turn:'[data-message-id],[data-message-author-role="assistant"],[data-role="assistant"]',
    send:'button[aria-label="Submit"],button[aria-label="Send message"],button[aria-label="发送"]',
    stop:'button[aria-label="Stop"],button[aria-label="Stop generating"],button[aria-label="停止生成"]'
  }
};
