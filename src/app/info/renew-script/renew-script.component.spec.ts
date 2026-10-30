import {TestBed} from '@angular/core/testing';
import {NgbActiveModal, NgbNavModule} from '@ng-bootstrap/ng-bootstrap';
import {vi} from 'vitest';

import {RenewScriptComponent} from './renew-script.component';
import {DeviceManagerService} from '../../core/services';
import {ExternalLinkDirective} from '../../shared/directives';

describe('RenewScriptComponent SSH agent', () => {
    it('shows manual renewal instead of trying to export an agent key', async () => {
        const readPrivKey = vi.fn();
        await TestBed.configureTestingModule({
            declarations: [RenewScriptComponent],
            imports: [NgbNavModule, ExternalLinkDirective],
            providers: [
                NgbActiveModal,
                {provide: DeviceManagerService, useValue: {readPrivKey}},
                {provide: 'device', useValue: {name: 'test'}},
                {provide: 'devMode', useValue: {token: 'test-token'}},
            ],
        }).compileComponents();
        const fixture = TestBed.createComponent(RenewScriptComponent);
        fixture.detectChanges();
        await fixture.whenStable();

        expect(readPrivKey).not.toHaveBeenCalled();
        const tabs = fixture.nativeElement.querySelectorAll('[ngbNavLink]');
        tabs[1].click();
        fixture.detectChanges();
        await fixture.whenStable();
        expect(fixture.nativeElement.textContent).toContain('SSH-agent keys stay in the agent');
    });
});
