import { describe, expect, it, vi } from 'vitest';
import {
    notify_panel_failure,
    type PanelMessagingDeps,
    send_toggle_panel_message,
    type TogglePanelMessage,
} from '../lib/panel_messaging';

function mock_deps(overrides: Partial<PanelMessagingDeps> = {}): PanelMessagingDeps {
    return {
        send_message: vi.fn().mockResolvedValue(undefined),
        inject_content_script: vi.fn().mockResolvedValue(undefined),
        set_badge: vi.fn().mockResolvedValue(undefined),
        clear_badge: vi.fn(),
        ...overrides,
    };
}

const message: TogglePanelMessage = { type: 'tabscopy-toggle-panel' };

describe('send_toggle_panel_message', () => {
    it('does not inject script when sendMessage succeeds', async () => {
        const deps = mock_deps();

        await send_toggle_panel_message(deps, 42, message);

        expect(deps.send_message).toHaveBeenCalledOnce();
        expect(deps.send_message).toHaveBeenCalledWith(42, message);
        expect(deps.inject_content_script).not.toHaveBeenCalled();
    });

    it('injects content script and retries when sendMessage fails', async () => {
        const deps = mock_deps({
            send_message: vi
                .fn()
                .mockRejectedValueOnce(new Error('no content script'))
                .mockResolvedValueOnce(undefined),
        });

        await send_toggle_panel_message(deps, 42, message);

        expect(deps.send_message).toHaveBeenCalledTimes(2);
        expect(deps.inject_content_script).toHaveBeenCalledOnce();
        expect(deps.inject_content_script).toHaveBeenCalledWith(42);
    });

    it('throws when inject+retry still fails', async () => {
        const deps = mock_deps({
            send_message: vi.fn().mockRejectedValue(new Error('still broken')),
            inject_content_script: vi.fn().mockResolvedValue(undefined),
        });

        await expect(send_toggle_panel_message(deps, 42, message)).rejects.toThrow('still broken');
        expect(deps.inject_content_script).toHaveBeenCalledOnce();
        expect(deps.send_message).toHaveBeenCalledTimes(2);
    });
});

describe('notify_panel_failure', () => {
    it('sets badge to ! and schedules clear', async () => {
        const deps = mock_deps();

        await notify_panel_failure(deps);

        expect(deps.set_badge).toHaveBeenCalledWith('!');
        expect(deps.clear_badge).toHaveBeenCalledOnce();
    });
});
