import { fireEvent, render, within } from '@testing-library/react';
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import '@testing-library/jest-dom/vitest';

import { PromptForm } from '../Sidepanel/PromptForm';

describe('Sidepanel PromptForm', () => {
  it('does not send the prompt when Enter confirms an IME composition', () => {
    const onSend = vi.fn();

    const { container } = render(
      <PromptForm
        exchanges={[]}
        isStreaming={false}
        onSend={onSend}
        onStopStreaming={vi.fn()}
        onStartNewConversation={vi.fn()}
      />
    );

    const input = within(container).getByRole('textbox');

    fireEvent.change(input, { target: { value: '東京' } });

    expect(fireEvent.keyDown(input, { key: 'Enter', isComposing: true })).toBe(
      true
    );
    expect(fireEvent.keyDown(input, { key: 'Enter', keyCode: 229 })).toBe(true);
    expect(onSend).not.toHaveBeenCalled();
    expect(input).toHaveValue('東京');

    fireEvent.keyDown(input, { key: 'Enter' });

    expect(onSend).toHaveBeenCalledTimes(1);
    expect(onSend).toHaveBeenCalledWith('東京');
  });
});
