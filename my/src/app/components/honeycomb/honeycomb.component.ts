import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    templateUrl: 'honeycomb.component.html',
    styleUrls: ['honeycomb.component.scss'],
})
export class HoneycombComponent {}
