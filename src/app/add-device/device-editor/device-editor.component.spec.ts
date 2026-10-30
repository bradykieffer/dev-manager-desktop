import {ComponentFixture, TestBed} from '@angular/core/testing';
import {vi} from 'vitest';

import {DeviceEditorComponent} from './device-editor.component';
import {DeviceManagerService} from '../../core/services';
import {NewDeviceAuthentication} from '../../types';
import {mockBackend} from '../../../testing/tauri-mock';

describe('DeviceEditorComponent SSH agent', () => {
    let fixture: ComponentFixture<DeviceEditorComponent>;
    let component: DeviceEditorComponent;

    beforeEach(async () => {
        mockBackend({
            'device-manager/app_ssh_pubkey': () => 'ssh-ed25519 test',
            'device-manager/list': () => [],
        });
        await TestBed.configureTestingModule({imports: [DeviceEditorComponent]}).compileComponents();
        fixture = TestBed.createComponent(DeviceEditorComponent);
        component = fixture.componentInstance;
        fixture.componentRef.setInput('name', 'test');
        fixture.componentRef.setInput('host', 'tv.local');
        fixture.componentRef.setInput('port', 22);
        fixture.componentRef.setInput('username', 'root');
        fixture.componentRef.setInput('auth', {type: NewDeviceAuthentication.Agent, value: null});
        fixture.detectChanges();
        await fixture.whenStable();
    });

    it('requires no credential input and verifies the device without stored secrets', async () => {
        const verify = vi.spyOn(TestBed.inject(DeviceManagerService), 'getDeviceInfo')
            .mockResolvedValue({modelName: 'test-tv', firmwareVersion: '1.0'});
        expect(component.valid).toBe(true);
        expect(fixture.nativeElement.querySelector('#authValue')).toBeNull();
        expect(fixture.nativeElement.textContent).toContain('SSH_AUTH_SOCK');

        const device = await component.submit();

        expect(device).toEqual({
            new: true, profile: 'ose', name: 'test', description: '',
            host: 'tv.local', port: 22, username: 'root',
        });
        expect(verify).toHaveBeenCalledWith(device);
    });

    it('discards a previously entered password when switching to the agent', async () => {
        const auth = component.formGroup.controls.sshAuth.controls;
        auth.type.setValue(NewDeviceAuthentication.Password);
        auth.value.setValue('secret');
        await fixture.whenStable();
        expect(component.valid).toBe(true);

        auth.type.setValue(NewDeviceAuthentication.Agent);
        fixture.detectChanges();
        await fixture.whenStable();
        vi.spyOn(TestBed.inject(DeviceManagerService), 'getDeviceInfo')
            .mockResolvedValue({modelName: 'test-tv', firmwareVersion: '1.0'});

        const device = await component.submit();
        expect(component.valid).toBe(true);
        expect(device).not.toHaveProperty('password');
        expect(device).not.toHaveProperty('privateKey');
        expect(device).not.toHaveProperty('passphrase');
    });
});
