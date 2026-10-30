import {ComponentFixture, TestBed} from '@angular/core/testing';
import {NgbActiveModal} from '@ng-bootstrap/ng-bootstrap';
import {vi} from 'vitest';

import {SshAgentSettingsComponent} from './ssh-agent-settings.component';
import {DeviceManagerService} from '../../../core/services';
import {mockBackend} from '../../../../testing/tauri-mock';

describe('SshAgentSettingsComponent', () => {
    let fixture: ComponentFixture<SshAgentSettingsComponent>;
    let stored: string | null;
    let close: ReturnType<typeof vi.fn>;
    let dismiss: ReturnType<typeof vi.fn>;

    beforeEach(async () => {
        stored = '/test/agent with spaces.sock';
        close = vi.fn();
        dismiss = vi.fn();
        mockBackend({
            'device-manager/agent_socket': () => stored,
            'device-manager/set_agent_socket': ({socket}) => { stored = socket as string | null; },
        });
        await TestBed.configureTestingModule({
            imports: [SshAgentSettingsComponent],
            providers: [{provide: NgbActiveModal, useValue: {close, dismiss}}],
        }).compileComponents();
        fixture = TestBed.createComponent(SshAgentSettingsComponent);
        fixture.detectChanges();
        await fixture.whenStable();
    });

    it('loads, saves, and reloads the machine-local socket path', async () => {
        expect(fixture.componentInstance.socket.value).toBe(stored);
        const input = fixture.nativeElement.querySelector('#agentSocket') as HTMLInputElement;
        input.value = '  /custom/agent.sock  ';
        input.dispatchEvent(new Event('input', {bubbles: true}));
        await fixture.componentInstance.save();
        expect(stored).toBe('/custom/agent.sock');
        expect(close).toHaveBeenCalledOnce();

        const reopened = TestBed.createComponent(SshAgentSettingsComponent);
        await reopened.componentInstance.ngOnInit();
        expect(reopened.componentInstance.socket.value).toBe('/custom/agent.sock');
    });

    it('clears the override to restore automatic discovery', async () => {
        fixture.componentInstance.socket.setValue('   ');
        await fixture.componentInstance.save();
        expect(stored).toBeNull();
        expect(close).toHaveBeenCalledOnce();
    });

    it('leaves the saved setting unchanged when cancelled', () => {
        fixture.componentInstance.socket.setValue('/unsaved.sock');
        const buttons = fixture.nativeElement.querySelectorAll('.modal-footer button');
        buttons[0].click();
        expect(stored).toBe('/test/agent with spaces.sock');
        expect(dismiss).toHaveBeenCalledOnce();
        expect(close).not.toHaveBeenCalled();
    });

    it('does not overwrite settings when loading fails', async () => {
        const service = TestBed.inject(DeviceManagerService);
        vi.spyOn(service, 'getSshAgentSocket').mockRejectedValue(new Error('Settings unavailable'));
        const save = vi.spyOn(service, 'setSshAgentSocket');
        const unloaded = TestBed.createComponent(SshAgentSettingsComponent);
        await unloaded.componentInstance.ngOnInit();
        await unloaded.componentInstance.save();
        expect(save).not.toHaveBeenCalled();
        expect(unloaded.componentInstance.error).toBe('Settings unavailable');
        expect(close).not.toHaveBeenCalled();
    });

    it('shows save failures without closing the dialog or losing the entered path', async () => {
        vi.spyOn(TestBed.inject(DeviceManagerService), 'setSshAgentSocket')
            .mockRejectedValue(new Error('Invalid socket path'));
        fixture.componentInstance.socket.setValue('relative.sock');
        await fixture.componentInstance.save();
        fixture.detectChanges();
        expect(close).not.toHaveBeenCalled();
        expect(fixture.componentInstance.socket.value).toBe('relative.sock');
        expect(fixture.nativeElement.querySelector('[role="alert"]').textContent).toContain('Invalid socket path');
    });
});
