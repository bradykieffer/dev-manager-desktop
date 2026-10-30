import {Component, OnInit, ChangeDetectionStrategy} from '@angular/core';
import {FormControl, ReactiveFormsModule} from '@angular/forms';
import {NgbActiveModal} from '@ng-bootstrap/ng-bootstrap';
import {DeviceManagerService} from '../../../core/services';

@Component({
    selector: 'app-ssh-agent-settings',
    imports: [ReactiveFormsModule],
    templateUrl: './ssh-agent-settings.component.html',
    changeDetection: ChangeDetectionStrategy.Eager,
})
export class SshAgentSettingsComponent implements OnInit {
    socket = new FormControl('', {nonNullable: true});
    ready = false;
    saving = false;
    error?: string;

    constructor(public modal: NgbActiveModal, private deviceManager: DeviceManagerService) {}

    async ngOnInit(): Promise<void> {
        try {
            this.socket.setValue(await this.deviceManager.getSshAgentSocket() ?? '');
            this.ready = true;
        } catch (error) {
            this.error = error instanceof Error ? error.message : String(error);
        }
    }

    async save(): Promise<void> {
        if (!this.ready || this.saving) return;
        this.saving = true;
        this.error = undefined;
        try {
            await this.deviceManager.setSshAgentSocket(this.socket.value.trim() || null);
            this.modal.close();
        } catch (error) {
            this.error = error instanceof Error ? error.message : String(error);
        } finally {
            this.saving = false;
        }
    }
}
