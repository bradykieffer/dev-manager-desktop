import {ComponentFixture, TestBed} from '@angular/core/testing';

import {InlineEditorComponent} from './inline-editor.component';
import {AppPrivKeyName, Device, NewDeviceAuthentication} from "../../types";
import {mockBackend} from "../../../testing/tauri-mock";

describe('InlineEditorComponent', async () => {
  let component: InlineEditorComponent;
  let fixture: ComponentFixture<InlineEditorComponent>;

  beforeEach(async () => {
    // Everything the embedded device editor reaches for while initialising.
    mockBackend({
      'device-manager/app_ssh_pubkey': () => 'ssh-ed25519 AAAAC3Nz test',
      'device-manager/ssh_key_dir': () => '/home/test/.ssh',
      'device-manager/list': () => [],
      'device-manager/localkey_verify': () => null,
    });

    await TestBed.configureTestingModule({
      imports: [InlineEditorComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(InlineEditorComponent);
    component = fixture.componentInstance;
    component.device = <Device>{
      name: 'test',
      host: '192.168.1.1',
      port: 22,
      username: 'root',
      profile: 'ose',
      privateKey: {openSsh: 'test'},
    };
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it.each(['root', 'prisoner'])('edits agent authentication for %s without requiring a key', username => {
    component.device = {...component.device, username, privateKey: undefined};
    expect(component.deviceAuth).toEqual({type: NewDeviceAuthentication.Agent, value: null});
  });

  it('keeps password authentication when no private key is stored', () => {
    component.device = {...component.device, privateKey: undefined, password: 'secret'};
    expect(component.deviceAuth).toEqual({type: NewDeviceAuthentication.Password, value: 'secret'});
  });

  it('keeps app-key authentication', () => {
    component.device.privateKey = {openSsh: AppPrivKeyName};
    expect(component.deviceAuth).toEqual({type: NewDeviceAuthentication.AppKey, value: null});
  });
});
